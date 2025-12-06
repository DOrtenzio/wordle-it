/* =========================================================
   WORDLE INFINITO ITA - VERSIONE ULTIMATE
   Animazioni fluide • Tastiera colorata • Multiplayer
   ========================================================= */

let word = "";
let attempts = 0;
const maxAttempts = 6;
let currentInput = "";
let hardMode = false;
let mustInclude = [];
let mustMatch = {};

// Variabili multiplayer
let multiplayer = false;
let currentPlayer = 1;
let player1Word = "";
let player2Word = "";
let player1Attempts = 0;
let player2Attempts = 0;
let gameEnded = false;

// Elementi DOM
let board;
let keyboard;
let toast;

/* =========================================================
   1. INIZIALIZZAZIONE GIOCO
========================================================= */

function pickRandomWord() {
  return WORDS_IT[Math.floor(Math.random() * WORDS_IT.length)];
}

function newGame() {
  attempts = 0;
  currentInput = "";
  mustInclude = [];
  mustMatch = {};
  word = pickRandomWord();
  
  multiplayer = false;
  gameEnded = false;
  
  document.getElementById("board").classList.remove("hidden");
  document.getElementById("multiplayer-container").classList.add("hidden");
  
  document.getElementById("multiplayer-btn").style.background = "";
  document.getElementById("hard-btn").style.background = "";
  
  // Inizializza board con animazione di entrata
  board.innerHTML = "";
  for (let i = 0; i < maxAttempts * 5; i++) {
    const tile = document.createElement("div");
    tile.classList.add("tile");
    tile.style.animationDelay = `${i * 0.05}s`;
    tile.classList.add("tile-entry");
    board.appendChild(tile);
  }
  
  // Reset tastiera con animazione
  const keys = document.querySelectorAll(".key");
  keys.forEach((k, i) => {
    k.classList.remove("correct", "present", "absent");
    k.style.animationDelay = `${i * 0.02}s`;
    k.classList.add("key-reset");
  });
  
  setTimeout(() => {
    document.querySelectorAll(".tile-entry").forEach(t => t.classList.remove("tile-entry"));
    document.querySelectorAll(".key-reset").forEach(k => k.classList.remove("key-reset"));
  }, 500);
  
  hidePopup();
  hideStats();
  console.log("Nuova partita! Parola:", word);
}

/* =========================================================
   2. MULTIPLAYER
========================================================= */

function initMultiplayer() {
  multiplayer = true;
  currentPlayer = 1;
  gameEnded = false;
  
  player1Word = pickRandomWord();
  do {
    player2Word = pickRandomWord();
  } while (player2Word === player1Word);
  
  player1Attempts = 0;
  player2Attempts = 0;
  
  document.getElementById("board").classList.add("hidden");
  document.getElementById("multiplayer-container").classList.remove("hidden");
  
  // Inizializza con animazioni
  initPlayerBoard("player1-board", player1Word);
  initPlayerBoard("player2-board", player2Word);
  
  updatePlayerTurn();
  currentInput = "";
  
  showToast("🎮 Modalità multiplayer attivata! Giocatore 1 inizia");
  console.log("Multiplayer: P1=", player1Word, "P2=", player2Word);
}

function initPlayerBoard(boardId, targetWord) {
  const board = document.getElementById(boardId);
  board.innerHTML = "";
  board.dataset.word = targetWord;
  
  for (let i = 0; i < maxAttempts * 5; i++) {
    const tile = document.createElement("div");
    tile.classList.add("tile");
    tile.style.animationDelay = `${i * 0.03}s`;
    tile.classList.add("tile-entry");
    board.appendChild(tile);
  }
}

function updatePlayerTurn() {
  document.getElementById("player1-indicator").classList.toggle("active", currentPlayer === 1);
  document.getElementById("player2-indicator").classList.toggle("active", currentPlayer === 2);
  document.getElementById("current-player").textContent = `Giocatore ${currentPlayer}`;
  
  document.getElementById("player1-container").classList.toggle("active", currentPlayer === 1);
  document.getElementById("player2-container").classList.toggle("active", currentPlayer === 2);
}

