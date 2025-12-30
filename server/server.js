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
app.use(express.static(publicPath));

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Wordle Online ITA',
    environment: NODE_ENV,
    port: PORT,
    uptime: process.uptime()
  });
});

app.get('/api/stats', (req, res) => {
  res.json({
    playersOnline: connections.size,
    activeRooms: roomManager.rooms.size,
    timestamp: Date.now(),
    environment: NODE_ENV
  });
});

app.get('/minigames', (req, res) => {
  res.sendFile(path.join(publicPath, 'minigames.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

const RoomManager = require('./roomManager');
const GameManager = require('./gameManager');
const roomManager = new RoomManager();
const gameManager = new GameManager();

const connections = new Map();

function broadcastToRoom(roomCode, message, excludeId = null) {
  const room = roomManager.getRoom(roomCode);
  if (!room) return;
  
  room.players.forEach(player => {
    if (player.id === excludeId) return;
    const conn = connections.get(player.id);
    if (conn && conn.ws.readyState === WebSocket.OPEN) {
      try {
        conn.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error(`Errore invio a ${player.id}:`, error.message);
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
  
  const roomCode = roomManager.createRoom(ws.playerId, playerName || 'Giocatore', {
    maxPlayers: 4,
    rounds: 3,
    timePerTurn: 120
  });
  
  const conn = connections.get(ws.playerId);
  if (conn) conn.room = roomCode;
  
  const room = roomManager.getRoom(roomCode);
  
  ws.send(JSON.stringify({
    type: 'room-created',
    roomCode: roomCode,  
    isHost: true,
    message: `Stanza ${roomCode} creata!`,
    players: room.players
  }));
}

function handleJoinRoom(ws, payload) {
  const { roomCode, playerName } = payload || {};
  
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
  
  const player = {
    id: ws.playerId,
    name: playerName || 'Giocatore',
    isReady: false
  };
  
  const success = roomManager.addPlayer(roomCode, player);
  if (!success) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Impossibile unirsi alla stanza'
    }));
    return;
  }
  
  const conn = connections.get(ws.playerId);
  if (conn) conn.room = roomCode;
  
  ws.send(JSON.stringify({
    type: 'room-joined',
    roomCode,
    isHost: false,
    message: `Unito a stanza ${roomCode}`,
    players: room.players
  }));
  
  broadcastToRoom(roomCode, {
    type: 'player-joined',
    player: player
  }, ws.playerId);
}

function handlePlayerReady(ws, payload) {
  const { isReady } = payload || {};
  const conn = connections.get(ws.playerId);
  if (!conn || !conn.room) return;
  
  roomManager.setPlayerReady(conn.room, ws.playerId, isReady);
  
  const room = roomManager.getRoom(conn.room);
  broadcastToRoom(conn.room, {
    type: 'player-ready-updated',
    playerId: ws.playerId,
    playerName: room.players.find(p => p.id === ws.playerId)?.name || 'Giocatore',
    isReady: isReady,
    players: room.players
  });
}

function handleStartGame(ws, payload) {
  const conn = connections.get(ws.playerId);
  if (!conn || !conn.room) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Non sei in una stanza'
    }));
    return;
  }
  
  const room = roomManager.getRoom(conn.room);
  if (!room) return;
  
  const player = room.players.find(p => p.id === ws.playerId);
  if (!player || !player.isHost) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Solo l\'host può avviare la partita'
    }));
    return;
  }
  
  const allReady = room.players.every(p => p.isReady);
  if (!allReady) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Tutti i giocatori devono essere pronti'
    }));
    return;
  }
  
  const gameState = gameManager.startGame(conn.room, room);
  room.gameState = 'playing';
  
  broadcastToRoom(conn.room, {
    type: 'game-started',
    gameState: gameState,
    message: 'Partita iniziata!'
  });
}

