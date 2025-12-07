const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 10000;

const app = express();
app.use(cors());
app.use(express.json());

const publicPath = path.join(__dirname, 'public');
const fs = require('fs');
if (fs.existsSync(publicPath)) {
  const files = fs.readdirSync(publicPath);
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

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Wordle Online ITA',
    environment: NODE_ENV,
    port: PORT,
    uptime: process.uptime(),
    clients: wss ? wss.clients.size : 0
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

app.get('/minigames', (req, res) => {
  res.sendFile(path.join(publicPath, 'minigames.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

let roomManager, gameManager;
try {
  const RoomManager = require('./roomManager');
  const GameManager = require('./gameManager');
  roomManager = new RoomManager();
  gameManager = new GameManager();
} catch (error) {
  roomManager = { getOnlineCount: () => 0, rooms: new Map() };
  gameManager = {};
}

const players = new Map();
const activeGames = new Map();

let WORDS_IT = [];
try {
  const wordsModule = require('./words_it');
  WORDS_IT = wordsModule.WORDS_IT || wordsModule;
} catch (error) {
  WORDS_IT = ['ciao', 'casa', 'mondo', 'tempo', 'punto'];
}

function getRandomWord() {
  return WORDS_IT[Math.floor(Math.random() * WORDS_IT.length)].toLowerCase();
}

function checkWord(guess, target) {
  const result = Array(5).fill('absent');
  const targetLetters = target.split('');
  const guessLetters = guess.split('');
  
  for (let i = 0; i < 5; i++) {
    if (guessLetters[i] === targetLetters[i]) {
      result[i] = 'correct';
      targetLetters[i] = null;
      guessLetters[i] = '*';
    }
  }
  
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

function handleMessage(ws, data) {
  const { type, payload } = data;
  
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
  
  const word = getRandomWord();
  
  // Inizializzazione completa del gioco
  activeGames.set(player.room, {
    word: word,
    attempts: new Map(),
    scores: new Map(),
    guessedPlayers: new Set(),
    currentRound: 1,
    maxRounds: 3,
    startTime: Date.now()
  });

  const gameState = {
    roomCode: player.room,
    status: 'playing',
    currentRound: 1,
    maxRounds: 3,
    currentPlayerIndex: 0,
    players: roomPlayers.map(p => ({
      id: p.id,
      name: p.name || 'Giocatore',
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
    message: 'Partita iniziata! Round 1'
  });
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
  
  const guess = word.toLowerCase();
  if (!WORDS_IT.includes(guess)) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Parola non valida nel dizionario italiano'
    }));
    return;
  }
  
  const game = activeGames.get(player.room);
  if (!game) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Partita non trovata'
    }));
    return;
  }
  
  const target = game.word;
  const result = checkWord(guess, target);
  const guessed = guess === target;
  
  if (!game.attempts.has(player.name)) {
    game.attempts.set(player.name, []);
  }
  game.attempts.get(player.name).push({ word: guess, result: result, guessed: guessed });
  
  broadcastToRoom(player.room, {
    type: 'guess-result',
    playerId: ws.playerId,
    playerName: player.name,
    word: guess.toUpperCase(),
    result: result,
    guessed: guessed,
    timestamp: Date.now()
  });
  
  if (guessed) {
    handlePlayerWinsRound(ws, player.room, player.name);
  }
  
  checkRoundCompletion(player.room);
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
}

function handlePlayerWinsRound(ws, roomCode, playerName) {
  const game = activeGames.get(roomCode);
  if (!game) return;
  
  // Aggiungi punti
  if (!game.scores) game.scores = new Map();
  const currentScore = game.scores.get(playerName) || 0;
  game.scores.set(playerName, currentScore + 100);
  
  // Segna che il giocatore ha indovinato
  if (!game.guessedPlayers) game.guessedPlayers = new Set();
  game.guessedPlayers.add(playerName);
  
  broadcastToRoom(roomCode, {
    type: 'player-won-round',
    playerName: playerName,
    score: currentScore + 100,
    message: `${playerName} ha indovinato la parola!`
  });
}