/* =========================================================
   3. TOAST / MESSAGGI
========================================================= */

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove("show");
  void toast.offsetWidth; // Trigger reflow
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1500);
}

/* =========================================================
   4. TASTIERA VIRTUALE CON COLORAZIONE
========================================================= */

const layout = ["qwertyuiop","asdfghjkl","↩zxcvbnm⌫"];

function createKeyboard() {
  layout.forEach(row => {
    const rowDiv = document.createElement("div");
    rowDiv.classList.add("key-row");
    row.split("").forEach(ch => {
      const key = document.createElement("button");
      key.classList.add("key");
      if(ch === "↩" || ch === "⌫") key.classList.add("special");
      key.textContent = ch;
      key.dataset.key = ch.toLowerCase();
      key.onclick = () => handleKey(ch);
      rowDiv.appendChild(key);
    });
    keyboard.appendChild(rowDiv);
  });
}

function handleKey(k) {
  if(k === "⌫") return removeLetter();
  if(k === "↩") return submitWord();
  if(/^[a-z]$/i.test(k)) addLetter(k);
}

/* =========================================================
   5. GESTIONE INPUT CON ANIMAZIONI FLUIDE
========================================================= */

document.addEventListener("keydown", e => {
  if (gameEnded && multiplayer) return;
  
  if(/^[a-z]$/i.test(e.key)) addLetter(e.key);
  if(e.key === "Backspace") removeLetter();
  if(e.key === "Enter") submitWord();
});

function addLetter(letter) {
  if(currentInput.length >= 5 || attempts >= maxAttempts) return;
  if(multiplayer && gameEnded) return;
  
  currentInput += letter.toLowerCase();
  
  if (multiplayer) {
    const currentBoardId = currentPlayer === 1 ? "player1-board" : "player2-board";
    const currentBoard = document.getElementById(currentBoardId);
    const currentAttempts = currentPlayer === 1 ? player1Attempts : player2Attempts;
    const tileIndexMP = currentAttempts * 5 + currentInput.length - 1;
    const tileMP = currentBoard.children[tileIndexMP];
    
    tileMP.textContent = letter.toUpperCase();
    tileMP.classList.add("pop");
    setTimeout(() => tileMP.classList.remove("pop"), 150);
  } else {
    const tileIndex = attempts * 5 + currentInput.length - 1;
    const tile = board.children[tileIndex];
    
    tile.textContent = letter.toUpperCase();
    tile.classList.add("pop");
    setTimeout(() => tile.classList.remove("pop"), 150);
  }
}

function removeLetter() {
  if(currentInput.length === 0) return;
  
  const idx = currentInput.length - 1;
  
  if (multiplayer) {
    const currentBoardId = currentPlayer === 1 ? "player1-board" : "player2-board";
    const currentBoard = document.getElementById(currentBoardId);
    const currentAttempts = currentPlayer === 1 ? player1Attempts : player2Attempts;
    const tileIndex = currentAttempts * 5 + idx;
    const tile = currentBoard.children[tileIndex];
    
    tile.classList.add("pop-reverse");
    setTimeout(() => {
      tile.textContent = "";
      tile.classList.remove("pop-reverse");
    }, 100);
  } else {
    const tileIndex = attempts * 5 + idx;
    const tile = board.children[tileIndex];
    
    tile.classList.add("pop-reverse");
    setTimeout(() => {
      tile.textContent = "";
      tile.classList.remove("pop-reverse");
    }, 100);
  }
  
  currentInput = currentInput.slice(0, -1);
}

/* =========================================================
   6. MODALITÀ DIFFICILE
========================================================= */

function validateHardMode(guess) {
  const uniqueMustInclude = [...new Set(mustInclude)];
  
  for(let l of uniqueMustInclude) {
    if(!guess.includes(l)) { 
      showToast(`⚠️ Devi includere: ${l.toUpperCase()}`); 
      return false;
    }
  }
  
  for(let pos in mustMatch) {
    if(guess[pos] !== mustMatch[pos]) { 
      showToast(`📍 ${mustMatch[pos].toUpperCase()} in posizione ${Number(pos)+1} è obbligatoria`); 
      return false;
    }
  }
  return true;
}

