/* =========================================================
   WORDLE SINGLEPLAYER - VERSIONE COMPLETA
   Tastiera • Animazioni • Statistiche • Tema • Modalità difficile
   ========================================================= */

class SingleplayerGame {
  constructor() {
    this.word = "";                 // Parola da indovinare
    this.attempts = 0;              // Tentativi effettuati
    this.maxAttempts = 6;           // Massimo tentativi
    this.currentInput = "";         // Input corrente
    this.hardMode = false;          // Modalità difficile
    this.mustInclude = [];          // Lettere da includere (hard mode)
    this.mustMatch = {};            // Posizioni obbligatorie (hard mode)
    
    this.board = null;
    this.keyboard = null;
    this.toast = null;
    
    this.initialize();
  }
  
  initialize() {
    // Inizializza elementi DOM
    this.board = document.getElementById("sp-board");
    this.keyboard = document.getElementById("sp-keyboard");
    this.toast = document.getElementById("sp-toast");
    
    // Inizializza il gioco
    this.createKeyboard();
    this.newGame();
    this.bindEvents();
    
    // Carica tema
    this.loadTheme();
  }
  
  /* =========================================================
     1. INIZIALIZZAZIONE GIOCO
  ========================================================= */
  
  pickRandomWord() {
    return WORDS_IT[Math.floor(Math.random() * WORDS_IT.length)];
  }
  
  newGame() {
    this.attempts = 0;
    this.currentInput = "";
    this.mustInclude = [];
    this.mustMatch = {};
    this.word = this.pickRandomWord();
    
    // Inizializza board
    this.board.innerHTML = "";
    for (let i = 0; i < this.maxAttempts * 5; i++) {
      const tile = document.createElement("div");
      tile.classList.add("board-cell");
      this.board.appendChild(tile);
    }
    
    // Reset tastiera
    [...document.querySelectorAll("#sp-keyboard .key")].forEach(k => {
      k.classList.remove("correct", "present", "absent");
    });
    
    // Reset toast
    this.hideToast();
    
    // Reset bottoni
    const submitBtn = document.getElementById("btn-submit-word");
    if (submitBtn) submitBtn.disabled = false;
  }
  
  /* =========================================================
     2. TOAST / MESSAGGI
  ========================================================= */
  
  showToast(msg, type = "info") {
    this.toast.textContent = msg;
    this.toast.className = "toast";
    
    // Colori in base al tipo
    if (type === "error") this.toast.style.background = "#dc3545";
    else if (type === "success") this.toast.style.background = "#28a745";
    else if (type === "warning") this.toast.style.background = "#ffc107";
    else this.toast.style.background = "#17a2b8";
    
    this.toast.classList.add("show");
    
    setTimeout(() => {
      this.toast.classList.remove("show");
    }, 1500);
  }
  
  hideToast() {
    this.toast.classList.remove("show");
  }
  
  /* =========================================================
     3. TASTIERA VIRTUALE
  ========================================================= */
  
  createKeyboard() {
    const layout = ["qwertyuiop", "asdfghjkl", "↩zxcvbnm⌫"];
    
    layout.forEach(row => {
      const rowDiv = document.createElement("div");
      rowDiv.classList.add("keyboard-row");
      
      row.split("").forEach(ch => {
        const key = document.createElement("button");
        key.classList.add("key");
        key.textContent = ch;
        key.dataset.key = ch.toLowerCase();
        
        if (ch === "↩" || ch === "⌫") {
          key.classList.add("wide");
        }
        
        key.addEventListener("click", () => this.handleKey(ch));
        rowDiv.appendChild(key);
      });
      
      this.keyboard.appendChild(rowDiv);
    });
  }
  
  handleKey(k) {
    if (k === "⌫") return this.removeLetter();
    if (k === "↩") return this.submitWord();
    if (/^[a-z]$/i.test(k)) this.addLetter(k);
  }
  
  /* =========================================================
     4. GESTIONE INPUT E TASTIERA FISICA
  ========================================================= */
  
  bindEvents() {
    // Tastiera fisica
    document.addEventListener("keydown", (e) => this.handlePhysicalKeyboard(e));
    
    // Bottoni tema e controllo
    document.getElementById("btn-sp-theme").addEventListener("click", () => this.toggleTheme());
    document.getElementById("btn-sp-stats").addEventListener("click", () => this.showStats());
    document.getElementById("btn-sp-new").addEventListener("click", () => this.newGame());
    document.getElementById("btn-sp-back").addEventListener("click", () => this.returnToMenu());
    
    // Bottoni gioco (se esistono)
    const submitBtn = document.getElementById("btn-submit-word");
    const clearBtn = document.getElementById("btn-clear-word");
    
    if (submitBtn) {
      submitBtn.addEventListener("click", () => this.submitWord());
    }
    
    if (clearBtn) {
      clearBtn.addEventListener("click", () => this.clearWord());
    }
  }
  
