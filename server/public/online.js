class WordleOnline {
  constructor() {
    if (window.wordleOnline && window.wordleOnline instanceof WordleOnline) {
      return window.wordleOnline;
    }
    
    this.socket = null;
    this.playerId = null;
    this.roomCode = null;
    this.playerName = '';
    this.avatar = '1';
    this.isHost = false;
    this.currentGame = null;
    this.timerInterval = null;
    this.timeLeft = 120;
    this.isProcessingInput = false;
    this.lastKeyPressTime = 0;
    this.isAnimating = false;
    this.currentInput = '';
    this.roomPlayers = [];
    
    this.connectWebSocket();
    this.bindEvents();
    this.updateOnlineStats();
  }
  
  bindEvents() {
    if (this._eventsBound) return;
    this._eventsBound = true;

    document.addEventListener('click', (e) => {
      const btn = e.target.closest('button, [data-action], .quick-msg, .modal-close');
      if (!btn) return;

      if (btn.classList.contains('quick-msg')) {
        const msg = btn.dataset.msg;
        if (msg) {
          e.preventDefault();
          this.sendQuickMessage(msg);
        }
        return;
      }

      if (btn.classList.contains('modal-close')) {
        const modal = btn.closest('.modal');
        if (modal) this.closeModal(modal);
        return;
      }

      switch (btn.id) {
        case 'btn-create-room': this.createRoom(); break;
        case 'btn-join-room': this.joinRoom(); break;
        case 'btn-singleplayer': this.startSingleplayer(); break;
        case 'btn-how-to-play': this.showInstructions(); break;
        case 'btn-leave-lobby': this.leaveLobby(); break;
        case 'btn-start-game': this.startGame(); break;
        case 'btn-copy-code': this.copyRoomCode(); break;
        case 'btn-send-chat': this.sendChatMessage(); break;
        case 'btn-leave-game': this.leaveGame(); break;
        case 'btn-submit-word': this.submitGuess(); break;
        case 'btn-clear-word': this.clearWord(); break;
        case 'btn-skip-turn': this.skipTurn(); break;
        case 'btn-send-game-chat': this.sendGameChatMessage(); break;
        case 'btn-next-round': this.nextRound(); break;
        case 'btn-return-lobby': this.returnToLobby(); break;
        case 'btn-minigames': window.open('minigames.html', '_self'); break;
      }
    });

    const avatarsContainer = document.querySelector('.avatars');
    if (avatarsContainer) {
      avatarsContainer.addEventListener('click', (e) => {
        const av = e.target.closest('.avatar');
        if (av) this.selectAvatar(av);
      });
    }

    const readyCheckbox = document.getElementById('ready-checkbox');
    if (readyCheckbox) {
      readyCheckbox.addEventListener('change', (e) => this.toggleReady(e.target.checked));
    }

    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.sendChatMessage();
        }
      });
    }

    const gameChatInput = document.getElementById('game-chat-input');
    if (gameChatInput) {
      gameChatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.sendGameChatMessage();
        }
      });
    }

    document.addEventListener('keydown', (e) => this.handlePhysicalKeyboard(e));
    document.addEventListener('screen-changed', (e) => {
      if (e.detail.screen === 'lobby-screen') {
        const readyCheckbox = document.getElementById('ready-checkbox');
        if (readyCheckbox && this.roomPlayers.length > 0) {
          const currentPlayer = this.roomPlayers.find(p => p.id === this.playerId);
          readyCheckbox.checked = currentPlayer ? currentPlayer.isReady : false;
        }
      }
    });
  }
  
  connectWebSocket() {
    let wsUrl;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      wsUrl = 'ws://localhost:10000';
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
      wsUrl = protocol + window.location.host;
    }
    
    this.socket = new WebSocket(wsUrl);
    
    this.socket.onopen = () => {
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
      this.showToast('Disconnesso dal server. Tentativo riconnessione...', 'error');
      setTimeout(() => this.connectWebSocket(), 3000);
    };
    
    this.socket.onerror = (error) => {
      this.showToast('Errore di connessione', 'error');
    };
  }
  
  handleServerMessage(data) {
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
      case 'turn-changed':
        this.handleTurnChanged(data);
        break;
      case 'guess-result':
        this.handleGuessResult(data);
        break;
      case 'chat-message':
        this.handleChatMessage(data);
        break;
      case 'player-won-round':
        this.handlePlayerWonRound(data);
        break;
      case 'next-round-started':
        this.handleNextRoundStarted(data);
        break;
      case 'game-ended':
        this.handleGameEnded(data);
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
    
    this.socket.send(JSON.stringify({
      type: 'create-room',
      payload: { playerName: this.playerName }
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
      payload: { roomCode, playerName: this.playerName }
    }));
  }
  
  handleRoomCreated(data) {
    this.roomCode = data.roomCode;
    this.isHost = data.isHost;
    this.showScreen('lobby-screen');
    this.clearPlayersList();
    document.getElementById('lobby-room-code').textContent = this.roomCode;
    document.getElementById('share-room-code').textContent = this.roomCode;
    if (data.players && Array.isArray(data.players)) {
      this.roomPlayers = data.players;
      data.players.forEach(player => {
        this.addPlayerToLobby({
          id: player.id,
          name: player.name,
          isHost: player.isHost,
          isReady: player.isReady || false
        });
      });
    }
    const readyCheckbox = document.getElementById('ready-checkbox');
    if (readyCheckbox) {
      const currentPlayer = this.roomPlayers.find(p => p.id === this.playerId);
      readyCheckbox.checked = currentPlayer ? currentPlayer.isReady : false;
    }
    
    this.updatePlayerCount();
    this.updateStartButton();
    this.showToast(`Stanza ${this.roomCode} creata!`);
  }

  handleRoomJoined(data) {
    this.roomCode = data.roomCode;
    this.isHost = data.isHost;
    this.showScreen('lobby-screen');
    this.clearPlayersList();
    document.getElementById('lobby-room-code').textContent = this.roomCode;
    document.getElementById('share-room-code').textContent = this.roomCode;
    if (data.players && Array.isArray(data.players)) {
      this.roomPlayers = data.players;
      data.players.forEach(player => {
        this.addPlayerToLobby({
          id: player.id,
          name: player.name,
          isHost: player.isHost,
          isReady: player.isReady || false
        });
      });
    }
    const readyCheckbox = document.getElementById('ready-checkbox');
    if (readyCheckbox) {
      const currentPlayer = this.roomPlayers.find(p => p.id === this.playerId);
      readyCheckbox.checked = currentPlayer ? currentPlayer.isReady : false;
    }
    this.updatePlayerCount();
    this.updateStartButton();
    this.showToast(`Unito a stanza ${this.roomCode}`);
  }

  
  handleRoomLeft() {
    this.roomCode = null;
    this.isHost = false;
    this.roomPlayers = [];
    this.showScreen('start-screen');
    this.showToast('Hai lasciato la stanza');
  }
  
  handlePlayerJoined(data) {
    this.addPlayerToLobby({
      id: data.player.id,
      name: data.player.name,
      isHost: data.player.isHost || false,
      isReady: data.player.isReady || false
    });
    
    this.roomPlayers.push(data.player);
    this.updatePlayerCount();
    this.updateStartButton();
    this.addChatMessage('Sistema', `${data.player.name} si è unito`, Date.now());
  }
  
  handlePlayerLeft(data) {
    this.removePlayerFromLobby(data.playerId);
    this.roomPlayers = this.roomPlayers.filter(p => p.id !== data.playerId);
    this.updatePlayerCount();
    this.updateStartButton();
    this.addChatMessage('Sistema', `${data.playerName} ha lasciato`, Date.now());
  }
  
  handlePlayerReadyUpdated(data) {
    this.updatePlayerReady(data.playerId, data.isReady);
    if (data.players) {
      this.roomPlayers = data.players;
    }
    if (data.playerId === this.playerId) {
      const readyCheckbox = document.getElementById('ready-checkbox');
      if (readyCheckbox) {
        readyCheckbox.checked = data.isReady;
      }
    }
    
    this.updateStartButton();
  }
  
  handleTurnChanged(data) {
    if (data.gameState) {
      this.currentGame = data.gameState;
    }
    
    this.updateGameUI();
    
    if (data.currentPlayerId === this.playerId) {
      this.showToast('È il tuo turno!', 'success');
      this.startTurnTimer();
    }
  }
  
  handleGameStarted(data) {
    if (!data.gameState) {
      this.showToast('Errore nell\'avvio della partita', 'error');
      return;
    }
    this.currentGame = data.gameState;
    if (!Array.isArray(this.currentGame.players)) {
      this.currentGame.players = [];
    }
    this.showScreen('game-screen');
    const gameRoomCodeEl = document.getElementById('game-room-code');
    if (gameRoomCodeEl) {
      gameRoomCodeEl.textContent = this.roomCode;
    }
    
    this.initializeGameBoard();
    this.updateGameUI();
    this.showToast('Partita iniziata!', 'success');
  }
  
  handleGuessResult(data) {
    if (data.playerId === this.playerId) {
      this.updateBoardWithGuess(data);
      this.isProcessingInput = false;
    }
    
    if (data.gameState) {
      this.currentGame = data.gameState;
    }
    
    this.updateGameUI();
    this.updateOpponentsBoards();
    
    if (data.guessed) {
      if (data.playerId === this.playerId) {
        this.showToast('Hai indovinato! 🎉', 'success');
      } else {
        this.showToast(`${data.playerName} ha indovinato!`, 'info');
      }
    }
  }
  
  handleChatMessage(data) {
    this.addChatMessage(data.playerName, data.message, data.timestamp);
  }
  
  handlePlayerWonRound(data) {
    this.showToast(`${data.playerName} ha indovinato! +${data.score} punti`, 'success');
    
    if (this.currentGame?.players) {
      const player = this.currentGame.players.find(p => p.id === data.playerId);
      if (player) {
        player.score = data.score;
        this.updateScoreboard();
      }
    }
  }
  
  handleNextRoundStarted(data) {
    this.showToast(`Round ${data.round} iniziato!`, 'info');
    this.initializeGameBoard();
    
    if (data.gameState) {
      this.currentGame = data.gameState;
    }
    
    this.updateGameUI();
    
    if (this.currentGame) {
      document.getElementById('current-round').textContent = data.round;
    }
    
    document.getElementById('btn-submit-word').disabled = false;
    document.getElementById('btn-skip-turn').disabled = false;
  }
  
  handleGameEnded(data) {
    this.showToast(data.message, 'success');
    this.showScreen('results-screen');
    
    document.getElementById('winner-name').textContent = data.winner ? `${data.winner} vince!` : 'Partita terminata';
    document.getElementById('winner-score').textContent = data.scores?.find(s => s.name === data.winner)?.score || 0;
    document.getElementById('results-round').textContent = 'Finale';
    document.getElementById('results-word').textContent = 'COMPLETATA';
    
    this.updateResultsScoreboard(data.scores);
  }
  
  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
    document.dispatchEvent(new CustomEvent('screen-changed', {
      detail: { screen: screenId }
    }));

    const chatToggleButton = document.querySelector('.chat-toggle');
    if (chatToggleButton) {
        if (screenId === 'game-screen') {
            chatToggleButton.style.display = 'flex';
        } else {
            chatToggleButton.style.display = 'none';
            const gameChat = document.querySelector('.game-chat');
            if (gameChat) {
                gameChat.classList.remove('mobile-open');
                document.getElementById('chat-overlay')?.classList.remove('active');
            }
        }
    }
  }
  
  updateLobbyUI() {
    document.getElementById('lobby-room-code').textContent = this.roomCode || '----';
    document.getElementById('share-room-code').textContent = this.roomCode || '----';
    const readyCheckbox = document.getElementById('ready-checkbox');
    if (readyCheckbox) {
      const currentPlayer = this.roomPlayers.find(p => p.id === this.playerId);
      readyCheckbox.checked = currentPlayer ? currentPlayer.isReady : false;
    }
    
    this.clearPlayersList();
    this.addPlayerToLobby({
      id: this.playerId,
      name: this.playerName,
      isHost: this.isHost,
      isReady: false
    });
    
    this.updatePlayerCount();
    this.updateStartButton();
  }
  
  addPlayerToLobby(player) {
    const container = document.getElementById('players-container');
    if (!container) return;
    
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
    if (playerCard) playerCard.remove();
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
  }
  
  clearPlayersList() {
    const container = document.getElementById('players-container');
    if (container) container.innerHTML = '';
  }
  
  updatePlayerCount() {
    const players = document.querySelectorAll('.player-card');
    const countElement = document.getElementById('player-count');
    if (countElement) {
      countElement.textContent = players.length;
    }
  }
  
  updateStartButton() {
    const btnStart = document.getElementById('btn-start-game');
    if (!btnStart) return;
    
    const players = this.roomPlayers || [];
    const allReady = players.every(p => p.isReady);
    const hasMinPlayers = players.length >= 1;
    
    btnStart.disabled = !this.isHost || !hasMinPlayers || !allReady;
  }
  
  startGame() {
    this.socket.send(JSON.stringify({ type: 'start-game' }));
  }
  
  leaveLobby() {
    this.socket.send(JSON.stringify({ type: 'leave-room' }));
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
  
  initializeGameBoard() {
    const board = document.getElementById('player-board');
    if (!board) return;
    
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
    this.isProcessingInput = false;
    this.currentInput = '';
  }
  
  initializeKeyboard() {
    const keyboard = document.getElementById('keyboard');
    if (!keyboard) return;
    
    const layout = [
      ['q','w','e','r','t','y','u','i','o','p'],
      ['a','s','d','f','g','h','j','k','l'],
      ['enter','z','x','c','v','b','n','m','⌫']
    ];
    
    keyboard.innerHTML = '';
    
    layout.forEach(row => {
      const rowDiv = document.createElement('div');
      rowDiv.className = 'keyboard-row';
      
      row.forEach(key => {
        const keyBtn = document.createElement('button');
        keyBtn.className = 'key';
        keyBtn.textContent = key === 'enter' ? 'INVIA' : key;
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
    const now = Date.now();
    if (now - this.lastKeyPressTime < 100) return;
    this.lastKeyPressTime = now;
    
    if (this.isProcessingInput) return;
    
    if (key === 'enter') {
      this.submitGuess();
    } else if (key === '⌫') {
      this.removeLetter();
    } else if (/^[a-z]$/.test(key)) {
      this.addLetter(key);
    }
  }
  
  handlePhysicalKeyboard(e) {
    const gameScreen = document.getElementById('game-screen');
    if (!gameScreen || !gameScreen.classList.contains('active')) return;
    
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.repeat) return;
    
    const now = Date.now();
    if (now - this.lastKeyPressTime < 50) return;
    this.lastKeyPressTime = now;
    
    if (this.isProcessingInput || this.isAnimating) return;
    
    if (e.key === 'Enter') {
      e.preventDefault();
      this.submitGuess();
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      this.removeLetter();
    } else if (/^[a-zA-Z]$/.test(e.key)) {
      e.preventDefault();
      this.addLetter(e.key.toLowerCase());
    }
  }
  
  addLetter(letter) {
    if (this.isProcessingInput || this.isAnimating) return;
    if (!this.currentGame?.players) return;
    
    const currentPlayer = this.currentGame.players.find(p => p.id === this.playerId);
    if (!currentPlayer || currentPlayer.hasGuessed) return;
    
    const currentRow = currentPlayer.currentAttempt || 0;
    const cells = document.querySelectorAll(`.board-cell[data-row="${currentRow}"]`);
    
    const emptyCell = Array.from(cells).find(cell => !cell.textContent);
    if (!emptyCell) return;
    
    emptyCell.textContent = letter.toUpperCase();
    emptyCell.classList.add('filled');
    
    this.isAnimating = true;
    emptyCell.style.animation = 'none';
    requestAnimationFrame(() => {
      emptyCell.style.animation = 'pop 0.15s cubic-bezier(0.4, 0, 0.2, 1)';
    });
    
    setTimeout(() => {
      this.isAnimating = false;
    }, 150);
  }
  
  removeLetter() {
    if (!this.currentGame?.players || this.isProcessingInput) return;
    
    const currentPlayer = this.currentGame.players.find(p => p.id === this.playerId);
    if (!currentPlayer || currentPlayer.hasGuessed) return;
    
    const currentRow = currentPlayer.currentAttempt || 0;
    const cells = Array.from(document.querySelectorAll(`.board-cell[data-row="${currentRow}"]`));
    
    for (let i = cells.length - 1; i >= 0; i--) {
      if (cells[i].textContent) {
        const cell = cells[i];
        
        cell.style.animation = 'none';
        requestAnimationFrame(() => {
          cell.style.animation = 'pop-reverse 0.15s cubic-bezier(0.4, 0, 0.2, 1)';
        });
        
        setTimeout(() => {
          cell.textContent = '';
          cell.classList.remove('filled');
          cell.style.animation = '';
        }, 150);
        
        break;
      }
    }
  }
  
  submitGuess() {
    if (this.isProcessingInput) return;
    
    if (!this.currentGame) {
      this.showToast('Partita non iniziata', 'error');
      return;
    }
    
    const currentPlayer = this.currentGame.players.find(p => p.id === this.playerId);
    if (!currentPlayer) {
      this.showToast('Giocatore non trovato', 'error');
      return;
    }
    
    if (currentPlayer.hasGuessed) {
      this.showToast('Hai già indovinato!', 'info');
      return;
    }
    
    const currentRow = currentPlayer.currentAttempt || 0;
    const cells = document.querySelectorAll(`.board-cell[data-row="${currentRow}"]`);
    const word = Array.from(cells).map(cell => cell.textContent?.toLowerCase() || '').join('');
    
    if (word.length !== 5) {
      this.showToast('Parola troppo corta', 'error');
      return;
    }
    
    this.isProcessingInput = true;
    this.socket.send(JSON.stringify({
      type: 'make-guess',
      payload: { word }
    }));
    
    setTimeout(() => {
      if (this.isProcessingInput) {
        this.isProcessingInput = false;
      }
    }, 3000);
  }
  
  updateBoardWithGuess(data) {
    const currentPlayer = this.currentGame?.players?.find(p => p.id === this.playerId);
    if (!currentPlayer) return;
    
    const currentRow = currentPlayer.currentAttempt || 0;
    const cells = document.querySelectorAll(`.board-cell[data-row="${currentRow}"]`);
    
    cells.forEach((cell, index) => {
      setTimeout(() => {
        cell.classList.add('flip');
        cell.classList.add(data.result[index]);
        
        const letter = cell.textContent.toLowerCase();
        const key = document.querySelector(`.key[data-key="${letter}"]`);
        if (key && !key.classList.contains('correct')) {
          key.classList.add(data.result[index]);
        }
      }, index * 300);
    });
    
    setTimeout(() => {
      if (currentPlayer) {
        currentPlayer.currentAttempt = (currentPlayer.currentAttempt || 0) + 1;
      }
    }, 1500);
  }
  
  skipTurn() {
    this.socket.send(JSON.stringify({ type: 'skip-turn' }));
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
      timerEl.classList.toggle('warning', this.timeLeft <= 30);
    }
  }
  
  updateGameUI() {
    if (!this.currentGame) return;
    
    const currentPlayerIndex = this.currentGame.currentPlayerIndex || 0;
    const currentPlayer = this.currentGame.players[currentPlayerIndex];
    const isMyTurn = currentPlayer && currentPlayer.id === this.playerId;
    const myPlayer = this.currentGame.players.find(p => p.id === this.playerId);
    const hasGuessed = myPlayer ? myPlayer.hasGuessed : false;
    
    if (currentPlayer) {
      document.getElementById('current-player-name').textContent = currentPlayer.name;
    }
    
    document.getElementById('current-round').textContent = this.currentGame.currentRound || 1;
    
    const submitBtn = document.getElementById('btn-submit-word');
    const skipBtn = document.getElementById('btn-skip-turn');
    
    if (submitBtn) submitBtn.disabled = !isMyTurn || hasGuessed;
    if (skipBtn) skipBtn.disabled = !isMyTurn;
    
    this.updateScoreboard();
    this.updateOpponentsBoards();
  }
  
  updateScoreboard() {
    const container = document.getElementById('scoreboard');
    if (!container) return;
    
    container.innerHTML = '';
    const players = Array.isArray(this.currentGame?.players) ? this.currentGame.players : [];
    
    if (players.length === 0) {
      container.innerHTML = '<div class="no-players">Nessun giocatore</div>';
      return;
    }
    
    players.sort((a, b) => {
      const scoreA = typeof a.score === 'number' ? a.score : 0;
      const scoreB = typeof b.score === 'number' ? b.score : 0;
      return scoreB - scoreA;
    });
    
    players.forEach((player, index) => {
      const playerEl = document.createElement('div');
      playerEl.className = 'scoreboard-player';
      
      const currentPlayerIndex = this.currentGame.currentPlayerIndex || 0;
      const currentPlayer = this.currentGame.players[currentPlayerIndex];
      if (currentPlayer && player.id === currentPlayer.id) {
        playerEl.classList.add('current');
      }
      
      const playerName = player.name || 'Giocatore';
      const playerScore = typeof player.score === 'number' ? player.score : 0;
      
      playerEl.innerHTML = `
        <span>${index + 1}. ${playerName}</span>
        <span class="player-score">${playerScore}</span>
      `;
      
      container.appendChild(playerEl);
    });
  }
  
  updateOpponentsBoards() {
    const container = document.getElementById('opponents-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    const players = Array.isArray(this.currentGame?.players) ? this.currentGame.players : [];
    
    players
      .filter(player => player.id !== this.playerId)
      .forEach(player => {
        const opponentEl = document.createElement('div');
        opponentEl.className = 'opponent-board';
        
        const playerName = player.name || 'Giocatore';
        const currentAttempt = typeof player.currentAttempt === 'number' ? player.currentAttempt : 0;
        
        opponentEl.innerHTML = `
          <div class="opponent-header">
            <span>${playerName}</span>
            <span>Tentativi: ${currentAttempt}/6</span>
            ${player.hasGuessed ? '<span class="guessed-badge">✓ Indovinato</span>' : ''}
          </div>
          <div class="opponent-grid" id="opponent-${player.id}"></div>
        `;
        
        container.appendChild(opponentEl);
        
        const grid = document.getElementById(`opponent-${player.id}`);
        if (grid) {
          grid.innerHTML = '';
          
          for (let row = 0; row < 6; row++) {
            for (let col = 0; col < 5; col++) {
              const cell = document.createElement('div');
              cell.className = 'opponent-cell';
              
              if (player.guesses && player.guesses[row]) {
                const guess = player.guesses[row];
                if (guess.word && guess.word[col]) {
                  cell.textContent = guess.word[col].toUpperCase();
                  if (guess.result && guess.result[col]) {
                    cell.classList.add(guess.result[col]);
                  }
                }
              }
              
              grid.appendChild(cell);
            }
          }
        }
      });
  }
  
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
    if (!message) return;
    
    this.socket.send(JSON.stringify({
      type: 'chat-message',
      payload: { message }
    }));
  }
  
  sendGameChatMessage() {
    const input = document.getElementById('game-chat-input');
    if (!input) return;
    
    const message = input.value.trim();
    if (message) {
      this.socket.send(JSON.stringify({
        type: 'chat-message',
        payload: { message }
      }));
      input.value = '';
    }
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
    
    if (container) {
      container.insertAdjacentHTML('beforeend', messageHtml);
      container.scrollTop = container.scrollHeight;
    }
    
    if (gameContainer) {
      gameContainer.insertAdjacentHTML('beforeend', messageHtml);
      gameContainer.scrollTop = gameContainer.scrollHeight;
    }
  }
  
  showResults() {
    this.showScreen('results-screen');
    
    const winner = this.currentGame.players.reduce((prev, current) => 
      prev.score > current.score ? prev : current
    );
    
    document.getElementById('winner-name').textContent = `${winner.name} vince!`;
    document.getElementById('winner-score').textContent = winner.score;
    document.getElementById('results-round').textContent = this.currentGame.currentRound - 1;
    document.getElementById('results-word').textContent = this.currentGame.word?.toUpperCase() || '';
    
    this.updateResultsScoreboard();
  }
  
  updateResultsScoreboard(scoresArray = null) {
    const container = document.getElementById('results-scoreboard');
    if (!container) return;
    
    container.innerHTML = '';
    
    const players = scoresArray || 
      (this.currentGame?.players || []).sort((a, b) => b.score - a.score);
    
    players.forEach((player, index) => {
      const playerData = typeof player === 'object' ? player : { name: player.name, score: player.score };
      
      const playerEl = document.createElement('div');
      playerEl.className = 'result-player';
      if (index === 0) playerEl.classList.add('winner');
      
      playerEl.innerHTML = `
        <div>
          <strong>${index + 1}. ${playerData.name}</strong>
          <div class="player-details">Punteggio: ${playerData.score}</div>
        </div>
        <div class="player-score">${playerData.score}</div>
      `;
      
      container.appendChild(playerEl);
    });
  }
  
  nextRound() {
    this.showScreen('game-screen');
  }
  
  returnToLobby() {
    this.showScreen('lobby-screen');
  }
  
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
    if (!toast) return;
    
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
    const update = () => {
      fetch('/api/stats')
        .then(response => response.json())
        .then(data => {
          document.getElementById('online-count').textContent = data.playersOnline || 0;
          document.getElementById('rooms-count').textContent = data.activeRooms || 0;
        })
        .catch(error => {
          document.getElementById('online-count').textContent = "0";
          document.getElementById('rooms-count').textContent = "0";
        });
    };
    
    update();
    setInterval(update, 10000);
  }
  
  startSingleplayer() {
    this.showScreen('singleplayer-screen');
    if (window.startSingleplayerGame) {
      window.startSingleplayerGame();
    }
  }
  
  leaveGame() {
    if (confirm('Sei sicuro di voler lasciare la partita?')) {
      this.socket.send(JSON.stringify({ type: 'leave-room' }));
    }
  }
  
  clearWord() {
    if (this.isProcessingInput) return;
    
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

document.addEventListener('DOMContentLoaded', () => {
  if (!window.wordleOnline || !(window.wordleOnline instanceof WordleOnline)) {
    window.wordleOnline = new WordleOnline();
  }
});