/* =========================================================
   7. VERIFICA PAROLA - SINGLEPLAYER
========================================================= */

function submitWord() {
  if(currentInput.length < 5) { 
    showToast("📏 Parola troppo corta"); 
    return;
  }
  
  if(!WORDS_IT.includes(currentInput)) { 
    showToast("❌ Parola non valida"); 
    return;
  }
  
  if (multiplayer) {
    checkMultiplayerWord(currentInput);
  } else {
    if(hardMode && !validateHardMode(currentInput)) return;
    checkWord(currentInput);
  }
}

function checkWord(guess) {
  const row = attempts * 5;
  let wordCopy = word.split("");
  let guessArr = guess.split("");
  
  // PRIMA: lettere corrette con animazione fluida
  for(let i = 0; i < 5; i++) {
    if(guessArr[i] === wordCopy[i]) {
      const tile = board.children[row + i];
      tile.dataset.letter = guessArr[i];
      
      // Animazione flip con ritardo scalare
      setTimeout(() => {
        tile.classList.add("flip");
        tile.style.setProperty('--flip-color', 'var(--correct)');
      }, i * 300);
      
      // Dopo il flip, applica il colore
      setTimeout(() => {
        tile.classList.add("correct");
        updateKeyboard(guessArr[i], "correct");
      }, i * 300 + 175);
      
      if (!mustInclude.includes(guessArr[i])) {
        mustInclude.push(guessArr[i]);
      }
      mustMatch[i] = guessArr[i];
      wordCopy[i] = null;
      guessArr[i] = "*";
    }
  }
  
  // SECONDA: lettere presenti e assenti
  setTimeout(() => {
    for(let i = 0; i < 5; i++) {
      const tile = board.children[row + i];
      if(tile.classList.contains("correct")) continue;
      
      const letter = guessArr[i];
      if(letter === "*") continue;
      
      tile.dataset.letter = letter;
      
      // Animazione flip per lettere presenti/assenti
      setTimeout(() => {
        tile.classList.add("flip");
        
        if(wordCopy.includes(letter)) {
          tile.style.setProperty('--flip-color', 'var(--present)');
          setTimeout(() => {
            tile.classList.add("present");
            updateKeyboard(letter, "present");
          }, 175);
          
          if (!mustInclude.includes(letter)) {
            mustInclude.push(letter);
          }
          
          const letterIndex = wordCopy.indexOf(letter);
          wordCopy[letterIndex] = null;
        } else {
          tile.style.setProperty('--flip-color', 'var(--absent)');
          setTimeout(() => {
            tile.classList.add("absent");
            updateKeyboard(letter, "absent");
          }, 175);
        }
      }, i * 100 + 200);
    }
    
    setTimeout(() => {
      finalizeAttempt(guess);
    }, 1000);
  }, 1500);
}

/* =========================================================
   8. VERIFICA PAROLA - MULTIPLAYER
========================================================= */

