/* =========================================================
   WORDLE ONLINE SERVER
   ========================================================= */

const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Configurazione ambiente
const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 10000;

console.log(`🔌 Porta: ${PORT}, Ambiente: ${NODE_ENV}`);

const app = express();
app.use(cors());
app.use(express.json());

// =========================================================
// 1. CONFIGURAZIONE FILE STATICI
// =========================================================

const publicPath = path.join(__dirname, 'public');
console.log('📂 Directory corrente:', __dirname);
console.log('📂 Percorso pubblico:', publicPath);
const fs = require('fs');
if (fs.existsSync(publicPath)) {
  console.log('✅ Directory pubblica trovata');
  const files = fs.readdirSync(publicPath);
  console.log(`📄 File trovati (${files.length}):`, files.slice(0, 5));
} else {
  console.error('❌ Directory pubblica non trovata:', publicPath);
}

app.use(express.static(publicPath, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html');
    }
  }
}));

app.get('*.js', (req, res) => {
  const filePath = path.join(publicPath, req.path);
  res.sendFile(filePath, {
    headers: { 'Content-Type': 'application/javascript' }
  });
});

app.get('*.css', (req, res) => {
  const filePath = path.join(publicPath, req.path);
  res.sendFile(filePath, {
    headers: { 'Content-Type': 'text/css' }
  });
});

// =========================================================
// 2. ROUTE API E ENDPOINTS
// =========================================================

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Wordle Online ITA',
    environment: NODE_ENV,
    port: PORT
  });
});

app.get('/api/stats', (req, res) => {
  res.json({
    playersOnline: wss ? wss.clients.size : 0,
    activeRooms: roomManager ? roomManager.rooms.size : 0,
    timestamp: Date.now(),
    environment: NODE_ENV
  });
});

app.get('/ws-test', (req, res) => {
  res.json({
    websocketStatus: 'ready',
    environment: NODE_ENV,
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// =========================================================
// 3. INIZIALIZZAZIONE MANAGER
// =========================================================

let roomManager, gameManager;
try {
  const RoomManager = require('./roomManager');
  const GameManager = require('./gameManager');
  roomManager = new RoomManager();
  gameManager = new GameManager();
  console.log('✅ Manager inizializzati');
} catch (error) {
  console.log('⚠️ Manager non disponibili, usando modalità semplice');
  roomManager = { getOnlineCount: () => 0, rooms: new Map() };
  gameManager = {};
}

const players = new Map();
const activeGames = new Map(); // roomCode -> { word, attempts: Map(playerId -> attempts) }

// =========================================================
// 4. FUNZIONI HELPER
// =========================================================

// Carica parole italiane
let WORDS_IT = [];
try {
  const wordsModule = require('./words_it');
  WORDS_IT = wordsModule.WORDS_IT || wordsModule;
  console.log(`✅ Caricate ${WORDS_IT.length} parole italiane`);
} catch (error) {
  console.error('❌ Errore caricamento parole:', error.message);
  WORDS_IT = ['ciao', 'casa', 'mondo', 'tempo', 'punto']; // Fallback minimo
}

function getRandomWord() {
  return WORDS_IT[Math.floor(Math.random() * WORDS_IT.length)].toLowerCase();
}

function checkWord(guess, target) {
  const result = Array(5).fill('absent');
  const targetLetters = target.split('');
  const guessLetters = guess.split('');
  
  // Prima passata: lettere corrette
  for (let i = 0; i < 5; i++) {
    if (guessLetters[i] === targetLetters[i]) {
      result[i] = 'correct';
      targetLetters[i] = null;
      guessLetters[i] = '*';
    }
  }
  
  // Seconda passata: lettere presenti
  for (let i = 0; i < 5; i++) {
    if (guessLetters[i] === '*') continue;
    
    const index = targetLetters.indexOf(guessLetters[i]);
    if (index !== -1) {
      result[i] = 'present';
      targetLetters[index] = null;
    }
  }
  
  return result;
}

function broadcastToRoom(roomCode, message, excludeId = null) {
  Array.from(wss.clients).forEach(client => {
    if (client.readyState === WebSocket.OPEN && client.playerId !== excludeId) {
      const player = players.get(client.playerId);
      if (player && player.room === roomCode) {
        try {
          client.send(JSON.stringify(message));
        } catch (error) {
          console.error(`❌ Errore invio:`, error.message);
        }
      }
    }
  });
}

// =========================================================
// 5. LOGICA WEBSOCKET
// =========================================================

function handleMessage(ws, data) {
  const { type, payload } = data;
  
  console.log(`📨 Messaggio ${type} da ${ws.playerId}`);
  
  switch(type) {
    case 'create-room':
      handleCreateRoom(ws, payload);
      break;
      
    case 'join-room':
      handleJoinRoom(ws, payload);
      break;

    case 'player-ready':
      handlePlayerReady(ws, payload);
      break;
      
    case 'start-game':
      handleStartGame(ws, payload);
      break;

    case 'make-guess':
      handleMakeGuess(ws, payload);
      break;

    case 'skip-turn':
      handleSkipTurn(ws, payload);
      break;

    case 'leave-room':
      handleLeaveRoom(ws, payload);
      break;
      
    case 'chat-message':
      handleChatMessage(ws, payload);
      break;
      
    default:
      console.log(`Tipo sconosciuto: ${type}`);
      ws.send(JSON.stringify({
        type: 'error',
        message: `Tipo messaggio non supportato: ${type}`
      }));
  }
}

function handleCreateRoom(ws, payload) {
  const { playerName } = payload || {};
  const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
  
  players.set(ws.playerId, {
    ...players.get(ws.playerId),
    name: playerName || 'Giocatore',
    room: roomCode,
    isHost: true,
    ready: false
  });
  
  ws.send(JSON.stringify({
    type: 'room-created',
    roomCode,
    isHost: true,
    message: `Stanza ${roomCode} creata!`
  }));
  
  console.log(`Stanza creata: ${roomCode} da ${playerName || 'Giocatore'}`);
}

function handleJoinRoom(ws, payload) {
  const { roomCode, playerName } = payload || {};
  
  if (!roomCode || roomCode.length !== 4) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Codice stanza non valido'
    }));
    return;
  }
  
  players.set(ws.playerId, {
    ...players.get(ws.playerId),
    name: playerName || 'Giocatore',
    room: roomCode,
    isHost: false,
    ready: false
  });
  
  ws.send(JSON.stringify({
    type: 'room-joined',
    roomCode,
    isHost: false,
    message: `Unito a stanza ${roomCode}`
  }));
  
  console.log(`${playerName || 'Giocatore'} si è unito a ${roomCode}`);
}

