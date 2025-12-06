/* =========================================================
   WORDLE ONLINE SERVER - VERSIONE PRODUZIONE
   Supporta Render.com + WebSocket su stessa porta
   ========================================================= */

require('dotenv').config();
const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const RoomManager = require('./roomManager');
const GameManager = require('./gameManager');
const AutoPinger = require('./autoPinger'); // Auto-ping per Render

// Configurazione ambiente
const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || 8080;

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('../public'));

// Health check endpoint (per auto-ping e monitoraggio)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Wordle Online ITA',
    environment: NODE_ENV
  });
});

// API status (statistiche reali)
app.get('/api/stats', (req, res) => {
  const stats = {
    playersOnline: roomManager ? roomManager.getOnlineCount() : 0,
    activeRooms: roomManager ? roomManager.rooms.size : 0,
    timestamp: Date.now(),
    environment: NODE_ENV
  };
  res.json(stats);
});

// Serve il frontend
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: '../public' });
});

// Gestione file statici
app.use('/js', express.static('../public/js'));
app.use('/css', express.static('../public/css'));

// Inizializza manager
const roomManager = new RoomManager();
const gameManager = new GameManager();
const players = new Map();

// Variabili per WebSocket server
let wss;
let server;

// =========================================================
// CONFIGURAZIONE WEB SOCKET BASATA SU AMBIENTE
// =========================================================

function initializeWebSocketServer(serverInstance) {
  wss = new WebSocket.Server({ server: serverInstance });
  
  console.log(`WebSocket server inizializzato ${NODE_ENV === 'production' ? 'sulla stessa porta HTTP' : 'su porta ' + WS_PORT}`);
  
  wss.on('connection', (ws) => {
    console.log('Nuova connessione WebSocket');
    
    ws.playerId = uuidv4();
    players.set(ws.playerId, { socket: ws, room: null });
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        handleMessage(ws, data);
      } catch (error) {
        console.error('Errore parsing messaggio:', error);
      }
    });
    
    ws.on('close', () => {
      console.log(`Disconnessione: ${ws.playerId}`);
      handleDisconnection(ws);
      players.delete(ws.playerId);
    });
    
    ws.on('error', (error) => {
      console.error(`WebSocket error per ${ws.playerId}:`, error);
    });
    
    // Invia ID giocatore
    ws.send(JSON.stringify({
      type: 'welcome',
      playerId: ws.playerId
    }));
  });
}

// =========================================================
// HANDLER MESSAGGI (come prima, ma con wss globale)
// =========================================================

function handleMessage(ws, data) {
  const { type, payload } = data;
  
  switch(type) {
    case 'create-room':
      handleCreateRoom(ws, payload);
      break;
      
    case 'join-room':
      handleJoinRoom(ws, payload);
      break;
      
    case 'leave-room':
      handleLeaveRoom(ws);
      break;
      
    case 'start-game':
      handleStartGame(ws);
      break;
      
    case 'player-ready':
      handlePlayerReady(ws, payload);
      break;
      
    case 'make-guess':
      handleMakeGuess(ws, payload);
      break;
      
    case 'chat-message':
      handleChatMessage(ws, payload);
      break;
      
    case 'end-turn':
      handleEndTurn(ws);
      break;
      
    default:
      console.log(`Tipo sconosciuto: ${type}`);
  }
}

function handleCreateRoom(ws, payload) {
  const { playerName, settings } = payload;
  const roomCode = roomManager.createRoom(ws.playerId, playerName, settings);
  
  players.set(ws.playerId, {
    ...players.get(ws.playerId),
    name: playerName,
    room: roomCode
  });
  
  ws.send(JSON.stringify({
    type: 'room-created',
    roomCode,
    isHost: true
  }));
  
  console.log(`Stanza creata: ${roomCode} da ${playerName}`);
}

function handleJoinRoom(ws, payload) {
  const { roomCode, playerName } = payload;
  const room = roomManager.getRoom(roomCode);
  
  if (!room) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Stanza non trovata'
    }));
    return;
  }
  
  if (room.players.length >= room.settings.maxPlayers) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Stanza piena'
    }));
    return;
  }
  
  const success = roomManager.addPlayer(roomCode, {
    id: ws.playerId,
    name: playerName,
    socket: ws,
    isReady: false,
    score: 0
  });
  
  if (success) {
    players.set(ws.playerId, {
      ...players.get(ws.playerId),
      name: playerName,
      room: roomCode
    });
    
    broadcastToRoom(roomCode, {
      type: 'player-joined',
      player: { id: ws.playerId, name: playerName }
    });
    
    ws.send(JSON.stringify({
      type: 'room-joined',
      roomCode,
      roomState: room,
      isHost: false
    }));
    
    console.log(`${playerName} si è unito a ${roomCode}`);
  }
}

function handleLeaveRoom(ws) {
  const player = players.get(ws.playerId);
  if (!player || !player.room) return;
  
  const roomCode = player.room;
  roomManager.removePlayer(roomCode, ws.playerId);
  
  broadcastToRoom(roomCode, {
    type: 'player-left',
    playerId: ws.playerId
  });
  
  const room = roomManager.getRoom(roomCode);
  if (room && room.players.length === 0) {
    roomManager.removeRoom(roomCode);
    console.log(`Stanza ${roomCode} eliminata (vuota)`);
  }
  
  players.set(ws.playerId, { ...player, room: null });
  
  ws.send(JSON.stringify({
    type: 'room-left'
  }));
}