function checkMultiplayerWord(guess) {
  if(gameEnded) return;
  
  const currentWord = currentPlayer === 1 ? player1Word : player2Word;
  const boardId = currentPlayer === 1 ? "player1-board" : "player2-board";
  const currentAttempts = currentPlayer === 1 ? player1Attempts : player2Attempts;
  const board = document.getElementById(boardId);
  
  const row = currentAttempts * 5;
  let wordCopy = currentWord.split("");
  let guessArr = guess.split("");
  
  // Animazione fluida per tutte le lettere
  for(let i = 0; i < 5; i++) {
    const tile = board.children[row + i];
    tile.dataset.letter = guessArr[i];
    
    setTimeout(() => {
      tile.classList.add("flip");
      
      // Determina colore
      if(guessArr[i] === wordCopy[i]) {
        tile.style.setProperty('--flip-color', 'var(--correct)');
        setTimeout(() => tile.classList.add("correct"), 175);
        wordCopy[i] = null;
        guessArr[i] = "*";
      } else if(wordCopy.includes(guessArr[i])) {
        tile.style.setProperty('--flip-color', 'var(--present)');
        setTimeout(() => tile.classList.add("present"), 175);
        const idx = wordCopy.indexOf(guessArr[i]);
        wordCopy[idx] = null;
      } else {
        tile.style.setProperty('--flip-color', 'var(--absent)');
        setTimeout(() => tile.classList.add("absent"), 175);
      }
      
      // Aggiorna tastiera anche in multiplayer
      if(guessArr[i] !== "*") {
        updateKeyboard(guessArr[i], 
          guessArr[i] === currentWord[i] ? "correct" : 
          wordCopy.includes(guessArr[i]) ? "present" : "absent"
        );
      }
    }, i * 200);
  }
  
  // Verifica risultato dopo le animazioni
  setTimeout(() => {
    if(guess === currentWord) {
      endMultiplayerGame(true);
      return;
    }
    
    if(currentPlayer === 1) {
      player1Attempts++;
      if(player1Attempts >= maxAttempts) {
        if(player2Attempts >= maxAttempts) {
          endMultiplayerGame(false);
        } else {
          switchPlayer();
        }
      } else {
        resetInputForNextTurn();
      }
    } else {
      player2Attempts++;
      if(player2Attempts >= maxAttempts) {
        if(player1Attempts >= maxAttempts) {
          endMultiplayerGame(false);
        } else {
          switchPlayer();
        }
      } else {
        resetInputForNextTurn();
      }
    }
  }, 1500);
}

function switchPlayer() {
  currentPlayer = currentPlayer === 1 ? 2 : 1;
  updatePlayerTurn();
  resetInputForNextTurn();
  showToast(`🔄 Turno del Giocatore ${currentPlayer}`);
}

function resetInputForNextTurn() {
  currentInput = "";
}

function endMultiplayerGame(hasWinner) {
  gameEnded = true;
  
  const resultElement = document.getElementById("multiplayer-result");
  const wordsElement = document.getElementById("multiplayer-words");
  
  if(hasWinner) {
    resultElement.innerHTML = `🏆 <strong>Vittoria del Giocatore ${currentPlayer}!</strong>`;
    resultElement.style.color = "var(--correct)";
  } else {
    resultElement.innerHTML = `🤝 <strong>Pareggio!</strong> Nessun vincitore`;
    resultElement.style.color = "var(--present)";
  }
  
  document.getElementById("multiplayer-word1").textContent = player1Word.toUpperCase();
  document.getElementById("multiplayer-word2").textContent = player2Word.toUpperCase();
  
  resultElement.classList.remove("hidden");
  wordsElement.classList.remove("hidden");
  
  showToast(hasWinner ? `🎉 Giocatore ${currentPlayer} vince!` : "⚖️ Pareggio!");
}

/* =========================================================
   9. TASTIERA COLORATA CON ANIMAZIONI
========================================================= */