function handleChatMessage(ws, payload) {
  const { message } = payload || {};
  const player = players.get(ws.playerId);
  
  if (!player || !message || !player.room) return;
  
  broadcastToRoom(player.room, {
    type: 'chat-message',
    playerId: ws.playerId,
    playerName: player.name || 'Giocatore',
    message: message.substring(0, 200),
    timestamp: Date.now()
  });
  
  console.log(`💬 Chat da ${player.name}: ${message.substring(0, 50)}...`);
}

function handlePlayerReady(ws, payload) {
  const { isReady } = payload || {};
  const player = players.get(ws.playerId);
  
  if (!player || !player.room) return;
  
  player.ready = isReady;
  
  broadcastToRoom(player.room, {
    type: 'player-ready-updated',
    playerId: ws.playerId,
    playerName: player.name,
    isReady: isReady,
    timestamp: Date.now()
  });
  
  console.log(`👤 ${player.name} è ${isReady ? 'PRONTO' : 'NON PRONTO'}`);
}

function handleStartGame(ws, payload) {
  const player = players.get(ws.playerId);
  
  if (!player || !player.room) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Non sei in una stanza'
    }));
    return;
  }
  
  if (!player.isHost) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Solo l\'host può avviare la partita'
    }));
    return;
  }
  
  const roomPlayers = [];
  Array.from(wss.clients).forEach(client => {
    const p = players.get(client.playerId);
    if (p && p.room === player.room) {
      roomPlayers.push({
        id: client.playerId,
        name: p.name,
        ready: p.ready || false
      });
    }
  });
  
  if (roomPlayers.length < 1) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Almeno 1 giocatore necessario'
    }));
    return;
  }
  
  // Inizializza partita con parola segreta
  const word = getRandomWord();
  activeGames.set(player.room, {
    word: word,
    attempts: new Map()
  });
  
  console.log(`🎯 Parola segreta per stanza ${player.room}: ${word}`);
  
  const gameState = {
    roomCode: player.room,
    status: 'playing',
    currentRound: 1,
    maxRounds: 3,
    currentPlayerIndex: 0,
    players: roomPlayers.map(p => ({
      id: p.id,
      name: p.name,
      score: 0,
      guesses: [],
      currentAttempt: 0,
      hasGuessed: false
    })),
    startTime: Date.now()
  };
  
  broadcastToRoom(player.room, {
    type: 'game-started',
    gameState: gameState,
    message: 'Partita iniziata!'
  });
  
  console.log(`🎮 Partita iniziata nella stanza ${player.room} con ${roomPlayers.length} giocatori`);
}

function handleMakeGuess(ws, payload) {
  const { word } = payload || {};
  const player = players.get(ws.playerId);
  
  if (!player || !player.room) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Non sei in una partita'
    }));
    return;
  }
  
  if (!word || word.length !== 5) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'La parola deve avere 5 lettere'
    }));
    return;
  }
  
  // Recupera la parola segreta
  const game = activeGames.get(player.room);
  if (!game) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Partita non trovata'
    }));
    return;
  }
  
  const guess = word.toLowerCase();
  const target = game.word;
  
  // Calcola risultato
  const result = checkWord(guess, target);
  const guessed = guess === target;
  
  console.log(`🔍 ${player.name} prova: ${guess} vs ${target} -> ${guessed ? 'INDOVINATO!' : 'Sbagliato'}`);
  console.log(`📊 Risultato:`, result);
  
  // Invia il risultato CON l'array result
  broadcastToRoom(player.room, {
    type: 'guess-result',
    playerId: ws.playerId,
    playerName: player.name,
    word: guess.toUpperCase(),
    result: result,  // IMPORTANTE: array con 'correct', 'present', 'absent'
    guessed: guessed,
    timestamp: Date.now()
  });
  
  console.log(`📝 ${player.name} ha tentato: ${guess} (${guessed ? 'CORRETTO' : 'SBAGLIATO'})`);
}