function handleStartGame(ws) {
  const player = players.get(ws.playerId);
  if (!player || !player.room) return;
  
  const roomCode = player.room;
  const room = roomManager.getRoom(roomCode);
  
  if (room.hostId !== ws.playerId) return;
  
  const allReady = room.players.every(p => p.isReady);
  if (!allReady && room.players.length > 1) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Attendi che tutti siano pronti'
    }));
    return;
  }
  
  gameManager.startGame(roomCode, room);
  
  broadcastToRoom(roomCode, {
    type: 'game-started',
    gameState: gameManager.getGameState(roomCode)
  });
}

function handlePlayerReady(ws, payload) {
  const { isReady } = payload;
  const player = players.get(ws.playerId);
  if (!player || !player.room) return;
  
  const roomCode = player.room;
  roomManager.setPlayerReady(roomCode, ws.playerId, isReady);
  
  broadcastToRoom(roomCode, {
    type: 'player-ready-updated',
    playerId: ws.playerId,
    isReady
  });
}

function handleMakeGuess(ws, payload) {
  const { word } = payload;
  const player = players.get(ws.playerId);
  if (!player || !player.room) return;
  
  const roomCode = player.room;
  const result = gameManager.processGuess(roomCode, ws.playerId, word);
  
  if (result.valid) {
    ws.send(JSON.stringify({
      type: 'guess-result',
      ...result
    }));
    
    if (result.gameOver || result.guesses >= 6) {
      gameManager.nextTurn(roomCode);
      broadcastGameState(roomCode);
    }
  } else {
    ws.send(JSON.stringify({
      type: 'error',
      message: result.message
    }));
  }
}

function handleChatMessage(ws, payload) {
  const { message } = payload;
  const player = players.get(ws.playerId);
  if (!player || !player.room) return;
  
  broadcastToRoom(player.room, {
    type: 'chat-message',
    playerId: ws.playerId,
    playerName: player.name,
    message,
    timestamp: Date.now()
  });
}

function handleEndTurn(ws) {
  const player = players.get(ws.playerId);
  if (!player || !player.room) return;
  
  const roomCode = player.room;
  gameManager.nextTurn(roomCode);
  broadcastGameState(roomCode);
}

function handleDisconnection(ws) {
  handleLeaveRoom(ws);
}

function broadcastToRoom(roomCode, message) {
  const room = roomManager.getRoom(roomCode);
  if (!room || !wss) return;
  
  room.players.forEach(player => {
    if (player.socket && player.socket.readyState === WebSocket.OPEN) {
      player.socket.send(JSON.stringify(message));
    }
  });
}

function broadcastGameState(roomCode) {
  const gameState = gameManager.getGameState(roomCode);
  broadcastToRoom(roomCode, {
    type: 'game-update',
    gameState
  });
}

// =========================================================
// AVVIO SERVER - PARTE CRITICA
// =========================================================

console.log(`Ambiente: ${NODE_ENV}`);

if (NODE_ENV === 'production') {
  // =========================================================
  // PRODUZIONE (Render.com) - WebSocket e HTTP sulla STESSA porta
  // =========================================================
  console.log(`Avvio in modalità produzione su porta ${PORT}`);
  
  server = app.listen(PORT, () => {
    console.log(`✅ Server HTTP in ascolto su porta ${PORT}`);
    console.log(`📡 WebSocket sarà disponibile sulla stessa porta`);
  });
  
  // Inizializza WebSocket sul server HTTP esistente
  initializeWebSocketServer(server);
  
} else {
  // =========================================================
  // SVILUPPO LOCALE - WebSocket e HTTP su porte DIVERSE
  // =========================================================
  console.log(`Avvio in modalità sviluppo`);
  
  // Server HTTP
  server = app.listen(PORT, () => {
    console.log(`✅ Server HTTP: http://localhost:${PORT}`);
  });
  
  // Server WebSocket separato
  wss = new WebSocket.Server({ port: WS_PORT });
  console.log(`✅ WebSocket Server: ws://localhost:${WS_PORT}`);
  
  wss.on('connection', (ws) => {
    console.log('Nuova connessione WebSocket (sviluppo)');
    
    ws.playerId = uuidv4();
    players.set(ws.playerId, { socket: ws, room: null });
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        handleMessage(ws, data);
      } catch (error) {
        console.error('Errore parsing messaggio:', error);
      }
    });
    
    ws.on('close', () => {
      console.log(`Disconnessione: ${ws.playerId}`);
      handleDisconnection(ws);
      players.delete(ws.playerId);
    });
    
    ws.send(JSON.stringify({
      type: 'welcome',
      playerId: ws.playerId
    }));
  });
}

// =========================================================
// AUTO-PING PER RENDER (previene sleep)
// =========================================================

if (NODE_ENV === 'production') {
  const autoPinger = new AutoPinger();
  autoPinger.start();
  
  console.log('🔄 Auto-ping attivato per mantenere server attivo');
}

// =========================================================
// GESTIONE SHUTDOWN
// =========================================================

process.on('SIGTERM', () => {
  console.log('SIGTERM ricevuto, shutdown pulito...');
  if (server) server.close();
  if (wss) wss.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT ricevuto, shutdown...');
  if (server) server.close();
  if (wss) wss.close();
  process.exit(0);
});

console.log('🚀 Server Wordle Online ITA avviato!');