  handlePhysicalKeyboard(e) {
    // Solo se siamo nella schermata singleplayer
    if (!document.getElementById("singleplayer-screen").classList.contains("active")) return;
    
    if (/^[a-z]$/i.test(e.key)) this.addLetter(e.key);
    if (e.key === "Backspace") this.removeLetter();
    if (e.key === "Enter") this.submitWord();
  }
  
  addLetter(letter) {
    if (this.currentInput.length >= 5 || this.attempts >= this.maxAttempts) return;
    
    this.currentInput += letter.toLowerCase();
    const tileIndex = this.attempts * 5 + this.currentInput.length - 1;
    const tile = this.board.children[tileIndex];
    
    tile.textContent = letter.toUpperCase();
    tile.classList.add("filled");
    tile.classList.add("pop");
    
    setTimeout(() => tile.classList.remove("pop"), 150);
  }
  
  removeLetter() {
    if (this.currentInput.length === 0) return;
    
    const idx = this.currentInput.length - 1;
    const tileIndex = this.attempts * 5 + idx;
    const tile = this.board.children[tileIndex];
    
    tile.classList.add("pop-reverse");
    
    setTimeout(() => {
      tile.textContent = "";
      tile.classList.remove("filled", "pop-reverse");
    }, 100);
    
    this.currentInput = this.currentInput.slice(0, -1);
  }
  
  clearWord() {
    if (this.currentInput.length === 0) return;
    
    const rowStart = this.attempts * 5;
    
    for (let i = 0; i < 5; i++) {
      const tile = this.board.children[rowStart + i];
      if (tile.textContent) {
        tile.textContent = "";
        tile.classList.remove("filled");
      }
    }
    
    this.currentInput = "";
  }
  
  /* =========================================================
     5. MODALITÀ DIFFICILE
  ========================================================= */
  
  validateHardMode(guess) {
    // Rimuovi duplicati
    const uniqueMustInclude = [...new Set(this.mustInclude)];
    
    for (let l of uniqueMustInclude) {
      if (!guess.includes(l)) {
        this.showToast(`Devi includere: ${l.toUpperCase()}`, "warning");
        return false;
      }
    }
    
    for (let pos in this.mustMatch) {
      if (guess[pos] !== this.mustMatch[pos]) {
        this.showToast(`${this.mustMatch[pos].toUpperCase()} in posizione ${Number(pos) + 1} è obbligatoria`, "warning");
        return false;
      }
    }
    
    return true;
  }
  
  /* =========================================================
     6. VERIFICA PAROLA
  ========================================================= */
  
  submitWord() {
    if (this.currentInput.length < 5) {
      this.showToast("Parola troppo corta", "error");
      return;
    }
    
    if (!WORDS_IT.includes(this.currentInput)) {
      this.showToast("Parola non valida", "error");
      return;
    }
    
    if (this.hardMode && !this.validateHardMode(this.currentInput)) {
      return;
    }
    
    this.checkWord(this.currentInput);
  }
  
