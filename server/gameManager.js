const WORDS_IT = require('./words_it'); 

class GameManager {
  constructor() {
    this.games = new Map(); 
  }
  
  startGame(roomCode, room) {
    const word = this.pickRandomWord();
    
    const gameState = {
      roomCode,
      word,
      currentRound: 1,
      maxRounds: room.settings.rounds,
      currentPlayerIndex: 0,
      players: room.players.map(player => ({
        id: player.id,
        name: player.name,
        score: 0,
        guesses: [],
        currentAttempt: 0,
        hasGuessed: false,
        timeUsed: 0
      })),
      gameStatus: 'playing',
      turnStartTime: Date.now(),
      turnTimer: room.settings.timePerTurn
    };
    
    this.games.set(roomCode, gameState);
    return gameState;
  }
  
  pickRandomWord() {
    return WORDS_IT[Math.floor(Math.random() * WORDS_IT.length)];
  }
  
  getGameState(roomCode) {
    return this.games.get(roomCode);
  }
  
  processGuess(roomCode, playerId, guess) {
    const game = this.games.get(roomCode);
    if (!game) return { valid: false, message: 'Partita non trovata' };
    
    // Controlla se è il turno del giocatore
    const currentPlayer = game.players[game.currentPlayerIndex];
    if (currentPlayer.id !== playerId) {
      return { valid: false, message: 'Non è il tuo turno' };
    }
    
    // Validazione parola
    guess = guess.toLowerCase();
    if (guess.length !== 5) {
      return { valid: false, message: 'La parola deve essere di 5 lettere' };
    }
    
    if (!WORDS_IT.includes(guess)) {
      return { valid: false, message: 'Parola non valida' };
    }
    
    // Calcola risultato
    const result = this.checkWord(guess, game.word);
    const player = game.players.find(p => p.id === playerId);
    
    player.guesses.push({
      word: guess,
      result,
      timestamp: Date.now()
    });
    
    player.currentAttempt++;
    
    // Controlla se ha indovinato
    const guessed = guess === game.word;
    if (guessed) {
      player.hasGuessed = true;
      player.score += this.calculateScore(player.currentAttempt, player.timeUsed);
      return {
        valid: true,
        guessed: true,
        result,
        attempts: player.currentAttempt,
        gameOver: this.checkGameOver(game)
      };
    }
    
    // Controlla se ha finito i tentativi
    if (player.currentAttempt >= 6) {
      player.hasGuessed = false;
      return {
        valid: true,
        guessed: false,
        result,
        attempts: player.currentAttempt,
        gameOver: this.checkGameOver(game)
      };
    }
    
    return {
      valid: true,
      guessed: false,
      result,
      attempts: player.currentAttempt
    };
  }
  
  checkWord(guess, target) {
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
  
  calculateScore(attempts, timeUsed) {
    const baseScore = 1000;
    const attemptPenalty = 100 * (attempts - 1);
    const timeBonus = Math.max(0, 120 - timeUsed) * 5;
    return Math.max(100, baseScore - attemptPenalty + timeBonus);
  }
  
  nextTurn(roomCode) {
    const game = this.games.get(roomCode);
    if (!game) return;
    
    // Passa al prossimo giocatore che non ha ancora indovinato
    let nextIndex = (game.currentPlayerIndex + 1) % game.players.length;
    let attempts = 0;
    
    while (game.players[nextIndex].hasGuessed && attempts < game.players.length) {
      nextIndex = (nextIndex + 1) % game.players.length;
      attempts++;
    }
    
    game.currentPlayerIndex = nextIndex;
    game.turnStartTime = Date.now();
    
    // Controlla se il round è finito
    if (this.checkRoundOver(game)) {
      this.endRound(roomCode);
    }
  }
  
  checkRoundOver(game) {
    // Tutti hanno indovinato o finito i tentativi
    return game.players.every(p => p.hasGuessed || p.currentAttempt >= 6);
  }
  
  endRound(roomCode) {
    const game = this.games.get(roomCode);
    if (!game) return;
    
    game.currentRound++;
    
    if (game.currentRound > game.maxRounds) {
      this.endGame(roomCode);
    } else {
      // Nuovo round, reset giocatori ma mantieni punteggio
      game.players.forEach(player => {
        player.guesses = [];
        player.currentAttempt = 0;
        player.hasGuessed = false;
        player.timeUsed = 0;
      });
      
      game.currentPlayerIndex = 0;
      game.word = this.pickRandomWord();
      game.turnStartTime = Date.now();
    }
  }
  
  checkGameOver(game) {
    return this.checkRoundOver(game);
  }
  
  endGame(roomCode) {
    const game = this.games.get(roomCode);
    if (!game) return;
    
    game.gameStatus = 'finished';
    
    // Calcola vincitore
    game.winner = game.players.reduce((prev, current) => 
      (prev.score > current.score) ? prev : current
    );
  }
}

module.exports = GameManager;