function updateKeyboard(letter, status) {
  const key = document.querySelector(`.key[data-key="${letter.toLowerCase()}"]`);
  if(!key) return;
  
  // Salva lo stato precedente per l'animazione
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
    if(status === "correct") {
      key.classList.add("correct");
    } else if(status === "present") {
      if(!prevState.correct) {
        key.classList.add("present");
      }
    } else if(status === "absent") {
      if(!prevState.correct && !prevState.present) {
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
   10. FINE PARTITA + STATISTICHE
========================================================= */

function finalizeAttempt(guess) {
  if(guess === word) {
    showToast("🎉 Ottimo! Hai indovinato!");
    addStats(true);
    setTimeout(() => showPopup(true), 500);
    return;
  }
  
  attempts++;
  if(attempts >= maxAttempts) {
    showToast(`😔 Peccato! La parola era: ${word.toUpperCase()}`);
    addStats(false);
    setTimeout(() => showPopup(false), 500);
  }
  
  currentInput = "";
}

/* ----------------- Statistiche ----------------- */

function loadStats() { 
  return JSON.parse(localStorage.getItem("wordle_stats") || 
    `{"games":0,"wins":0,"streak":0,"best":0}`);
}

function saveStats(s) { 
  localStorage.setItem("wordle_stats", JSON.stringify(s));
}

function addStats(won) {
  let s = loadStats(); 
  s.games++;
  
  if(won) { 
    s.wins++; 
    s.streak++; 
    if(s.streak > s.best) s.best = s.streak;
  } else {
    s.streak = 0;
  }
  
  saveStats(s);
}

/* ----------------- POPUP ----------------- */

function showPopup(win) {
  const overlay = document.getElementById("popup-overlay");
  document.getElementById("popup-title").textContent = win ? "🎉 Hai vinto!" : "😔 Hai perso!";
  document.getElementById("popup-word").textContent = "Parola: " + word.toUpperCase();
  overlay.classList.remove("hidden");
}

function hidePopup() { 
  document.getElementById("popup-overlay").classList.add("hidden"); 
}

/* ----------------- STATISTICHE ----------------- */

function showStats() {
  const overlay = document.getElementById("stats-overlay");
  const s = loadStats();

  document.getElementById("st-games").textContent = s.games;
  document.getElementById("st-wins").textContent = s.wins;
  document.getElementById("st-wr").textContent = s.games ? ((s.wins / s.games) * 100).toFixed(0) : 0;
  document.getElementById("st-streak").textContent = s.streak;
  document.getElementById("st-best").textContent = s.best;

  overlay.classList.remove("hidden");
}

function hideStats() {
  document.getElementById("stats-overlay").classList.add("hidden");
}

/* =========================================================
   11. AVVIO E EVENTI
========================================================= */

document.addEventListener("DOMContentLoaded", function() {
  board = document.getElementById("board");
  keyboard = document.getElementById("keyboard");
  toast = document.getElementById("toast");

  // Event listeners
  document.getElementById("popup-close").onclick = hidePopup;
  document.getElementById("stats-btn").onclick = showStats;
  document.getElementById("stats-close").onclick = hideStats;
  
  document.getElementById("stats-overlay").onclick = function(e) {
    if (e.target === this) hideStats();
  };
  
  // Tema
  document.getElementById("theme-btn").onclick = () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("wordle_theme", 
      document.body.classList.contains("dark") ? "dark" : "light");
  };
  
  // Carica tema
  const savedTheme = localStorage.getItem("wordle_theme");
  if(savedTheme === "dark") document.body.classList.add("dark");
  
  // Hard mode
  document.getElementById("hard-btn").onclick = () => {
    hardMode = !hardMode;
    const btn = document.getElementById("hard-btn");
    if(hardMode) {
      showToast("💀 Modalità difficile attivata");
      btn.style.background = "var(--present)";
      btn.style.color = "white";
    } else {
      showToast("😊 Modalità normale");
      btn.style.background = "";
      btn.style.color = "";
    }
  };
  
  // Nuova partita
  document.getElementById("new-btn").onclick = () => {
    if(multiplayer) {
      multiplayer = false;
      document.getElementById("multiplayer-btn").style.background = "";
      document.getElementById("multiplayer-container").classList.add("hidden");
      document.getElementById("board").classList.remove("hidden");
    }
    newGame();
  };
  
  // Multiplayer
  document.getElementById("multiplayer-btn").onclick = () => {
    if(multiplayer) {
      multiplayer = false;
      document.getElementById("multiplayer-btn").style.background = "";
      document.getElementById("multiplayer-container").classList.add("hidden");
      document.getElementById("board").classList.remove("hidden");
      newGame();
    } else {
      initMultiplayer();
      const btn = document.getElementById("multiplayer-btn");
      btn.style.background = "var(--correct)";
      btn.style.color = "white";
    }
  };
  
  // Inizializza
  createKeyboard();
  newGame();
});