  checkWord(guess) {
    const row = this.attempts * 5;
    let wordCopy = this.word.split("");
    let guessArr = guess.split("");
    
    // PRIMA PASSATA: lettere corrette (verde)
    for (let i = 0; i < 5; i++) {
      if (guessArr[i] === wordCopy[i]) {
        const tile = this.board.children[row + i];
        
        setTimeout(() => {
          tile.classList.add("flip");
          tile.style.setProperty('--flip-color', 'var(--correct)');
        }, i * 300);
        
        setTimeout(() => {
          tile.classList.add("correct");
          this.updateKeyboard(guessArr[i], "correct");
        }, i * 300 + 175);
        
        // Aggiorna hard mode
        if (!this.mustInclude.includes(guessArr[i])) {
          this.mustInclude.push(guessArr[i]);
        }
        this.mustMatch[i] = guessArr[i];
        
        wordCopy[i] = null;
        guessArr[i] = "*";
      }
    }
    
    // SECONDA PASSATA: lettere presenti (giallo) e assenti (grigio)
    setTimeout(() => {
      for (let i = 0; i < 5; i++) {
        const tile = this.board.children[row + i];
        
        // Salta se già corretta
        if (tile.classList.contains("correct")) continue;
        
        const letter = guessArr[i];
        if (letter === "*") continue; // Già gestita
        
        tile.classList.add("flip");
        
        if (wordCopy.includes(letter)) {
          // Lettera presente ma in posizione sbagliata
          tile.style.setProperty('--flip-color', 'var(--present)');
          
          setTimeout(() => {
            tile.classList.add("present");
            this.updateKeyboard(letter, "present");
          }, 175);
          
          // Aggiorna hard mode
          if (!this.mustInclude.includes(letter)) {
            this.mustInclude.push(letter);
          }
          
          // Rimuovi una occorrenza della lettera
          const letterIndex = wordCopy.indexOf(letter);
          wordCopy[letterIndex] = null;
        } else {
          // Lettera assente
          tile.style.setProperty('--flip-color', 'var(--absent)');
          
          setTimeout(() => {
            tile.classList.add("absent");
            this.updateKeyboard(letter, "absent");
          }, 175);
        }
      }
      
      setTimeout(() => {
        this.finalizeAttempt(guess);
      }, 1000);
    }, 1500);
  }
  
  /* =========================================================
     7. AGGIORNAMENTO TASTIERA COLORATA
  ========================================================= */
  
  updateKeyboard(letter, status) {
    const key = document.querySelector(`#sp-keyboard .key[data-key="${letter.toLowerCase()}"]`);
    if (!key) return;
    
    // Salva lo stato precedente
    const prevState = {
      correct: key.classList.contains("correct"),
      present: key.classList.contains("present"),
      absent: key.classList.contains("absent")
    };
    
    // Rimuovi tutte le classi di stato
    key.classList.remove("correct", "present", "absent");
    
    // Aggiungi animazione di transizione
    key.classList.add("key-transition");
    
    // Gerarchia: corretto > presente > assente
    setTimeout(() => {
      if (status === "correct") {
        key.classList.add("correct");
      } else if (status === "present") {
        if (!prevState.correct) {
          key.classList.add("present");
        }
      } else if (status === "absent") {
        if (!prevState.correct && !prevState.present) {
          key.classList.add("absent");
        }
      }
      
      // Rimuovi la classe di transizione dopo l'animazione
      setTimeout(() => {
        key.classList.remove("key-transition");
      }, 300);
    }, 50);
  }
  
  /* =========================================================
     8. FINE PARTITA + STATISTICHE
  ========================================================= */
  
  finalizeAttempt(guess) {
    if (guess === this.word) {
      this.showToast("🎉 Ottimo! Hai indovinato!", "success");
      this.addStats(true);
      this.showPopup(true);
      return;
    }
    
    this.attempts++;
    
    if (this.attempts >= this.maxAttempts) {
      this.showToast(`😔 Peccato! La parola era: ${this.word.toUpperCase()}`, "warning");
      this.addStats(false);
      this.showPopup(false);
    }
    
    this.currentInput = "";
  }
  
  /* ----------------- Statistiche ----------------- */
  
  loadStats() {
    const defaultStats = {
      games: 0,
      wins: 0,
      streak: 0,
      best: 0,
      distribution: [0, 0, 0, 0, 0, 0] // Vittorie per numero di tentativi
    };
    
    try {
      return JSON.parse(localStorage.getItem("wordle_single_stats") || JSON.stringify(defaultStats));
    } catch {
      return defaultStats;
    }
  }
  
  saveStats(stats) {
    localStorage.setItem("wordle_single_stats", JSON.stringify(stats));
  }
  
  addStats(won) {
    let stats = this.loadStats();
    stats.games++;
    
    if (won) {
      stats.wins++;
      stats.streak++;
      
      // Aggiorna distribuzione vittorie per tentativi
      if (this.attempts >= 1 && this.attempts <= 6) {
        stats.distribution[this.attempts - 1]++;
      }
      
      if (stats.streak > stats.best) {
        stats.best = stats.streak;
      }
    } else {
      stats.streak = 0;
    }
    
    this.saveStats(stats);
  }
  
