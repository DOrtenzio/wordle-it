class WordleOnline {
  constructor() {
    this.socket = null;
    this.playerId = null;
    this.roomCode = null;
    this.playerName = '';
    this.avatar = '1';
    this.isHost = false;
    this.currentGame = null;
    this.timerInterval = null;
    this.timeLeft = 120;
    
    this.initialize();
  }
  
  initialize() {
    this.bindEvents();
    this.updateOnlineStats();
  }
  
  bindEvents() {
    // Menu principale
    document.getElementById('btn-create-room').addEventListener('click', () => this.createRoom());
    document.getElementById('btn-join-room').addEventListener('click', () => this.joinRoom());
    document.getElementById('btn-singleplayer').addEventListener('click', () => this.startSingleplayer());
    document.getElementById('btn-how-to-play').addEventListener('click', () => this.showInstructions());
    
    // Avatar selection
    document.querySelectorAll('.avatar').forEach(avatar => {
      avatar.addEventListener('click', (e) => this.selectAvatar(e.target));
    });
    
    // Lobby
    document.getElementById('btn-leave-lobby').addEventListener('click', () => this.leaveLobby());
    document.getElementById('ready-checkbox').addEventListener('change', (e) => this.toggleReady(e.target.checked));
    document.getElementById('btn-start-game').addEventListener('click', () => this.startGame());
    document.getElementById('btn-copy-code').addEventListener('click', () => this.copyRoomCode());
    
    // Chat
    document.getElementById('btn-send-chat').addEventListener('click', () => this.sendChatMessage());
    document.getElementById('chat-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendChatMessage();
    });
    
    // Gioco
    document.getElementById('btn-leave-game').addEventListener('click', () => this.leaveGame());
    document.getElementById('btn-submit-word').addEventListener('click', () => this.submitGuess());
    document.getElementById('btn-clear-word').addEventListener('click', () => this.clearWord());
    document.getElementById('btn-skip-turn').addEventListener('click', () => this.skipTurn());
    
    // Chat rapida
    document.querySelectorAll('.quick-msg').forEach(btn => {
      btn.addEventListener('click', (e) => this.sendQuickMessage(e.target.dataset.msg));
    });
    
    // Risultati
    document.getElementById('btn-next-round').addEventListener('click', () => this.nextRound());
    document.getElementById('btn-return-lobby').addEventListener('click', () => this.returnToLobby());
    
    // Modal
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => this.closeModal(btn.closest('.modal')));
    });
    
    // Gestione input tastiera fisica
    document.addEventListener('keydown', (e) => this.handlePhysicalKeyboard(e));
  }
  
  connectWebSocket() {
    const wsUrl = window.location.hostname === 'localhost' 
      ? 'ws://localhost:8080'
      : `wss://${window.location.hostname}:8080`;
    
    this.socket = new WebSocket(wsUrl);
    
    this.socket.onopen = () => {
      console.log('Connesso al server WebSocket');
      this.showToast('Connesso al server');
    };
    
    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleServerMessage(data);
      } catch (error) {
        console.error('Errore parsing messaggio:', error);
      }
    };
    
    this.socket.onclose = () => {
      console.log('Disconnesso dal server');
      this.showToast('Disconnesso dal server. Tentativo riconnessione...', 'error');
      setTimeout(() => this.connectWebSocket(), 3000);
    };
    
    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.showToast('Errore di connessione', 'error');
    };
  }
  
  handleServerMessage(data) {
    console.log('Messaggio server:', data);
    
    switch(data.type) {
      case 'welcome':
        this.playerId = data.playerId;
        break;
        
      case 'room-created':
        this.handleRoomCreated(data);
        break;
        
      case 'room-joined':
        this.handleRoomJoined(data);
        break;
        
      case 'room-left':
        this.handleRoomLeft();
        break;
        
      case 'player-joined':
        this.handlePlayerJoined(data);
        break;
        
      case 'player-left':
        this.handlePlayerLeft(data);
        break;
        
      case 'player-ready-updated':
        this.handlePlayerReadyUpdated(data);
        break;
        
      case 'game-started':
        this.handleGameStarted(data);
        break;
        
      case 'game-update':
        this.handleGameUpdate(data);
        break;
        
      case 'guess-result':
        this.handleGuessResult(data);
        break;
        
      case 'chat-message':
        this.handleChatMessage(data);
        break;
        
      case 'error':
        this.showToast(data.message, 'error');
        break;
    }
  }
  
  createRoom() {
    this.playerName = document.getElementById('player-name').value.trim();
    
    if (!this.playerName) {
      this.showToast('Inserisci un nome', 'error');
      return;
    }
    
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.connectWebSocket();
      setTimeout(() => this.createRoom(), 500);
      return;
    }
    
    const settings = {
      maxPlayers: 4,
      hardMode: false,
      timePerTurn: 120,
      rounds: 3
    };
    
    this.socket.send(JSON.stringify({
      type: 'create-room',
      payload: {
        playerName: this.playerName,
        settings
      }
    }));
  }
  
  joinRoom() {
    this.playerName = document.getElementById('player-name').value.trim();
    const roomCode = document.getElementById('room-code-input').value.trim().toUpperCase();
    
    if (!this.playerName) {
      this.showToast('Inserisci un nome', 'error');
      return;
    }
    
    if (!roomCode || roomCode.length !== 4) {
      this.showToast('Codice stanza non valido (4 lettere)', 'error');
      return;
    }
    
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.connectWebSocket();
      setTimeout(() => this.joinRoom(), 500);
      return;
    }
    
    this.socket.send(JSON.stringify({
      type: 'join-room',
      payload: {
        roomCode,
        playerName: this.playerName
      }
    }));
  }
  
  handleRoomCreated(data) {
    this.roomCode = data.roomCode;
    this.isHost = data.isHost;
    
    this.showScreen('lobby-screen');
    this.updateLobbyUI();
    this.showToast(`Stanza ${this.roomCode} creata!`);
  }
  
  handleRoomJoined(data) {
    this.roomCode = data.roomCode;
    this.isHost = data.isHost;
    
    this.showScreen('lobby-screen');
    this.updateLobbyPlayers(data.roomState.players);
    this.showToast(`Unito a stanza ${this.roomCode}`);
  }
  
  handleRoomLeft() {
    this.roomCode = null;
    this.isHost = false;
    this.showScreen('start-screen');
    this.showToast('Hai lasciato la stanza');
  }
  
  handlePlayerJoined(data) {
    this.addPlayerToLobby(data.player);
    this.updatePlayerCount();
    this.showToast(`${data.player.name} si è unito`, 'info');
  }
  
  handlePlayerLeft(data) {
    this.removePlayerFromLobby(data.playerId);
    this.updatePlayerCount();
  }
  
  handlePlayerReadyUpdated(data) {
    this.updatePlayerReady(data.playerId, data.isReady);
  }
  
  handleGameStarted(data) {
    this.currentGame = data.gameState;
    this.showScreen('game-screen');
    this.startTurnTimer();
    this.updateGameUI();
    this.initializeGameBoard();
    this.showToast('Partita iniziata!', 'success');
  }
  
  handleGameUpdate(data) {
    this.currentGame = data.gameState;
    this.updateGameUI();
    
    if (this.currentGame.gameStatus === 'finished') {
      this.showResults();
    }
  }
  
  handleGuessResult(data) {
    this.updateBoardWithGuess(data);
    
    if (data.guessed) {
      this.showToast('Hai indovinato!', 'success');
      document.getElementById('btn-submit-word').disabled = true;
    }
  }
  
  handleChatMessage(data) {
    this.addChatMessage(data.playerName, data.message, data.timestamp);
  }
  
  // UI Methods
  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
  }
  
  updateLobbyUI() {
    document.getElementById('lobby-room-code').textContent = this.roomCode;
    document.getElementById('share-room-code').textContent = this.roomCode;
    
    // Aggiungi host alla lista
    this.clearPlayersList();
    this.addPlayerToLobby({
      id: this.playerId,
      name: this.playerName,
      isHost: this.isHost,
      isReady: true
    });
    
    this.updatePlayerCount();
    this.updateStartButton();
  }
  
  addPlayerToLobby(player) {
    const container = document.getElementById('players-container');
    const playerCard = document.createElement('div');
    playerCard.className = 'player-card';
    playerCard.dataset.playerId = player.id;
    
    if (player.isHost) playerCard.classList.add('host');
    if (player.isReady) playerCard.classList.add('ready');
    
    playerCard.innerHTML = `
      <div class="player-avatar">${this.getAvatarEmoji(player.id === this.playerId ? this.avatar : '1')}</div>
      <div class="player-info">
        <div class="player-name">${player.name} ${player.isHost ? '👑' : ''}</div>
        <div class="player-status ${player.isReady ? 'ready' : ''}">
          ${player.isReady ? 'Pronto' : 'In attesa'}
        </div>
      </div>
    `;
    
    container.appendChild(playerCard);
  }
  
  removePlayerFromLobby(playerId) {
    const playerCard = document.querySelector(`[data-player-id="${playerId}"]`);
    if (playerCard) {
      playerCard.remove();
    }
  }
  
  updatePlayerReady(playerId, isReady) {
    const playerCard = document.querySelector(`[data-player-id="${playerId}"]`);
    if (playerCard) {
      playerCard.classList.toggle('ready', isReady);
      const statusEl = playerCard.querySelector('.player-status');
      if (statusEl) {
        statusEl.textContent = isReady ? 'Pronto' : 'In attesa';
        statusEl.classList.toggle('ready', isReady);
      }
    }
    
    this.updateStartButton();
  }
  
  clearPlayersList() {
    document.getElementById('players-container').innerHTML = '';
  }
  
  updatePlayerCount() {
    const players = document.querySelectorAll('.player-card');
    document.getElementById('player-count').textContent = players.length;
  }
  
  updateStartButton() {
    const btnStart = document.getElementById('btn-start-game');
    const players = document.querySelectorAll('.player-card');
    const allReady = Array.from(players).every(card => card.classList.contains('ready'));
    
    btnStart.disabled = !this.isHost || players.length < 2 || !allReady;
  }
  
  startGame() {
    this.socket.send(JSON.stringify({
      type: 'start-game'
    }));
  }
  
  leaveLobby() {
    this.socket.send(JSON.stringify({
      type: 'leave-room'
    }));
  }
  
  toggleReady(isReady) {
    this.socket.send(JSON.stringify({
      type: 'player-ready',
      payload: { isReady }
    }));
  }
  
  copyRoomCode() {
    navigator.clipboard.writeText(this.roomCode)
      .then(() => this.showToast('Codice copiato!'))
      .catch(() => this.showToast('Errore nella copia', 'error'));
  }
  
  // Game Methods
  initializeGameBoard() {
    const board = document.getElementById('player-board');
    board.innerHTML = '';
    
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 5; j++) {
        const cell = document.createElement('div');
        cell.className = 'board-cell';
        cell.dataset.row = i;
        cell.dataset.col = j;
        board.appendChild(cell);
      }
    }
    
    this.initializeKeyboard();
  }
  
  initializeKeyboard() {
    const layout = [
      ['q','w','e','r','t','y','u','i','o','p'],
      ['a','s','d','f','g','h','j','k','l'],
      ['enter','z','x','c','v','b','n','m','⌫']
    ];
    
    const keyboard = document.getElementById('keyboard');
    keyboard.innerHTML = '';
    
    layout.forEach(row => {
      const rowDiv = document.createElement('div');
      rowDiv.className = 'keyboard-row';
      
      row.forEach(key => {
        const keyBtn = document.createElement('button');
        keyBtn.className = 'key';
        keyBtn.textContent = key;
        keyBtn.dataset.key = key;
        
        if (key === 'enter' || key === '⌫') {
          keyBtn.classList.add('wide');
        }
        
        keyBtn.addEventListener('click', () => this.handleKeyboardClick(key));
        rowDiv.appendChild(keyBtn);
      });
      
      keyboard.appendChild(rowDiv);
    });
  }
  
  handleKeyboardClick(key) {
    if (key === 'enter') {
      this.submitGuess();
    } else if (key === '⌫') {
      this.removeLetter();
    } else if (/^[a-z]$/.test(key)) {
      this.addLetter(key);
    }
  }
  
  handlePhysicalKeyboard(e) {
    if (!document.getElementById('game-screen').classList.contains('active')) return;
    
    if (e.key === 'Enter') {
      this.submitGuess();
    } else if (e.key === 'Backspace') {
      this.removeLetter();
    } else if (/^[a-z]$/i.test(e.key)) {
      this.addLetter(e.key.toLowerCase());
    }
  }
  
  addLetter(letter) {
    const currentPlayer = this.currentGame?.players?.find(p => p.id === this.playerId);
    if (!currentPlayer || currentPlayer.hasGuessed) return;
    
    const currentRow = currentPlayer.currentAttempt;
    const cells = document.querySelectorAll(`.board-cell[data-row="${currentRow}"]`);
    const emptyCell = Array.from(cells).find(cell => !cell.textContent);
    
    if (emptyCell) {
      emptyCell.textContent = letter.toUpperCase();
      emptyCell.classList.add('filled');
    }
  }
  
  removeLetter() {
    const currentPlayer = this.currentGame?.players?.find(p => p.id === this.playerId);
    if (!currentPlayer || currentPlayer.hasGuessed) return;
    
    const currentRow = currentPlayer.currentAttempt;
    const cells = Array.from(document.querySelectorAll(`.board-cell[data-row="${currentRow}"]`));
    
    for (let i = cells.length - 1; i >= 0; i--) {
      if (cells[i].textContent) {
        cells[i].textContent = '';
        cells[i].classList.remove('filled');
        break;
      }
    }
  }
  
  submitGuess() {
    const currentPlayer = this.currentGame?.players?.find(p => p.id === this.playerId);
    if (!currentPlayer || currentPlayer.hasGuessed) return;
    
    const currentRow = currentPlayer.currentAttempt;
    const cells = document.querySelectorAll(`.board-cell[data-row="${currentRow}"]`);
    const word = Array.from(cells).map(cell => cell.textContent.toLowerCase()).join('');
    
    if (word.length !== 5) {
      this.showToast('Parola troppo corta', 'error');
      return;
    }
    
    this.socket.send(JSON.stringify({
      type: 'make-guess',
      payload: { word }
    }));
  }
  
  updateBoardWithGuess(data) {
    const currentPlayer = this.currentGame.players.find(p => p.id === this.playerId);
    const currentRow = currentPlayer.currentAttempt - 1;
    const cells = document.querySelectorAll(`.board-cell[data-row="${currentRow}"]`);
    
    // Anima le celle con i colori
    cells.forEach((cell, index) => {
      setTimeout(() => {
        cell.classList.add('flip');
        cell.classList.add(data.result[index]);
        
        // Aggiorna tastiera
        const letter = cell.textContent.toLowerCase();
        const key = document.querySelector(`.key[data-key="${letter}"]`);
        if (key) {
          key.classList.add(data.result[index]);
        }
      }, index * 300);
    });
  }
  
  skipTurn() {
    this.socket.send(JSON.stringify({
      type: 'end-turn'
    }));
  }
  
  startTurnTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    
    this.timeLeft = 120;
    this.updateTimerDisplay();
    
    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      this.updateTimerDisplay();
      
      if (this.timeLeft <= 0) {
        clearInterval(this.timerInterval);
        this.skipTurn();
      }
    }, 1000);
  }
  
  updateTimerDisplay() {
    const timerEl = document.getElementById('turn-timer');
    if (timerEl) {
      timerEl.querySelector('span').textContent = this.timeLeft;
      
      if (this.timeLeft <= 30) {
        timerEl.classList.add('warning');
      } else {
        timerEl.classList.remove('warning');
      }
    }
  }
  
  updateGameUI() {
    if (!this.currentGame) return;
    
    // Aggiorna info round
    document.getElementById('current-round').textContent = this.currentGame.currentRound;
    
    // Aggiorna giocatore corrente
    const currentPlayer = this.currentGame.players[this.currentGame.currentPlayerIndex];
    document.getElementById('current-player-name').textContent = currentPlayer.name;
    
    // Aggiorna scoreboard
    this.updateScoreboard();
    
    // Aggiorna stato controlli
    const isMyTurn = currentPlayer.id === this.playerId;
    const hasGuessed = this.currentGame.players.find(p => p.id === this.playerId)?.hasGuessed;
    
    document.getElementById('btn-submit-word').disabled = !isMyTurn || hasGuessed;
    document.getElementById('btn-skip-turn').disabled = !isMyTurn;
    
    // Aggiorna board avversari
    this.updateOpponentsBoards();
  }
  
  updateScoreboard() {
    const container = document.getElementById('scoreboard');
    container.innerHTML = '';
    
    this.currentGame.players.sort((a, b) => b.score - a.score).forEach((player, index) => {
      const playerEl = document.createElement('div');
      playerEl.className = 'scoreboard-player';
      if (player.id === this.currentGame.players[this.currentGame.currentPlayerIndex].id) {
        playerEl.classList.add('current');
      }
      
      playerEl.innerHTML = `
        <span>${index + 1}. ${player.name}</span>
        <span class="player-score">${player.score}</span>
      `;
      
      container.appendChild(playerEl);
    });
  }
  
  updateOpponentsBoards() {
    const container = document.getElementById('opponents-container');
    container.innerHTML = '';
    
    this.currentGame.players
      .filter(player => player.id !== this.playerId)
      .forEach(player => {
        const opponentEl = document.createElement('div');
        opponentEl.className = 'opponent-board';
        
        opponentEl.innerHTML = `
          <div class="opponent-header">
            <span>${player.name}</span>
            <span>Tentativi: ${player.currentAttempt}/6</span>
          </div>
          <div class="opponent-grid" id="opponent-${player.id}">
            <!-- Celle verranno aggiornate dinamicamente -->
          </div>
        `;
        
        container.appendChild(opponentEl);
        this.updateOpponentBoard(player);
      });
  }
  
  updateOpponentBoard(player) {
    const container = document.getElementById(`opponent-${player.id}`);
    if (!container) return;
    
    container.innerHTML = '';
    
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 5; j++) {
        const cell = document.createElement('div');
        cell.className = 'opponent-cell';
        
        if (i < player.currentAttempt) {
          const guess = player.guesses[i];
          if (guess && guess.word[j]) {
            cell.textContent = guess.word[j].toUpperCase();
            if (guess.result[j]) {
              cell.classList.add(guess.result[j]);
            }
          }
        }
        
        container.appendChild(cell);
      }
    }
  }
  
  // Chat Methods
  sendChatMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (message) {
      this.socket.send(JSON.stringify({
        type: 'chat-message',
        payload: { message }
      }));
      
      input.value = '';
    }
  }
  
  sendQuickMessage(message) {
    this.socket.send(JSON.stringify({
      type: 'chat-message',
      payload: { message }
    }));
  }
  
  addChatMessage(sender, message, timestamp) {
    const container = document.getElementById('chat-messages');
    const gameContainer = document.getElementById('game-chat-messages');
    
    const time = new Date(timestamp).toLocaleTimeString('it-IT', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    const messageHtml = `
      <div class="chat-message">
        <div class="message-header">
          <span class="message-sender">${sender}</span>
          <span class="message-time">${time}</span>
        </div>
        <div class="message-content">${message}</div>
      </div>
    `;
    
    container.insertAdjacentHTML('beforeend', messageHtml);
    container.scrollTop = container.scrollHeight;
    
    if (gameContainer) {
      gameContainer.insertAdjacentHTML('beforeend', messageHtml);
      gameContainer.scrollTop = gameContainer.scrollHeight;
    }
  }
  
  // Results Methods
  showResults() {
    this.showScreen('results-screen');
    
    const winner = this.currentGame.players.reduce((prev, current) => 
      prev.score > current.score ? prev : current
    );
    
    document.getElementById('winner-name').textContent = `${winner.name} vince il round!`;
    document.getElementById('winner-score').textContent = winner.score;
    document.getElementById('results-round').textContent = this.currentGame.currentRound - 1;
    document.getElementById('results-word').textContent = this.currentGame.word.toUpperCase();
    
    this.updateResultsScoreboard();
  }
  
  updateResultsScoreboard() {
    const container = document.getElementById('results-scoreboard');
    container.innerHTML = '';
    
    const players = [...this.currentGame.players].sort((a, b) => b.score - a.score);
    
    players.forEach((player, index) => {
      const playerEl = document.createElement('div');
      playerEl.className = 'result-player';
      if (index === 0) playerEl.classList.add('winner');
      
      playerEl.innerHTML = `
        <div>
          <strong>${index + 1}. ${player.name}</strong>
          <div class="player-details">
            Punteggio: ${player.score} | Tentativi: ${player.guesses.length}
          </div>
        </div>
        <div class="player-score">${player.score}</div>
      `;
      
      container.appendChild(playerEl);
    });
  }
  
  nextRound() {
    // Il server gestirà automaticamente il prossimo round
    this.showScreen('game-screen');
  }
  
  returnToLobby() {
    this.showScreen('lobby-screen');
  }
  
  // Utility Methods
  selectAvatar(avatarEl) {
    document.querySelectorAll('.avatar').forEach(av => av.classList.remove('selected'));
    avatarEl.classList.add('selected');
    this.avatar = avatarEl.dataset.avatar;
  }
  
  getAvatarEmoji(avatarId) {
    const emojis = {
      '1': '👤', '2': '🧑‍💻', '3': '👨‍🎨',
      '4': '👩‍🔬', '5': '🧙', '6': '🦸'
    };
    return emojis[avatarId] || '👤';
  }
  
  showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast';
    
    if (type === 'error') toast.style.background = '#dc3545';
    else if (type === 'success') toast.style.background = '#28a745';
    else if (type === 'info') toast.style.background = '#17a2b8';
    
    toast.classList.add('show');
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }
  
  showInstructions() {
    document.getElementById('instructions-modal').classList.add('active');
  }
  
  closeModal(modal) {
    modal.classList.remove('active');
  }
  
  updateOnlineStats() {
    // Chiama API reali
    const update = () => {
      fetch('/api/stats')
        .then(response => response.json())
        .then(data => {
          document.getElementById('online-count').textContent = data.playersOnline || 0;
          document.getElementById('rooms-count').textContent = data.activeRooms || 0;
        })
        .catch(error => {
          console.log('Errore nel caricamento statistiche:', error);
          // Fallback: mostra 0 in locale
          document.getElementById('online-count').textContent = "0";
          document.getElementById('rooms-count').textContent = "0";
        });
    };
    
    // Aggiorna subito e poi ogni 10 secondi
    update();
    setInterval(update, 10000);
  }
  
  startSingleplayer() {
    // Implementa il singleplayer separato
    this.showScreen('singleplayer-screen');
    window.startSingleplayerGame();
  }
  
  leaveGame() {
    if (confirm('Sei sicuro di voler lasciare la partita?')) {
      this.socket.send(JSON.stringify({
        type: 'leave-room'
      }));
    }
  }
  
  clearWord() {
    const currentPlayer = this.currentGame?.players?.find(p => p.id === this.playerId);
    if (!currentPlayer || currentPlayer.hasGuessed) return;
    
    const currentRow = currentPlayer.currentAttempt;
    const cells = document.querySelectorAll(`.board-cell[data-row="${currentRow}"]`);
    
    cells.forEach(cell => {
      cell.textContent = '';
      cell.classList.remove('filled');
    });
  }
}

// Inizializza quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
  window.wordleOnline = new WordleOnline();
});