function handleSkipTurn(ws, payload) {
  const player = players.get(ws.playerId);
  
  if (!player || !player.room) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Non sei in una partita'
    }));
    return;
  }
  
  broadcastToRoom(player.room, {
    type: 'turn-skipped',
    playerId: ws.playerId,
    playerName: player.name,
    timestamp: Date.now()
  });
  
  console.log(`⏭️ ${player.name} ha saltato il turno`);
}

function handleLeaveRoom(ws, payload) {
  const player = players.get(ws.playerId);
  
  if (!player) return;
  
  const roomCode = player.room;
  
  ws.send(JSON.stringify({
    type: 'room-left',
    message: 'Hai lasciato la stanza'
  }));
  
  if (roomCode) {
    broadcastToRoom(roomCode, {
      type: 'player-left',
      playerId: ws.playerId,
      playerName: player.name,
      message: `${player.name} ha lasciato la stanza`
    });
  }
  
  player.room = null;
  player.ready = false;
  
  console.log(`👤 ${player.name} ha lasciato la stanza ${roomCode}`);
}

function handleDisconnection(ws) {
  const player = players.get(ws.playerId);
  if (player) {
    console.log(`Disconnessione: ${player.name || ws.playerId}`);
    
    if (player.room) {
      broadcastToRoom(player.room, {
        type: 'player-left',
        playerId: ws.playerId,
        playerName: player.name,
        message: `${player.name} si è disconnesso`
      });
    }
    
    players.delete(ws.playerId);
  }
}

// =========================================================
// 6. AVVIO SERVER
// =========================================================

console.log(`🚀 Avvio server Wordle ITA Online`);

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server HTTP avviato su porta ${PORT}`);
});

// =========================================================
// 7. WEBSOCKET SERVER
// =========================================================

const wss = new WebSocket.Server({ 
  server,
  clientTracking: true,
  perMessageDeflate: false
});

console.log(`✅ WebSocket Server avviato sulla stessa porta ${PORT}`);

wss.on('connection', (ws, req) => {
  console.log('🔗 Nuova connessione WebSocket');
  
  const playerId = uuidv4();
  ws.playerId = playerId;
  
  players.set(playerId, { 
    socket: ws, 
    room: null, 
    name: null 
  });
  
  console.log(`👤 Giocatore ${playerId} connesso`);
  console.log(`📊 Client totali connessi: ${wss.clients.size}`);
  
  ws.send(JSON.stringify({
    type: 'welcome',
    playerId: playerId,
    message: 'Benvenuto su Wordle ITA Online!',
    timestamp: Date.now(),
    serverInfo: {
      environment: NODE_ENV,
      version: '1.0.0'
    }
  }));
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log(`📩 Ricevuto da ${playerId}:`, data.type);
      handleMessage(ws, data);
    } catch (error) {
      console.error('❌ Errore parsing messaggio:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Formato JSON non valido'
      }));
    }
  });
  
  ws.on('close', () => {
    console.log(`❌ Disconnessione: ${playerId}`);
    handleDisconnection(ws);
    console.log(`📊 Client rimanenti: ${wss.clients.size}`);
  });
  
  ws.on('error', (error) => {
    console.error(`⚠️ WebSocket error ${playerId}:`, error.message);
  });
});

// =========================================================
// 8. AUTO-PING E SHUTDOWN
// =========================================================

if (NODE_ENV === 'production') {
  console.log('🔄 Configurazione auto-ping per Render...');
  
  const pingInterval = setInterval(() => {
    const now = new Date().toISOString();
    console.log(`🔄 Auto-ping ${now} - Client attivi: ${wss.clients.size}`);
  }, 300000);
  
  process.on('SIGTERM', () => {
    clearInterval(pingInterval);
    console.log('🔄 Auto-ping disattivato');
  });
}

process.on('SIGTERM', () => {
  console.log('📻 SIGTERM ricevuto, shutdown pulito...');
  if (server) {
    server.close(() => {
      console.log('✅ Server HTTP chiuso');
      process.exit(0);
    });
  }
});

process.on('SIGINT', () => {
  console.log('📻 SIGINT ricevuto, shutdown...');
  if (wss) {
    wss.close();
    console.log('✅ WebSocket Server chiuso');
  }
  if (server) {
    server.close();
    console.log('✅ Server HTTP chiuso');
  }
  process.exit(0);
});

console.log('✨ Server Wordle Online ITA completamente inizializzato!');
console.log('======================================================');
console.log(`🌐 URL HTTP: http://localhost:${PORT}`);
console.log(`🔌 URL WebSocket: ws://localhost:${PORT}`);
console.log('======================================================');