  showStats() {
    const stats = this.loadStats();
    const winRate = stats.games > 0 ? ((stats.wins / stats.games) * 100).toFixed(0) : 0;
    
    // Crea o aggiorna il modal delle statistiche
    let modal = document.getElementById("stats-modal");
    
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "stats-modal";
      modal.className = "modal";
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h3><i class="fas fa-chart-line"></i> Statistiche Singleplayer</h3>
            <button class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <div class="stats-grid">
              <div class="stat-box">
                <div class="stat-value">${stats.games}</div>
                <div class="stat-label">Partite</div>
              </div>
              <div class="stat-box">
                <div class="stat-value">${winRate}%</div>
                <div class="stat-label">Vittorie</div>
              </div>
              <div class="stat-box">
                <div class="stat-value">${stats.streak}</div>
                <div class="stat-label">Streak</div>
              </div>
              <div class="stat-box">
                <div class="stat-value">${stats.best}</div>
                <div class="stat-label">Record</div>
              </div>
            </div>
            
            <div class="distribution">
              <h4>Distribuzione vittorie:</h4>
              ${stats.distribution.map((count, index) => `
                <div class="dist-row">
                  <span class="dist-attempt">${index + 1}</span>
                  <div class="dist-bar">
                    <div class="dist-fill" style="width: ${stats.wins > 0 ? (count / Math.max(...stats.distribution)) * 100 : 0}%"></div>
                  </div>
                  <span class="dist-count">${count}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Aggiungi event listener per chiudere
      modal.querySelector(".modal-close").addEventListener("click", () => {
        modal.classList.remove("active");
      });
      
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          modal.classList.remove("active");
        }
      });
    }
    
    modal.classList.add("active");
  }
  
  /* ----------------- Popup Fine Partita ----------------- */
  
  showPopup(win) {
    // Crea o aggiorna il popup
    let popup = document.getElementById("sp-popup");
    
    if (!popup) {
      popup = document.createElement("div");
      popup.id = "sp-popup";
      popup.className = "modal";
      
      document.body.appendChild(popup);
    }
    
    popup.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>${win ? "🎉 Hai vinto!" : "😔 Hai perso!"}</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <p>La parola era: <strong>${this.word.toUpperCase()}</strong></p>
          <p>Tentativi usati: <strong>${win ? this.attempts + 1 : "X"}/6</strong></p>
          
          <div class="popup-controls">
            <button id="sp-popup-new" class="btn-large btn-primary">
              <i class="fas fa-redo"></i> Nuova Partita
            </button>
            <button id="sp-popup-share" class="btn-large">
              <i class="fas fa-share"></i> Condividi
            </button>
          </div>
        </div>
      </div>
    `;
    
    popup.classList.add("active");
    
    // Aggiungi event listeners
    popup.querySelector(".modal-close").addEventListener("click", () => {
      popup.classList.remove("active");
    });
    
    popup.addEventListener("click", (e) => {
      if (e.target === popup) {
        popup.classList.remove("active");
      }
    });
    
    popup.querySelector("#sp-popup-new").addEventListener("click", () => {
      popup.classList.remove("active");
      this.newGame();
    });
    
    popup.querySelector("#sp-popup-share").addEventListener("click", () => {
      this.shareResult(win);
    });
  }
  
  shareResult(win) {
    const attemptsText = win ? `${this.attempts + 1}/6` : "X/6";
    const text = `Wordle ITA ${win ? "🎉" : "😔"}\nTentativi: ${attemptsText}\nParola: ${this.word.toUpperCase()}\n\nGioca su: ${window.location.href}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Wordle ITA',
        text: text,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(text)
        .then(() => this.showToast("Risultato copiato negli appunti!", "success"))
        .catch(() => this.showToast("Errore nella copia", "error"));
    }
  }
  
  /* =========================================================
     9. GESTIONE TEMA
  ========================================================= */
  
  loadTheme() {
    const savedTheme = localStorage.getItem("wordle_theme");
    if (savedTheme === "dark") {
      document.body.classList.add("dark");
      document.getElementById("btn-sp-theme").textContent = "☀️";
    } else {
      document.getElementById("btn-sp-theme").textContent = "🌓";
    }
  }
  
  toggleTheme() {
    const isDark = document.body.classList.toggle("dark");
    localStorage.setItem("wordle_theme", isDark ? "dark" : "light");
    
    const themeBtn = document.getElementById("btn-sp-theme");
    themeBtn.textContent = isDark ? "☀️" : "🌓";
    themeBtn.classList.add("pop");
    
    setTimeout(() => {
      themeBtn.classList.remove("pop");
    }, 150);
  }
  
  /* =========================================================
     10. UTILITY E NAVIGAZIONE
  ========================================================= */
  
  returnToMenu() {
    // Mostra schermata iniziale
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
    });
    document.getElementById('start-screen').classList.add('active');
    
    // Pulisci eventuali popup aperti
    const popup = document.getElementById("sp-popup");
    if (popup) popup.classList.remove("active");
    
    const statsModal = document.getElementById("stats-modal");
    if (statsModal) statsModal.classList.remove("active");
  }
  
  /* =========================================================
     11. INIZIALIZZAZIONE GRAFICA BOARD
  ========================================================= */
  
  initializeBoard() {
    this.board.innerHTML = "";
    
    // Crea una griglia 6x5
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 5; col++) {
        const cell = document.createElement("div");
        cell.className = "board-cell";
        cell.dataset.row = row;
        cell.dataset.col = col;
        this.board.appendChild(cell);
      }
    }
    
    // Aggiungi animazione di entrata
    const cells = this.board.querySelectorAll('.board-cell');
    cells.forEach((cell, index) => {
      cell.style.animationDelay = `${index * 0.02}s`;
      cell.classList.add('tile-entry');
    });
    
    setTimeout(() => {
      cells.forEach(cell => cell.classList.remove('tile-entry'));
    }, 500);
  }
  
  /* =========================================================
     12. RESET COMPLETO
  ========================================================= */
  
  fullReset() {
    this.newGame();
    
    // Reset completo della tastiera
    const keys = document.querySelectorAll("#sp-keyboard .key");
    keys.forEach((key, index) => {
      key.classList.remove("correct", "present", "absent", "key-transition");
      key.style.animationDelay = `${index * 0.01}s`;
      key.classList.add("key-reset");
    });
    
    setTimeout(() => {
      keys.forEach(key => key.classList.remove("key-reset"));
    }, 500);
    
    this.showToast("Nuova partita iniziata!", "info");
  }
}

// Stili aggiuntivi per le statistiche (da aggiungere a game.css o style.css)
const additionalStyles = `
/* Statistiche modal */
.distribution {
  margin-top: 25px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}

.dist-row {
  display: flex;
  align-items: center;
  margin: 8px 0;
}

.dist-attempt {
  width: 30px;
  font-weight: bold;
  text-align: center;
}

.dist-bar {
  flex: 1;
  height: 24px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  margin: 0 15px;
  overflow: hidden;
}

.dist-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-secondary), var(--accent-primary));
  border-radius: 4px;
  transition: width 1s ease;
}

.dist-count {
  width: 30px;
  text-align: right;
  font-weight: bold;
}

.popup-controls {
  display: flex;
  gap: 15px;
  margin-top: 25px;
}

.popup-controls .btn-large {
  flex: 1;
}

/* Singleplayer specific */
.sp-game {
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
}

.sp-board {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  margin: 30px auto;
  max-width: 400px;
}

.sp-keyboard {
  max-width: 500px;
  margin: 0 auto;
}

.sp-toast {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%) translateY(100px);
  background: var(--text-primary);
  color: var(--bg-primary);
  padding: 15px 25px;
  border-radius: 12px;
  box-shadow: 0 8px 25px rgba(0,0,0,0.3);
  z-index: 1001;
  opacity: 0;
  transition: all 0.3s ease;
}