function checkRoundCompletion(roomCode) {
  const game = activeGames.get(roomCode);
  if (!game) return;
  
  const roomPlayers = [];
  Array.from(wss.clients).forEach(client => {
    const p = players.get(client.playerId);
    if (p && p.room === roomCode) {
      roomPlayers.push(p.name);
    }
  });
  
  let allDone = true;
  let allGuessed = true;
  
  roomPlayers.forEach(playerName => {
    const attempts = game.attempts.get(playerName) || [];
    const hasGuessed = game.guessedPlayers && game.guessedPlayers.has(playerName);
    
    if (attempts.length < 6 && !hasGuessed) {
      allDone = false;
    }
    if (!hasGuessed) {
      allGuessed = false;
    }
  });
  
  if (allDone || allGuessed) {
    setTimeout(() => {
      handleNextRound(roomCode);
    }, 3000); 
  }
}

function handleNextRound(roomCode) {
  const game = activeGames.get(roomCode);
  if (!game) return;
  
  // Incrementa il round
  game.currentRound = (game.currentRound || 1) + 1;
  game.maxRounds = game.maxRounds || 3;
  
  if (game.currentRound > game.maxRounds) {
    endGame(roomCode);
    return;
  }
  
  game.word = getRandomWord();
  game.attempts.clear();
  if (game.guessedPlayers) game.guessedPlayers.clear();
  
  broadcastToRoom(roomCode, {
    type: 'next-round-started',
    round: game.currentRound,
    maxRounds: game.maxRounds,
    message: `Round ${game.currentRound} iniziato!`,
    scores: Array.from(game.scores || []).map(([name, score]) => ({ name, score }))
  });
}

function endGame(roomCode) {
  const game = activeGames.get(roomCode);
  if (!game) return;
  
  let winner = '';
  let maxScore = 0;
  
  if (game.scores) {
    game.scores.forEach((score, playerName) => {
      if (score > maxScore) {
        maxScore = score;
        winner = playerName;
      }
    });
  }
  
  broadcastToRoom(roomCode, {
    type: 'game-ended',
    winner: winner,
    scores: Array.from(game.scores || []).map(([name, score]) => ({ name, score })),
    message: winner ? `${winner} vince la partita con ${maxScore} punti!` : 'Partita terminata!'
  });
  
  setTimeout(() => {
    activeGames.delete(roomCode);
  }, 10000);
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
}

function handleDisconnection(ws) {
  const player = players.get(ws.playerId);
  if (player) {
    
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

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server HTTP avviato su porta ${PORT}`);
});

const wss = new WebSocket.Server({ 
  server,
  clientTracking: true,
  perMessageDeflate: false
});

wss.on('connection', (ws, req) => {
  
  const playerId = uuidv4();
  ws.playerId = playerId;
  
  players.set(playerId, { 
    socket: ws, 
    room: null, 
    name: null 
  });
  
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
    handleDisconnection(ws);
  });
  
  ws.on('error', (error) => {
    console.error(`⚠️ WebSocket error ${playerId}:`, error.message);
  });
});

if (NODE_ENV === 'production') {
  
  try {
    const AutoPinger = require('./autoPinger');
    const pinger = new AutoPinger();
    pinger.start();
  } catch (error) {
    
    const pingInterval = setInterval(() => {
      const now = new Date().toISOString();
      
      const http = require('http');
      const options = {
        hostname: 'localhost',
        port: PORT,
        path: '/health',
        method: 'GET',
        timeout: 5000
      };
      
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log(`✅ Self-ping OK: ${res.statusCode}`);
        });
      });
      
      req.on('error', (err) => {
      });
      
      req.end();
    }, 49000);
    
    process.on('SIGTERM', () => {
      clearInterval(pingInterval);
    });
  }
}

process.on('SIGTERM', () => {
  if (server) {
    server.close(() => {
      process.exit(0);
    });
  }
});

process.on('SIGINT', () => {
  if (wss) {
    wss.close();
  }
  if (server) {
    server.close();
  }
  process.exit(0);
});

console.log(`🌐 URL HTTP: http://localhost:${PORT}`);