const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const RoomManager = require('./roomManager');
const GameManager = require('./gameManager');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('../public'));

// Servi il frontend
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: '../public' });
});

// API REST per statistiche
app.get('/api/stats', (req, res) => {
  const stats = {
    playersOnline: roomManager.getOnlineCount(),
    activeRooms: roomManager.rooms.size,
    timestamp: Date.now()
  };
  res.json(stats);
});

// Inizializza WebSocket server
const wss = new WebSocket.Server({ port: 8080 });
console.log(`WebSocket server running on ws://localhost:8080`);

const roomManager = new RoomManager();
const gameManager = new GameManager();

// Mappa socket → player
const players = new Map();

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
  
  // Invia ID giocatore
  ws.send(JSON.stringify({
    type: 'welcome',
    playerId: ws.playerId
  }));
});

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
  
  // Aggiorna giocatore
  players.set(ws.playerId, {
    ...players.get(ws.playerId),
    name: playerName,
    room: roomCode
  });
  
  // Notifica giocatore
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
  
  // Aggiungi giocatore alla stanza
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
    
    // Notifica tutti i giocatori nella stanza
    broadcastToRoom(roomCode, {
      type: 'player-joined',
      player: { id: ws.playerId, name: playerName }
    });
    
    // Invia stato stanza al nuovo giocatore
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
  
  // Notifica altri giocatori
  broadcastToRoom(roomCode, {
    type: 'player-left',
    playerId: ws.playerId
  });
  
  // Se stanza vuota, eliminala
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
  
  // Solo l'host può avviare il gioco
  if (room.hostId !== ws.playerId) return;
  
  // Tutti devono essere ready
  const allReady = room.players.every(p => p.isReady);
  if (!allReady && room.players.length > 1) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Attendi che tutti siano pronti'
    }));
    return;
  }
  
  // Inizia il gioco
  gameManager.startGame(roomCode, room);
  
  // Notifica tutti
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
    // Notifica il giocatore
    ws.send(JSON.stringify({
      type: 'guess-result',
      ...result
    }));
    
    // Se ha indovinato o finito i tentativi, passa il turno
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
  if (!room) return;
  
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

// Avvia server HTTP
app.listen(PORT, () => {
  console.log(`Server HTTP in ascolto su http://localhost:${PORT}`);
});