.sp-toast.show {
  transform: translateX(-50%) translateY(0);
  opacity: 1;
}

.sp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: var(--bg-secondary);
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.sp-controls {
  display: flex;
  gap: 10px;
}
`;

// Aggiungi gli stili al documento
if (!document.querySelector('#singleplayer-styles')) {
  const styleEl = document.createElement('style');
  styleEl.id = 'singleplayer-styles';
  styleEl.textContent = additionalStyles;
  document.head.appendChild(styleEl);
}

// Esponi la classe globalmente
window.SingleplayerGame = SingleplayerGame;

// Inizializza automaticamente quando la schermata singleplayer diventa attiva
document.addEventListener('DOMContentLoaded', function() {
  // Osserva i cambiamenti nelle schermate
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.attributeName === 'class') {
        const singleplayerScreen = document.getElementById('singleplayer-screen');
        if (singleplayerScreen && singleplayerScreen.classList.contains('active')) {
          if (!window.singleplayerInstance) {
            window.singleplayerInstance = new SingleplayerGame();
          }
        }
      }
    });
  });
  
  // Osserva la schermata singleplayer
  const singleplayerScreen = document.getElementById('singleplayer-screen');
  if (singleplayerScreen) {
    observer.observe(singleplayerScreen, { attributes: true });
  }
});

// Funzione globale per avviare da online.js
window.startSingleplayerGame = function() {
  if (!window.singleplayerInstance) {
    window.singleplayerInstance = new SingleplayerGame();
  }
  return window.singleplayerInstance;
};