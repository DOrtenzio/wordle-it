class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.roomCodes = new Set();
  }
  
  generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code;
    
    do {
      code = '';
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.roomCodes.has(code));
    
    return code;
  }
  
  createRoom(hostId, hostName, settings = {}) {
    const roomCode = this.generateRoomCode();
    
    const room = {
      code: roomCode,
      hostId,
      players: [{
        id: hostId,
        name: hostName,
        isReady: false,
        score: 0,
        isHost: true
      }],
      gameState: 'waiting',
      settings: {
        maxPlayers: settings.maxPlayers || 4,
        hardMode: settings.hardMode || false,
        timePerTurn: settings.timePerTurn || 120,
        rounds: settings.rounds || 3
      },
      createdAt: Date.now()
    };
    
    this.rooms.set(roomCode, room);
    this.roomCodes.add(roomCode);
    
    return roomCode;
  }
  
  getRoom(roomCode) {
    return this.rooms.get(roomCode);
  }
  
  addPlayer(roomCode, player) {
    const room = this.getRoom(roomCode);
    if (!room) return false;
    
    // Controlla se il giocatore è già presente
    const existingPlayer = room.players.find(p => p.id === player.id);
    if (existingPlayer) return true;
    
    room.players.push({
      ...player,
      isHost: false
    });
    
    return true;
  }
  
  removePlayer(roomCode, playerId) {
    const room = this.getRoom(roomCode);
    if (!room) return;
    
    room.players = room.players.filter(p => p.id !== playerId);
    
    // Se l'host lascia, scegli nuovo host
    if (playerId === room.hostId && room.players.length > 0) {
      room.hostId = room.players[0].id;
      room.players[0].isHost = true;
    }
  }
  
  setPlayerReady(roomCode, playerId, isReady) {
    const room = this.getRoom(roomCode);
    if (!room) return;
    
    const player = room.players.find(p => p.id === playerId);
    if (player) {
      player.isReady = isReady;
    }
  }
  
  removeRoom(roomCode) {
    this.rooms.delete(roomCode);
    this.roomCodes.delete(roomCode);
  }
  
  getOnlineCount() {
    let total = 0;
    for (const room of this.rooms.values()) {
      total += room.players.length;
    }
    return total;
  }
}

module.exports = RoomManager;