function handleMakeGuess(ws, payload) {
  const { word } = payload || {};
  const conn = connections.get(ws.playerId);
  if (!conn || !conn.room) {
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
  const result = gameManager.processGuess(conn.room, ws.playerId, guess);
  
  if (!result.valid) {
    ws.send(JSON.stringify({
      type: 'error',
      message: result.message
    }));
    return;
  }
  
  const game = gameManager.getGameState(conn.room);
  if (!game) return;
  
  broadcastToRoom(conn.room, {
    type: 'guess-result',
    playerId: ws.playerId,
    playerName: game.players.find(p => p.id === ws.playerId)?.name || 'Giocatore',
    word: guess.toUpperCase(),
    result: result.result,
    guessed: result.guessed,
    gameState: game
  });
  
  if (result.guessed) {
    const player = game.players.find(p => p.id === ws.playerId);
    if (player) {
      broadcastToRoom(conn.room, {
        type: 'player-won-round',
        playerId: ws.playerId,
        playerName: player.name,
        score: player.score,
        message: `${player.name} ha indovinato!`
      });
    }
  }
  
  gameManager.nextTurn(conn.room);
  const updatedGame = gameManager.getGameState(conn.room);
  
  if (updatedGame) {
    const currentPlayer = updatedGame.players[updatedGame.currentPlayerIndex];
    broadcastToRoom(conn.room, {
      type: 'turn-changed',
      currentPlayerId: currentPlayer.id,
      currentPlayerName: currentPlayer.name,
      gameState: updatedGame
    });
  }
  
  if (result.gameOver) {
    setTimeout(() => {
      const currentGame = gameManager.getGameState(conn.room);
      if (currentGame && currentGame.currentRound < currentGame.maxRounds) {
        gameManager.endRound(conn.room);
        const newGame = gameManager.getGameState(conn.room);
        
        broadcastToRoom(conn.room, {
          type: 'next-round-started',
          round: newGame.currentRound,
          maxRounds: newGame.maxRounds,
          message: `Round ${newGame.currentRound} iniziato!`,
          gameState: newGame
        });
      } else {
        gameManager.endGame(conn.room);
        const finalGame = gameManager.getGameState(conn.room);
        
        broadcastToRoom(conn.room, {
          type: 'game-ended',
          winner: finalGame.winner?.name,
          scores: finalGame.players.map(p => ({ name: p.name, score: p.score })),
          message: finalGame.winner ? 
            `${finalGame.winner.name} vince la partita!` : 
            'Partita terminata!'
        });
        
        const room = roomManager.getRoom(conn.room);
        if (room) {
          room.gameState = 'waiting';
        }
      }
    }, 2000);
  }
}

function handleSkipTurn(ws, payload) {
  const conn = connections.get(ws.playerId);
  if (!conn || !conn.room) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Non sei in una partita'
    }));
    return;
  }
  
  const game = gameManager.getGameState(conn.room);
  if (!game) return;
  
  const currentPlayer = game.players[game.currentPlayerIndex];
  if (currentPlayer.id !== ws.playerId) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Non è il tuo turno'
    }));
    return;
  }
  
  gameManager.nextTurn(conn.room);
  const updatedGame = gameManager.getGameState(conn.room);
  
  if (updatedGame) {
    const newCurrentPlayer = updatedGame.players[updatedGame.currentPlayerIndex];
    broadcastToRoom(conn.room, {
      type: 'turn-changed',
      currentPlayerId: newCurrentPlayer.id,
      currentPlayerName: newCurrentPlayer.name,
      gameState: updatedGame,
      message: `${currentPlayer.name} ha saltato il turno`
    });
  }
}

function handleChatMessage(ws, payload) {
  const { message } = payload || {};
  const conn = connections.get(ws.playerId);
  if (!conn || !conn.room || !message) return;
  
  const room = roomManager.getRoom(conn.room);
  if (!room) return;
  
  const player = room.players.find(p => p.id === ws.playerId);
  if (!player) return;
  
  broadcastToRoom(conn.room, {
    type: 'chat-message',
    playerId: ws.playerId,
    playerName: player.name || 'Giocatore',
    message: message.substring(0, 200),
    timestamp: Date.now()
  });
}

function handleLeaveRoom(ws, payload) {
  const conn = connections.get(ws.playerId);
  if (!conn) return;
  
  ws.send(JSON.stringify({
    type: 'room-left',
    message: 'Hai lasciato la stanza'
  }));
  
  if (conn.room) {
    const room = roomManager.getRoom(conn.room);
    if (room) {
      const player = room.players.find(p => p.id === ws.playerId);
      if (player) {
        broadcastToRoom(conn.room, {
          type: 'player-left',
          playerId: ws.playerId,
          playerName: player.name,
          message: `${player.name} ha lasciato la stanza`
        });
      }
      
      roomManager.removePlayer(conn.room, ws.playerId);
      if (room.players.length === 0) {
        roomManager.removeRoom(conn.room);
      }
    }
    conn.room = null;
  }
}

function handleDisconnection(ws) {
  const playerId = ws.playerId;
  const conn = connections.get(playerId);
  
  if (conn && conn.room) {
    const room = roomManager.getRoom(conn.room);
    if (room) {
      const player = room.players.find(p => p.id === playerId);
      if (player) {
        broadcastToRoom(conn.room, {
          type: 'player-left',
          playerId: playerId,
          playerName: player.name,
          message: `${player.name} si è disconnesso`
        });
        
        roomManager.removePlayer(conn.room, playerId);
        
        if (room.players.length === 0) {
          roomManager.removeRoom(conn.room);
        }
      }
    }
  }
  
  connections.delete(playerId);
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
  
  connections.set(playerId, { ws, playerId, room: null });
  
  ws.send(JSON.stringify({
    type: 'welcome',
    playerId: playerId,
    message: 'Benvenuto su Wordle ITA Online!',
    timestamp: Date.now()
  }));
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      handleMessage(ws, data);
    } catch (error) {
      console.error('Errore parsing messaggio:', error);
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
    console.error(`WebSocket error ${playerId}:`, error.message);
  });
});

if (NODE_ENV === 'production') {
  try {
    const AutoPinger = require('./autoPinger');
    const pinger = new AutoPinger();
    pinger.start();
  } catch (error) {
    const pingInterval = setInterval(() => {
      const http = require('http');
      const options = {
        hostname: 'localhost',
        port: PORT,
        path: '/health',
        method: 'GET',
        timeout: 5000
      };
      
      const req = http.request(options, (res) => {
        console.log(`✅ Self-ping OK: ${res.statusCode}`);
      });
      
      req.on('error', () => {});
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

const AutoPinger = require('./autoPinger'); 
const pinger = new AutoPinger();
pinger.start();