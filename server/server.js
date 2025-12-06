/* =========================================================
   WORDLE ONLINE SERVER 
   Supporta Render.com + WebSocket su stessa porta
   ========================================================= */

const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path'); // IMPORTANTE: aggiunto

// Configurazione ambiente
const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 10000;

function getWebSocketUrl() {
  if (NODE_ENV === 'production') {
    return process.env.WEBSOCKET_URL || `wss://${process.env.RENDER_EXTERNAL_HOSTNAME || 'localhost'}`;
  }
  return 'ws://localhost:10000';
}

console.log(`🔌 Porta: ${PORT}, Ambiente: ${NODE_ENV}`);

const app = express();
app.use(cors());
app.use(express.json());

// =========================================================
// 1. CONFIGURAZIONE FILE STATICI CON PERCORSI CORRETTI
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

// Middleware per servire file statici
app.use(express.static(publicPath, {
  setHeaders: (res, filePath) => {
    // Imposta MIME type corretti
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html');
    }
  }
}));

// Route specifiche per i file JavaScript
app.get('*.js', (req, res) => {
  const filePath = path.join(publicPath, req.path);
  res.sendFile(filePath, {
    headers: { 'Content-Type': 'application/javascript' }
  });
});

// Route specifiche per i file CSS
app.get('*.css', (req, res) => {
  const filePath = path.join(publicPath, req.path);
  res.sendFile(filePath, {
    headers: { 'Content-Type': 'text/css' }
  });
});

// =========================================================
// 2. ROUTE API E ENDPOINTS
// =========================================================

// Health check endpoint (per auto-ping e monitoraggio)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Wordle Online ITA',
    environment: NODE_ENV,
    port: PORT
  });
});

// API status (statistiche reali)
app.get('/api/stats', (req, res) => {
  res.json({
    playersOnline: 0,
    activeRooms: 0,
    timestamp: Date.now(),
    environment: NODE_ENV
  });
});

// Test WebSocket endpoint
app.get('/ws-test', (req, res) => {
  res.json({
    websocketStatus: 'ready',
    environment: NODE_ENV,
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Route catch-all per SPA (Single Page Application)
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// =========================================================
// 3. INIZIALIZZAZIONE MANAGER
// =========================================================

// Nota: Carichiamo i manager DOPO aver definito le route
let roomManager, gameManager;
try {
  const RoomManager = require('./roomManager');
  const GameManager = require('./gameManager');
  roomManager = new RoomManager();
  gameManager = new GameManager();
  console.log('✅ Manager inizializzati');
} catch (error) {
  console.log('⚠️  Manager non disponibili, usando modalità semplice');
  // Per ora usiamo una modalità semplice
  roomManager = { getOnlineCount: () => 0, rooms: new Map() };
  gameManager = {};
}

const players = new Map();

// =========================================================
// 4. LOGICA WEBSOCKET (VERSIONE SEMPLIFICATA INIZIALE)
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
    room: roomCode
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
    room: roomCode
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
  
  // Invece dell'echo, invia a tutti nella stanza
  broadcastToRoom(player.room, {
    type: 'chat-message',
    playerId: ws.playerId,
    playerName: player.name || 'Giocatore',
    message: message.substring(0, 200), // Limita lunghezza
    timestamp: Date.now()
  });
  
  console.log(`💬 Chat da ${player.name}: ${message.substring(0, 50)}...`);
}

function broadcastToRoom(roomCode, message) {
// Cerca tutti i giocatori nella stanza
Array.from(wss.clients).forEach(client => {
  if (client.readyState === WebSocket.OPEN) {
    const player = players.get(client.playerId);
    if (player && player.room === roomCode) {
      try {
        client.send(JSON.stringify(message));
      } catch (error) {
        console.error(`❌ Errore invio chat:`, error.message);
      }
    }
  }
});
}

function handleDisconnection(ws) {
  const player = players.get(ws.playerId);
  if (player) {
    console.log(`Disconnessione: ${player.name || ws.playerId}`);
    players.delete(ws.playerId);
  }
}

// =========================================================
// 5. AVVIO SERVER
// =========================================================

console.log(`🚀 Avvio server Wordle ITA Online`);
console.log(`🌍 Ambiente: ${NODE_ENV}`);
console.log(`🔌 Porta: ${PORT}`);

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server HTTP avviato su porta ${PORT}`);
  console.log(`📂 File statici serviti da: ${publicPath}`);
});

// =========================================================
// 6. WEBSOCKET SERVER
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
  
  // Log dettagliato
  console.log(`👤 Giocatore ${playerId} connesso`);
  console.log(`📊 Client totali connessi: ${wss.clients.size}`);
  
  // Invio immediato del messaggio di benvenuto
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
    console.error(`⚠️  WebSocket error ${playerId}:`, error.message);
  });
  
  // Test echo dopo 1 secondo
  setTimeout(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'ping',
        timestamp: Date.now(),
        message: 'WebSocket funzionante correttamente!'
      }));
    }
  }, 1000);
});

// =========================================================
// 7. AUTO-PING PER RENDER (solo produzione)
// =========================================================

if (NODE_ENV === 'production') {
  console.log('🔄 Configurazione auto-ping per Render...');
  
  // Auto-ping semplice integrato
  const pingInterval = setInterval(() => {
    const now = new Date().toISOString();
    console.log(`🔄 Auto-ping ${now} - Client attivi: ${wss.clients.size}`);
  }, 300000); // Ogni 5 minuti
  
  // Cleanup all'uscita
  process.on('SIGTERM', () => {
    clearInterval(pingInterval);
    console.log('🔄 Auto-ping disattivato');
  });
}

// =========================================================
// 8. GESTIONE SHUTDOWN
// =========================================================

process.on('SIGTERM', () => {
  console.log('🔻 SIGTERM ricevuto, shutdown pulito...');
  if (server) {
    server.close(() => {
      console.log('✅ Server HTTP chiuso');
      process.exit(0);
    });
  }
});

process.on('SIGINT', () => {
  console.log('🔻 SIGINT ricevuto, shutdown...');
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

// =========================================================
// 9. INFORMAZIONI FINALI
// =========================================================

console.log('✨ Server Wordle Online ITA completamente inizializzato!');
console.log('======================================================');
console.log(`🌐 URL HTTP: http://localhost:${PORT}`);
console.log(`🔌 URL WebSocket: ws://localhost:${PORT}`);
console.log(`🏥 Health check: http://localhost:${PORT}/health`);
console.log(`🔧 WebSocket test: http://localhost:${PORT}/ws-test`);
console.log('======================================================');