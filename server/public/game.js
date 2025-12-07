class GameEngine {
  constructor(wordList = []) {
    this.words = wordList;
    this.currentWord = null;
    this.attempts = [];
    this.guessedLetters = new Set();
    this.correctLetters = new Set();
    this.wrongLetters = new Set();
    this.gameOver = false;
    this.won = false;
    this.maxAttempts = 6;
  }

  startNewGame(word = null) {
    this.currentWord = word || this.getRandomWord();
    this.attempts = [];
    this.guessedLetters = new Set();
    this.correctLetters = new Set();
    this.wrongLetters = new Set();
    this.gameOver = false;
    this.won = false;
    return this.currentWord;
  }

  getRandomWord() {
    if (this.words.length === 0) {
      throw new error('Lista di parole vuota');
    }
    return this.words[Math.floor(Math.random() * this.words.length)].toUpperCase();
  }

  checkGuess(guess) {
    guess = guess.toUpperCase();

    // Validazione
    if (!guess || guess.length !== 5) {
      return { valid: false, message: 'La parola deve avere 5 lettere' };
    }

    if (!this.isValidWord(guess)) {
      return { valid: false, message: 'Parola non trovata nel dizionario' };
    }

    if (this.attempts.includes(guess)) {
      return { valid: false, message: 'Hai già provato questa parola' };
    }

    // Analizza il guess
    const result = this.analyzeGuess(guess);
    this.attempts.push(guess);

    // Aggiorna le lettere
    for (let i = 0; i < 5; i++) {
      const letter = guess[i];
      this.guessedLetters.add(letter);

      if (result[i].status === 'correct') {
        this.correctLetters.add(letter);
      } else if (result[i].status === 'wrong') {
        this.wrongLetters.add(letter);
      }
    }

    // Controlla fine gioco
    if (guess === this.currentWord) {
      this.gameOver = true;
      this.won = true;
    } else if (this.attempts.length >= this.maxAttempts) {
      this.gameOver = true;
      this.won = false;
    }

    return {
      valid: true,
      result,
      attempts: this.attempts.length,
      maxAttempts: this.maxAttempts,
      gameOver: this.gameOver,
      won: this.won,
      word: this.won ? this.currentWord : null
    };
  }

  analyzeGuess(guess) {
    const result = [];
    const wordChars = this.currentWord.split('');
    const guessChars = guess.split('');
    const used = new Set();

    // Prima passata: cerca le lettere corrette
    for (let i = 0; i < 5; i++) {
      if (guessChars[i] === wordChars[i]) {
        result[i] = { letter: guessChars[i], status: 'correct' };
        used.add(i);
      } else {
        result[i] = null;
      }
    }

    // Seconda passata: cerca le lettere presenti
    for (let i = 0; i < 5; i++) {
      if (result[i] === null) {
        const letter = guessChars[i];
        let found = false;

        for (let j = 0; j < 5; j++) {
          if (
            !used.has(j) &&
            wordChars[j] === letter &&
            guessChars[j] !== letter
          ) {
            result[i] = { letter, status: 'wrong-position' };
            used.add(j);
            found = true;
            break;
          }
        }

        if (!found) {
          result[i] = { letter, status: 'absent' };
        }
      }
    }

    return result;
  }

  isValidWord(guess) {
    if (this.words.length === 0) return true; // Se non abbiamo la lista, accetta tutto
    return this.words.some(w => w.toUpperCase() === guess);
  }

  getGameState() {
    return {
      attempts: this.attempts,
      guessedLetters: Array.from(this.guessedLetters),
      correctLetters: Array.from(this.correctLetters),
      wrongLetters: Array.from(this.wrongLetters),
      gameOver: this.gameOver,
      won: this.won,
      attemptsLeft: this.maxAttempts - this.attempts.length,
      currentWord: this.won ? this.currentWord : null
    };
  }

  getScore() {
    if (!this.won) return 0;
    const baseScore = 1000;
    const attemptPenalty = (this.attempts.length - 1) * 100;
    return Math.max(baseScore - attemptPenalty, 100);
  }
}

// Esporta per Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GameEngine;
}
