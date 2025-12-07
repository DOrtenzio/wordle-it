class MinigamesManager {
  constructor() {
    this.currentGame = null;
    this.gameData = this.loadGameData();
    this.currentScores = {};
    this.activeGameInstance = null;
    
    this.init();
  }

  showToast(message, type = 'info') {
    // Crea toast se non esiste
    let toast = document.getElementById('minigame-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'minigame-toast';
        toast.className = 'minigame-toast';
        document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.className = 'minigame-toast';
    
    if (type === 'success') {
        toast.style.background = 'linear-gradient(135deg, #28a745, #20c997)';
    } else if (type === 'error') {
        toast.style.background = 'linear-gradient(135deg, #dc3545, #e83e8c)';
    } else if (type === 'warning') {
        toast.style.background = 'linear-gradient(135deg, #ffc107, #fd7e14)';
    } else {
        toast.style.background = 'linear-gradient(135deg, #17a2b8, #20c997)';
    }
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
    }
  
  init() {
    this.bindEvents();
    this.updateStats();
    this.startDuckAnimation();
    this.setupSecretTriggers();
  }
  
  loadGameData() {
    const defaultData = {
      stats: {
        coins: 0,
        stars: 0,
        gamesPlayed: 0,
        totalTime: 0,
        wins: 0
      },
      games: {
        angle: { bestScore: 0, plays: 0 },
        'math-memory': { bestScore: 0, plays: 0 },
        'quiz-italiano': { bestScore: 0, plays: 0 },
        'typing-speed': { bestWPM: 0, plays: 0 },
        'word-puzzle': { completed: 0, plays: 0 }
      }
    };
    
    try {
      return JSON.parse(localStorage.getItem('minigames_data')) || defaultData;
    } catch {
      return defaultData;
    }
  }
  
  saveGameData() {
    localStorage.setItem('minigames_data', JSON.stringify(this.gameData));
  }
  
  bindEvents() {
    // Bottone ritorno al menu principale
    document.getElementById('back-to-main').addEventListener('click', () => {
      window.location.href = 'index.html';
    });
    
    // Bottoni play
    document.querySelectorAll('.play-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const gameCard = e.target.closest('.game-card');
        const gameType = gameCard.dataset.game;
        this.startGame(gameType);
      });
    });
    
    // Chiusura modale
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => {
        this.closeModal();
      });
    });
    
    // Retry e Menu
    document.addEventListener('click', (e) => {
      if (e.target.closest('.retry-btn')) {
        this.restartGame();
      }
      if (e.target.closest('.menu-btn')) {
        this.closeResults();
      }
    });
  }
  
  startGame(gameType) {
    this.currentGame = gameType;
    
    switch(gameType) {
      case 'angle':
        this.startAngleGame();
        break;
      case 'math-memory':
        this.startMathMemory();
        break;
      case 'quiz-italiano':
        this.startQuizItaliano();
        break;
      case 'typing-speed':
        this.startTypingSpeed();
        break;
      case 'word-puzzle':
        this.startWordPuzzle();
        break;
    }
    
    this.showGameModal();
  }
  
  /* =========================================================
     1. GIOCO: INDOVINA L'ANGOLO
  ========================================================= */
startAngleGame() {
  const modalContent = document.querySelector('.game-modal .modal-content');
  
  const targetAngle = Math.floor(Math.random() * 361); // 0-360 inclusi
  let guess = 180;
  let attempts = 0;
  const maxAttempts = 3;
  
  modalContent.innerHTML = `
    <div class="angle-game">
      <h2><i class="fas fa-shapes"></i> Indovina l'Angolo - Modalità Difficile</h2>
      <p class="game-description">Inserisci l'esatto valore in gradi (da 0° a 360°). Solo ${maxAttempts} tentativi!</p>
      
      <div class="angle-visualization">
        <div class="angle-svg-container" id="angle-svg-container">
          <svg width="300" height="300" viewBox="0 0 300 300" id="angle-svg">
            <!-- Cerchio di fondo -->
            <circle cx="150" cy="150" r="100" fill="none" stroke="var(--border-color)" stroke-width="2"/>
            
            <!-- Linee di riferimento (0°, 90°, 180°, 270°) -->
            <line x1="150" y1="50" x2="150" y2="250" stroke="var(--border-color)" stroke-width="1" stroke-dasharray="5,5"/>
            <line x1="50" y1="150" x2="250" y2="150" stroke="var(--border-color)" stroke-width="1" stroke-dasharray="5,5"/>
            
            <!-- Settore angolare (arco dell'angolo) -->
            <path id="angle-arc" d="" fill="rgba(106, 170, 100, 0.1)" stroke="var(--accent-primary)" stroke-width="2"/>
            
            <!-- Raggio 1 (linea fissa orizzontale a destra) -->
            <line id="radius-1" x1="150" y1="150" x2="250" y2="150" stroke="var(--accent-secondary)" stroke-width="3"/>
            
            <!-- Raggio 2 (linea dell'angolo da indovinare) -->
            <line id="radius-2" x1="150" y1="150" x2="" y2="" stroke="var(--accent-primary)" stroke-width="3"/>
            
            <!-- Punto centrale -->
            <circle cx="150" cy="150" r="5" fill="var(--text-primary)" stroke="white" stroke-width="2"/>
            
            <!-- Etichette gradi -->
            <text x="250" y="155" text-anchor="middle" fill="var(--text-secondary)" font-size="12">0°</text>
            <text x="150" y="45" text-anchor="middle" fill="var(--text-secondary)" font-size="12">90°</text>
            <text x="50" y="155" text-anchor="middle" fill="var(--text-secondary)" font-size="12">180°</text>
            <text x="150" y="255" text-anchor="middle" fill="var(--text-secondary)" font-size="12">270°</text>
          </svg>
        </div>
        
        <div class="angle-info">
          <div class="angle-label">
            <i class="fas fa-eye"></i> Angolo da indovinare: <span class="angle-value-hidden">?</span>°
          </div>
          <div class="attempts-counter">
            <i class="fas fa-bullseye"></i> Tentativi: <span id="attempts-count">${attempts}/${maxAttempts}</span>
          </div>
          <div class="angle-hint">
            <i class="fas fa-lightbulb"></i> Raggio verde: angolo da indovinare<br>
            <i class="fas fa-lightbulb"></i> Raggio giallo: riferimento 0°
          </div>
        </div>
      </div>
      
      <div class="angle-input-section">
        <div class="input-instruction">
          <i class="fas fa-keyboard"></i> Inserisci il valore esatto in gradi:
        </div>
        
        <div class="angle-input-container">
          <div class="input-with-buttons">
            <input 
              type="number" 
              id="angle-input" 
              min="0" 
              max="360" 
              step="1" 
              value="180" 
              placeholder="Es: 90"
              class="angle-input"
            >
            <div class="quick-buttons">
              <button class="quick-btn" data-value="0">0°</button>
              <button class="quick-btn" data-value="45">45°</button>
              <button class="quick-btn" data-value="90">90°</button>
              <button class="quick-btn" data-value="135">135°</button>
              <button class="quick-btn" data-value="180">180°</button>
              <button class="quick-btn" data-value="225">225°</button>
              <button class="quick-btn" data-value="270">270°</button>
              <button class="quick-btn" data-value="315">315°</button>
              <button class="quick-btn" data-value="360">360°</button>
            </div>
          </div>
          
          <div class="angle-display" id="angle-display">Inserisci un valore...</div>
          
          <div class="feedback-message" id="feedback-message">
            <i class="fas fa-info-circle"></i> Inserisci un numero tra 0 e 360
          </div>
        </div>
        
        <div class="angle-guess-history" id="angle-guess-history">
          <!-- Cronologia tentativi apparirà qui -->
        </div>
      </div>
      
      <div class="angle-buttons">
        <button id="submit-angle" class="play-btn">
          <i class="fas fa-paper-plane"></i> Prova
        </button>
        <button id="hint-angle" class="play-btn">
          <i class="fas fa-question-circle"></i> Aiuto (${maxAttempts - attempts} rimasti)
        </button>
        <button id="show-angle" class="play-btn" disabled>
          <i class="fas fa-eye-slash"></i> Mostra Risposta (-30p)
        </button>
      </div>
    </div>
  `;
  const svgNS = "http://www.w3.org/2000/svg";
  const centerX = 150;
  const centerY = 150;
  const radius = 100;
  
  const degreesToCoords = (degrees) => {
    const radians = (degrees - 90) * Math.PI / 180;
    const x = centerX + radius * Math.cos(radians);
    const y = centerY + radius * Math.sin(radians);
    return { x, y };
  };
  
  // Inizializza SVG con l'angolo target
  const updateAngleVisualization = (angle, isGuess = false, isCorrect = false) => {
    const svg = document.getElementById('angle-svg');
    
    const targetCoords = degreesToCoords(targetAngle);
    const radius2 = document.getElementById('radius-2');
    radius2.setAttribute('x2', targetCoords.x);
    radius2.setAttribute('y2', targetCoords.y);
    
    if (isGuess) {
      const guessCoords = degreesToCoords(angle);
      let guessLine = document.getElementById('guess-line');
      
      if (!guessLine) {
        guessLine = document.createElementNS(svgNS, 'line');
        guessLine.setAttribute('id', 'guess-line');
        guessLine.setAttribute('stroke-width', '2');
        guessLine.setAttribute('stroke-dasharray', '5,5');
        svg.appendChild(guessLine);
      }
      
      guessLine.setAttribute('x1', centerX);
      guessLine.setAttribute('y1', centerY);
      guessLine.setAttribute('x2', guessCoords.x);
      guessLine.setAttribute('y2', guessCoords.y);
      guessLine.setAttribute('stroke', isCorrect ? 'var(--correct)' : 'var(--accent-tertiary)');
    }
    
    // Aggiorna arco angolare
    const arc = document.getElementById('angle-arc');
    if (targetAngle <= 180) {
      const arcCoords = degreesToCoords(targetAngle);
      const d = `M ${centerX + radius} ${centerY} 
                A ${radius} ${radius} 0 ${targetAngle > 180 ? 1 : 0} 1 
                ${arcCoords.x} ${arcCoords.y} 
                L ${centerX} ${centerY} Z`;
      arc.setAttribute('d', d);
    } else {
      const arcCoords = degreesToCoords(targetAngle);
      const d = `M ${centerX + radius} ${centerY} 
                A ${radius} ${radius} 0 1 1 
                ${arcCoords.x} ${arcCoords.y} 
                L ${centerX} ${centerY} Z`;
      arc.setAttribute('d', d);
    }
  };
  
  // Inizializza visualizzazione
  updateAngleVisualization(targetAngle);
  
  // Elementi DOM
  const angleInput = document.getElementById('angle-input');
  const display = document.getElementById('angle-display');
  const feedback = document.getElementById('feedback-message');
  const guessHistory = document.getElementById('angle-guess-history');
  const attemptsCount = document.getElementById('attempts-count');
  const submitBtn = document.getElementById('submit-angle');
  const hintBtn = document.getElementById('hint-angle');
  const showBtn = document.getElementById('show-angle');
  const quickBtns = document.querySelectorAll('.quick-btn');
  const categories = document.querySelectorAll('.category');
  
  // Evidenzia categoria corretta
  const highlightCorrectCategory = () => {
    categories.forEach(category => {
      category.classList.remove('correct-category');
      
      const type = category.dataset.type;
      const isCorrect = (
        (type === 'acute' && targetAngle > 0 && targetAngle < 90) ||
        (type === 'right' && targetAngle === 90) ||
        (type === 'obtuse' && targetAngle > 90 && targetAngle < 180) ||
        (type === 'straight' && targetAngle === 180) ||
        (type === 'reflex' && targetAngle > 180 && targetAngle < 360)
      );
      
      if (isCorrect) {
        category.classList.add('correct-category');
      }
    });
  };
  
  // Chiama all'inizio
  highlightCorrectCategory();
  
  // Aggiorna display in base all'input
  angleInput.addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    
    if (isNaN(value) || value < 0 || value > 360) {
      display.textContent = 'Valore non valido';
      display.style.color = 'var(--absent)';
      feedback.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Inserisci un numero tra 0 e 360';
      feedback.style.color = 'var(--absent)';
      submitBtn.disabled = true;
    } else {
      guess = value;
      display.textContent = `${value}°`;
      display.style.color = 'var(--accent-primary)';
      feedback.innerHTML = '<i class="fas fa-check-circle"></i> Valore valido, pronto per provare';
      feedback.style.color = 'var(--correct)';
      submitBtn.disabled = false;
    }
  });
  
  // Pulsanti rapidi
  quickBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const value = parseInt(btn.dataset.value);
      angleInput.value = value;
      angleInput.dispatchEvent(new Event('input'));
    });
  });
  
  // Aggiungi tentativo alla cronologia
  const addGuessToHistory = (guessValue, isCorrect, difference) => {
    const guessItem = document.createElement('div');
    guessItem.className = `guess-item ${isCorrect ? 'correct' : 'wrong'}`;
    
    const diffText = isCorrect ? 'ESATTO!' : `Differenza: ${difference}°`;
    const emoji = isCorrect ? '🎯' : difference <= 10 ? '👍' : difference <= 30 ? '🤔' : '😅';
    
    guessItem.innerHTML = `
      <div class="guess-value">${guessValue}°</div>
      <div class="guess-result">${emoji} ${diffText}</div>
    `;
    
    guessHistory.prepend(guessItem);
  };
  
  // Bottone Prova
  submitBtn.addEventListener('click', () => {
    if (attempts >= maxAttempts) {
      this.showToast('Tentativi esauriti!', 'error');
      return;
    }
    
    const inputValue = parseInt(angleInput.value);
    
    if (isNaN(inputValue) || inputValue < 0 || inputValue > 360) {
      this.showToast('Inserisci un numero valido tra 0 e 360', 'error');
      return;
    }
    
    attempts++;
    attemptsCount.textContent = `${attempts}/${maxAttempts}`;
    
    // Calcola differenza (considerando che 360° = 0°)
    let difference = Math.abs(targetAngle - inputValue);
    difference = Math.min(difference, 360 - difference);
    
    const isCorrect = difference === 0;
    
    // Aggiungi alla cronologia
    addGuessToHistory(inputValue, isCorrect, difference);
    
    // Aggiorna visualizzazione
    updateAngleVisualization(inputValue, true, isCorrect);
    
    // Feedback
    if (isCorrect) {
      // VITTORIA!
      angleInput.disabled = true;
      submitBtn.disabled = true;
      hintBtn.disabled = true;
      showBtn.disabled = true;
      
      const score = this.calculateAngleScore(attempts, maxAttempts);
      setTimeout(() => {
        this.showResult('Perfetto! ⭐', 
          `Hai indovinato l'angolo esatto: ${targetAngle}°\nTentativi usati: ${attempts}/${maxAttempts}\nPunteggio: ${score}`, 
          score);
        this.updateGameStats('angle', score);
      }, 1000);
    } else if (attempts >= maxAttempts) {
      // TENTATIVI ESAURITI
      angleInput.disabled = true;
      submitBtn.disabled = true;
      hintBtn.disabled = true;
      showBtn.disabled = false;
      
      setTimeout(() => {
        const score = Math.max(10, 50 - (difference * 2));
        this.showResult('Tentativi esauriti! 😅', 
          `L'angolo era: ${targetAngle}°\nIl tuo miglior tentativo: differenza di ${difference}°\nPunteggio: ${score}`, 
          score);
        this.updateGameStats('angle', score);
      }, 1000);
    } else {
      // TENTATIVO SBAGLIATO, MA ANCORA TENTATIVI
      let hintMsg = '';
      if (difference <= 5) {
        hintMsg = 'CALDISSIMO! Quasi perfetto!';
      } else if (difference <= 15) {
        hintMsg = 'CALDO! Molto vicino!';
      } else if (difference <= 45) {
        hintMsg = 'TIEPIDO... Più attenzione!';
      } else {
        hintMsg = 'FREDDO! Prova un approccio diverso.';
      }
      
      feedback.innerHTML = `<i class="fas fa-fire"></i> ${hintMsg}`;
      feedback.style.color = 'var(--accent-secondary)';
      
      // Reset input
      angleInput.value = '';
      angleInput.focus();
      display.textContent = 'Inserisci un nuovo tentativo...';
      display.style.color = 'var(--text-secondary)';
      
      // Aggiorna bottone aiuto
      hintBtn.innerHTML = `<i class="fas fa-question-circle"></i> Aiuto (${maxAttempts - attempts} rimasti)`;
    }
  });
  
  // Bottone Aiuto
  hintBtn.addEventListener('click', () => {
    if (attempts >= maxAttempts) {
      this.showToast('Tentativi esauriti', 'error');
      return;
    }
    
    const hints = [
      `Quadrante: ${targetAngle < 90 ? 'primo' : targetAngle < 180 ? 'secondo' : targetAngle < 270 ? 'terzo' : 'quarto'}`,
      `Tipo: ${targetAngle < 90 ? 'acuto' : targetAngle === 90 ? 'retto' : targetAngle < 180 ? 'ottuso' : targetAngle === 180 ? 'piatto' : 'riflesso'}`,
      `Valore tra ${Math.max(0, targetAngle - 45)}° e ${Math.min(360, targetAngle + 45)}°`,
      `Più vicino a ${Math.round(targetAngle / 30) * 30}° che a ${Math.round(targetAngle / 30) * 30 + 30}°`,
      `Non è ${targetAngle % 45 === 0 ? 'un multiplo di 45°' : 'un angolo speciale'}`
    ];
    
    const randomHint = hints[Math.floor(Math.random() * hints.length)];
    this.showToast(`💡 Suggerimento: ${randomHint}`, 'info');
    
    // Penalità per aiuto: consuma un tentativo
    attempts++;
    attemptsCount.textContent = `${attempts}/${maxAttempts}`;
    
    if (attempts >= maxAttempts) {
      hintBtn.disabled = true;
      hintBtn.innerHTML = '<i class="fas fa-question-circle"></i> Aiuti esauriti';
    } else {
      hintBtn.innerHTML = `<i class="fas fa-question-circle"></i> Aiuto (${maxAttempts - attempts} rimasti)`;
    }
  });
  
  // Bottone Mostra Risposta
  showBtn.addEventListener('click', () => {
    if (!showBtn.classList.contains('revealed')) {
      showBtn.classList.add('revealed');
      showBtn.innerHTML = '<i class="fas fa-eye"></i> Risposta Mostrata';
      showBtn.style.background = 'linear-gradient(135deg, var(--accent-tertiary), #787c7e)';
      showBtn.disabled = true;
      
      // Mostra valore angolo
      document.querySelector('.angle-value-hidden').textContent = targetAngle;
      document.querySelector('.angle-value-hidden').style.color = 'var(--accent-primary)';
      document.querySelector('.angle-value-hidden').style.fontWeight = 'bold';
      
      // Penalità massima
      const penalty = 50;
      this.showToast(`⚠️ Penalità massima: -${penalty} punti`, 'warning');
      
      // Calcola punteggio minimo
      const score = Math.max(0, 100 - penalty);
      setTimeout(() => {
        this.showResult('Risposta Rivelata 👀', 
          `L'angolo era: ${targetAngle}°\nPenalità per aver visto la risposta: -${penalty} punti\nPunteggio finale: ${score}`, 
          score);
        this.updateGameStats('angle', score);
      }, 1000);
    }
  });
  
  // Auto-focus sull'input
  setTimeout(() => {
    angleInput.focus();
  }, 500);
}
calculateAngleScore(attemptsUsed, maxAttempts) {
  const baseScore = 100;
  const attemptPenalty = (attemptsUsed - 1) * 20;
  const perfectBonus = attemptsUsed === 1 ? 50 : 0;
  
  return Math.max(10, baseScore - attemptPenalty + perfectBonus);
}

  /* =========================================================
     2. GIOCO: MEMORY MATEMATICO
  ========================================================= */
  startMathMemory() {
    const modalContent = document.querySelector('.game-modal .modal-content');
    
    const pairs = [
        { operation: '5 + 7', result: '12' },
        { operation: '8 × 3', result: '24' },
        { operation: '15 - 9', result: '6' },
        { operation: '36 ÷ 4', result: '9' },
        { operation: '9²', result: '81' },
        { operation: '√144', result: '12' },
        { operation: '2³', result: '8' },
        { operation: '50% di 200', result: '100' },
        { operation: '7 × 8', result: '56' },
        { operation: '45 ÷ 9', result: '5' },
        { operation: '3⁴', result: '81' },
        { operation: '√64', result: '8' }
    ];
    
    // Prendi 8 coppie casuali
    const selectedPairs = this.shuffleArray(pairs).slice(0, 8);
    
    // Crea carte
    let cards = [];
    selectedPairs.forEach((pair, index) => {
        cards.push({ 
        id: index * 2, 
        type: 'operation', 
        value: pair.operation, 
        match: pair.result,
        display: pair.operation 
        });
        cards.push({ 
        id: index * 2 + 1, 
        type: 'result', 
        value: pair.result, 
        match: pair.operation,
        display: pair.result 
        });
    });
    
    // Mescola
    cards = this.shuffleArray(cards);
    
    modalContent.innerHTML = `
        <div class="memory-game">
        <h2><i class="fas fa-brain"></i> Memory Matematico</h2>
        <p class="game-description">Trova le coppie operazione-risultato. Clicca sulle carte!</p>
        
        <div class="memory-stats">
            <div class="stat">Mosse: <span id="memory-moves">0</span></div>
            <div class="stat">Coppie: <span id="memory-pairs">0/8</span></div>
            <div class="stat">Tempo: <span id="memory-timer">60s</span></div>
        </div>
        
        <div class="memory-grid" id="memory-grid"></div>
        
        <div class="game-controls">
            <button id="reset-memory" class="play-btn">
            <i class="fas fa-redo"></i> Ricomincia
            </button>
            <button id="hint-memory" class="play-btn">
            <i class="fas fa-lightbulb"></i> Suggerimento
            </button>
        </div>
        </div>
    `;
    
    const grid = document.getElementById('memory-grid');
    grid.innerHTML = '';
    
    cards.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = 'memory-card';
        cardElement.dataset.id = card.id;
        cardElement.dataset.type = card.type;
        cardElement.dataset.value = card.value;
        cardElement.dataset.match = card.match;
        
        cardElement.innerHTML = `
        <div class="card-back">
            <i class="fas fa-question"></i>
        </div>
        <div class="card-front">
            <div class="card-content">
            ${card.type === 'operation' ? '<span class="operation">' : '<span class="result">'}
            ${card.display}
            </span>
            </div>
        </div>
        `;
        
        cardElement.addEventListener('click', () => this.handleMemoryCardClick(cardElement));
        grid.appendChild(cardElement);
    });
    
    // Inizializza stato gioco
    this.memoryState = {
        flippedCards: [],
        matchedPairs: 0,
        moves: 0,
        timer: 60,
        timerInterval: null,
        isChecking: false
    };
    
    // Aggiorna display
    this.updateMemoryDisplay();
    
    // Avvia timer
    this.startMemoryTimer();
    
    // Event listeners
    document.getElementById('reset-memory').addEventListener('click', () => {
        this.startMathMemory();
    });
    
    document.getElementById('hint-memory').addEventListener('click', () => {
        this.giveMemoryHint();
    });
    }

    handleMemoryCardClick(card) {
    if (!this.memoryState) return;
    
    const { flippedCards, matchedPairs, moves, isChecking } = this.memoryState;
    
    // Se la carta è già girata, matchata, o stiamo controllando, ignora
    if (card.classList.contains('flipped') || 
        card.classList.contains('matched') || 
        isChecking || 
        flippedCards.length >= 2) {
        return;
    }
    
    // Gira la carta
    card.classList.add('flipped');
    this.memoryState.flippedCards.push(card);
    
    // Aggiorna mosse
    this.memoryState.moves++;
    this.updateMemoryDisplay();
    
    // Se abbiamo due carte girate
    if (this.memoryState.flippedCards.length === 2) {
        this.memoryState.isChecking = true;
        
        setTimeout(() => {
        const card1 = this.memoryState.flippedCards[0];
        const card2 = this.memoryState.flippedCards[1];
        
        // Controlla se matchano
        const match1 = (card1.dataset.value === card2.dataset.match);
        const match2 = (card2.dataset.value === card1.dataset.match);
        
        if (match1 && match2) {
            // Match!
            card1.classList.add('matched');
            card2.classList.add('matched');
            
            this.memoryState.matchedPairs++;
            this.updateMemoryDisplay();
            
            // Effetto visivo
            card1.classList.add('correct-flash');
            card2.classList.add('correct-flash');
            
            // Controlla vittoria
            if (this.memoryState.matchedPairs === 8) {
            clearInterval(this.memoryState.timerInterval);
            const timeBonus = Math.max(0, this.memoryState.timer) * 2;
            const moveBonus = Math.max(0, 50 - this.memoryState.moves) * 3;
            const score = 100 + timeBonus + moveBonus;
            
            setTimeout(() => {
                this.showResult('Memory Completato! 🧠', 
                `Coppie trovate: 8/8\nMosse: ${this.memoryState.moves}\nTempo rimasto: ${this.memoryState.timer}s\nBonus: +${timeBonus + moveBonus} punti`, 
                Math.min(300, score));
                this.updateGameStats('math-memory', score);
            }, 800);
            }
        } else {
            // Non matchano, rigira
            card1.classList.add('wrong-shake');
            card2.classList.add('wrong-shake');
            
            setTimeout(() => {
            card1.classList.remove('flipped', 'wrong-shake');
            card2.classList.remove('flipped', 'wrong-shake');
            }, 800);
        }
        
        // Svuota array e permette nuove mosse
        setTimeout(() => {
            card1.classList.remove('correct-flash');
            card2.classList.remove('wrong-shake');
            this.memoryState.flippedCards = [];
            this.memoryState.isChecking = false;
        }, 1000);
        }, 800);
    }
    }

    updateMemoryDisplay() {
    if (!this.memoryState) return;
    
    const movesEl = document.getElementById('memory-moves');
    const pairsEl = document.getElementById('memory-pairs');
    const timerEl = document.getElementById('memory-timer');
    
    if (movesEl) movesEl.textContent = this.memoryState.moves;
    if (pairsEl) pairsEl.textContent = `${this.memoryState.matchedPairs}/8`;
    if (timerEl) timerEl.textContent = `${this.memoryState.timer}s`;
    }

    startMemoryTimer() {
    this.memoryState.timerInterval = setInterval(() => {
        this.memoryState.timer--;
        this.updateMemoryDisplay();
        
        if (this.memoryState.timer <= 0) {
        clearInterval(this.memoryState.timerInterval);
        this.showResult('Tempo Scaduto! ⏰', 
            `Hai trovato ${this.memoryState.matchedPairs}/8 coppie in ${this.memoryState.moves} mosse.`, 
            this.memoryState.matchedPairs * 10);
        this.updateGameStats('math-memory', this.memoryState.matchedPairs * 10);
        }
    }, 1000);
    }

    giveMemoryHint() {
    if (!this.memoryState || this.memoryState.moves < 5) return;
    
    // Trova una carta non ancora scoperta
    const cards = document.querySelectorAll('.memory-card:not(.flipped):not(.matched)');
    if (cards.length > 0) {
        const randomCard = cards[Math.floor(Math.random() * cards.length)];
        randomCard.classList.add('hint-glow');
        
        setTimeout(() => {
        randomCard.classList.remove('hint-glow');
        }, 1000);
        
        // Penalità per il suggerimento
        this.memoryState.timer = Math.max(0, this.memoryState.timer - 5);
        this.updateMemoryDisplay();
    }
    }
  
  /* =========================================================
     3. GIOCO: QUIZ ITALIANO
  ========================================================= */
  startQuizItaliano() {
    const modalContent = document.querySelector('.game-modal .modal-content');
    const quizQuestions = this.shuffleArray([
        {
        question: "Qual è la capitale d'Italia?",
        options: ["Roma", "Milano", "Napoli", "Firenze"],
        correct: 0
        },
        {
        question: "Chi scrisse 'La Divina Commedia'?",
        options: ["Petrarca", "Boccaccio", "Dante Alighieri", "Ariosto"],
        correct: 2
        },
        {
        question: "Qual è il fiume più lungo d'Italia?",
        options: ["Tevere", "Arno", "Po", "Adige"],
        correct: 2
        },
        {
        question: "In che anno fu unificata l'Italia?",
        options: ["1848", "1861", "1870", "1900"],
        correct: 1
        },
        {
        question: "Qual è il lago più grande d'Italia?",
        options: ["Lago di Garda", "Lago Maggiore", "Lago di Como", "Lago Trasimeno"],
        correct: 0
        },
        {
        question: "Quale di queste regioni NON è bagnata dal mare?",
        options: ["Umbria", "Lazio", "Campania", "Sicilia"],
        correct: 0
        },
        {
        question: "Come si chiama il monumento simbolo di Roma?",
        options: ["Torre di Pisa", "Duomo di Milano", "Colosseo", "Basilica di San Marco"],
        correct: 2
        },
        {
        question: "Quale di questi è un poeta italiano del '900?",
        options: ["Eugenio Montale", "William Shakespeare", "Victor Hugo", "Johann Goethe"],
        correct: 0
        },
        {
        question: "Qual è la montagna più alta d'Italia?",
        options: ["Monte Bianco", "Monte Rosa", "Cervino", "Gran Paradiso"],
        correct: 0
        },
        {
        question: "In quale città si trova la Fontana di Trevi?",
        options: ["Roma", "Firenze", "Venezia", "Napoli"],
        correct: 0
        },
        {
        question: "Quale di questi è un formaggio italiano?",
        options: ["Gouda", "Parmigiano Reggiano", "Cheddar", "Brie"],
        correct: 1
        },
        {
        question: "Chi dipinse la 'Primavera' di Botticelli?",
        options: ["Michelangelo", "Raffaello", "Botticelli", "Caravaggio"],
        correct: 2
        },
        {
        question: "Quale isola italiana è la più grande?",
        options: ["Sardegna", "Sicilia", "Elba", "Ischia"],
        correct: 1
        },
        {
        question: "Come si chiama il vulcano attivo vicino a Napoli?",
        options: ["Etna", "Vesuvio", "Stromboli", "Vulcano"],
        correct: 1
        },
        {
        question: "Quale di queste è un'opera di Giuseppe Verdi?",
        options: ["La Traviata", "Il Barbiere di Siviglia", "Tosca", "Madama Butterfly"],
        correct: 0
        }
    ]);
    
    // Prendi 10 domande casuali
    const selectedQuestions = quizQuestions.slice(0, 10);
    
    let currentQuestion = 0;
    let score = 0;
    let startTime = Date.now();
    
    const showQuestion = () => {
        const q = selectedQuestions[currentQuestion];
        
        modalContent.innerHTML = `
        <div class="quiz-game">
            <h2><i class="fas fa-flag"></i> Quiz Italiano</h2>
            <p class="game-description">Metti alla prova la tua conoscenza dell'Italia!</p>
            
            <div class="quiz-progress">
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${(currentQuestion / selectedQuestions.length) * 100}%"></div>
            </div>
            <div class="quiz-stats">
                <span>Domanda ${currentQuestion + 1}/${selectedQuestions.length}</span>
                <span>Punteggio: <strong>${score}</strong></span>
            </div>
            </div>
            
            <div class="quiz-question">
            <div class="question-number">Domanda ${currentQuestion + 1}</div>
            <div class="question-text">${q.question}</div>
            </div>
            
            <div class="quiz-options" id="quiz-options">
            ${q.options.map((option, index) => `
                <div class="quiz-option" data-index="${index}">
                <span class="option-letter">${String.fromCharCode(65 + index)}</span>
                <span class="option-text">${option}</span>
                </div>
            `).join('')}
            </div>
            
            <div class="game-controls">
            <button id="next-question" class="play-btn" style="display: none;">
                <i class="fas fa-arrow-right"></i> ${currentQuestion < selectedQuestions.length - 1 ? 'Prossima' : 'Risultati'}
            </button>
            </div>
        </div>
        `;
        
        const options = document.querySelectorAll('.quiz-option');
        const nextBtn = document.getElementById('next-question');
        
        options.forEach(opt => {
        opt.addEventListener('click', (e) => {
            // Se già risposta data, ignora
            if (document.querySelector('.quiz-option.correct') || document.querySelector('.quiz-option.wrong')) {
            return;
            }
            
            const selectedIndex = parseInt(e.currentTarget.dataset.index);
            const correctIndex = q.correct;
            
            // Disabilita tutte le opzioni
            options.forEach(o => {
            o.style.pointerEvents = 'none';
            if (parseInt(o.dataset.index) === correctIndex) {
                o.classList.add('correct');
            }
            });
            
            // Controlla risposta
            if (selectedIndex === correctIndex) {
            e.currentTarget.classList.add('correct');
            score += 10;
            // Bonus per velocità (se risposta in meno di 10 secondi)
            const timeElapsed = Date.now() - startTime;
            if (timeElapsed < 10000) {
                score += 5;
            }
            } else {
            e.currentTarget.classList.add('wrong');
            }
            
            // Aggiorna punteggio
            document.querySelector('.quiz-stats strong').textContent = score;
            
            // Mostra bottone prossima
            nextBtn.style.display = 'block';
        });
        });
        
        nextBtn.addEventListener('click', () => {
        currentQuestion++;
        startTime = Date.now();
        
        if (currentQuestion < selectedQuestions.length) {
            showQuestion();
        } else {
            const timeTaken = Math.floor((Date.now() - startTime) / 1000);
            const finalScore = score + Math.max(0, 50 - timeTaken);
            
            this.showResult('Quiz Completato! 🇮🇹', 
            `Punteggio: ${score}/100\nTempo totale: ${timeTaken}s\nBonus tempo: +${Math.max(0, 50 - timeTaken)}\nPunteggio finale: ${finalScore}`, 
            finalScore);
            this.updateGameStats('quiz-italiano', finalScore);
        }
        });
    };
    
    showQuestion();
    }
  
  /* =========================================================
     4. GIOCO: VELOCITÀ DIGITALE
  ========================================================= */
  startTypingSpeed() {
    const modalContent = document.querySelector('.game-modal .modal-content');
    const texts = [
        "Il sole splende alto nel cielo azzurro mentre gli uccelli cinguettano felici tra gli alberi.",
        "La programmazione è l'arte di dare istruzioni ai computer per risolvere problemi complessi.",
        "L'Italia è famosa per la sua cucina, la moda, l'arte e il design di qualità mondiale.",
        "L'apprendimento continuo è essenziale per rimanere competitivi nel mondo moderno.",
        "La tecnologia avanza a ritmi incredibili trasformando ogni aspetto della nostra vita.",
        "Leggere un buon libro può trasportarti in mondi lontani e arricchire la tua mente.",
        "La musica ha il potere di suscitare emozioni profonde e unire le persone.",
        "Viaggiare apre la mente e permette di conoscere culture diverse dalla propria.",
        "La scienza cerca di comprendere i misteri dell'universo attraverso osservazioni e esperimenti.",
        "Lo sport insegna disciplina, lavoro di squadra e rispetto per gli avversari.",
        "L'amicizia è un tesoro prezioso che va coltivato con cura e sincerità.",
        "La natura ci offre spettacoli meravigliosi che ispirano arte, poesia e filosofia.",
        "La creatività umana non ha limiti e si esprime in infinite forme d'arte.",
        "L'intelligenza artificiale sta rivoluzionando molti settori dell'economia globale.",
        "La salute è il bene più prezioso che possediamo e va preservata con attenzione.",
        "La storia ci insegna lezioni importanti sul passato per costruire un futuro migliore.",
        "La matematica è il linguaggio universale che descrive le leggi della natura.",
        "La filosofia cerca risposte alle domande fondamentali sull'esistenza umana.",
        "La sostenibilità ambientale è cruciale per garantire un pianeta vivibile alle future generazioni.",
        "L'innovazione tecnologica procede a velocità esponenziale cambiando radicalmente la società.",
        "La letteratura italiana vanta autori di fama mondiale come Dante, Petrarca e Manzoni.",
        "Il caffè espresso è diventato un simbolo della cultura italiana in tutto il mondo.",
        "La pizza napoletana è stata riconosciuta patrimonio immateriale dell'umanità dall'UNESCO.",
        "Il design italiano è celebre per la sua eleganza, funzionalità e stile inconfondibile.",
        "L'opera lirica italiana ha dato i natali a compositori immortali come Verdi e Puccini.",
        "Il Rinascimento italiano ha prodotto capolavori artistici che ancora oggi incantano il mondo.",
        "L'automobile italiana è sinonimo di stile, prestazioni e passione per la guida.",
        "La moda italiana dettata da Milano è tra le più influenti a livello internazionale.",
        "Il gelato artigianale italiano è rinomato per la sua qualità e varietà di gusti.",
        "Il cinema italiano ha regalato al mondo maestri come Fellini, Visconti e Leone.",
        "L'architettura italiana spazia dalle rovine romane alle avanguardie contemporanee.",
        "La lingua italiana è considerata una delle più musicali e poetiche al mondo.",
        "Il vino italiano vanta una tradizione millenaria e denominazioni di prestigio mondiale.",
        "L'artigianato italiano si distingue per maestria, qualità e attenzione ai dettagli.",
        "Il calcio italiano ha scritto pagine importanti nella storia dello sport mondiale.",
        "La ricerca scientifica italiana eccelle in molti campi dalla fisica alla medicina.",
        "Il paesaggio italiano offre una varietà unica di mari, monti, colline e città d'arte.",
        "La pasticceria italiana è famosa per dolci come tiramisù, cannoli e panettone.",
        "Il teatro italiano vanta una tradizione che risale all'antica Roma e alla Commedia dell'Arte.",
        "La bici italiana rappresenta l'eccellenza nel ciclismo sia amatoriale che professionistico.",
        "L'olio d'oliva italiano è un ingrediente fondamentale della dieta mediterranea salutare.",
        "I musei italiani custodiscono circa il sessanta percento del patrimonio artistico mondiale.",
        "Il made in Italy è un marchio di qualità riconosciuto e apprezzato in tutto il pianeta.",
        "La Costituzione italiana è tra le più avanzate nel garantire diritti e libertà fondamentali.",
        "Il sistema universitario italiano include alcuni tra gli atenei più antichi d'Europa.",
        "La robotica italiana è all'avanguardia nella ricerca e nelle applicazioni industriali.",
        "Il festival di Sanremo è la manifestazione musicale più longeva e seguita d'Italia.",
        "La bicicletta è un mezzo ecologico perfetto per esplorare le città e la campagna italiana.",
        "Il design del mobile italiano combina tradizione artigianale e innovazione contemporanea.",
        "La ceramica italiana, in particolare quella di Deruta e Caltagirone, è famosa nel mondo."
    ];
    
    const text = texts[Math.floor(Math.random() * texts.length)];
    let startTime = null;
    let endTime = null;
    let typedText = '';
    let errors = 0;
    let isGameActive = false;
    let timerInterval = null;
    
    modalContent.innerHTML = `
        <div class="typing-game">
        <h2><i class="fas fa-keyboard"></i> Velocità Digitale</h2>
        <p class="game-description">Digita il testo esattamente come appare. Premi INVIO per iniziare e controlla la tua velocità!</p>
        
        <div class="typing-instructions">
            <div class="instruction">
            <i class="fas fa-flag-checkered"></i> Obiettivo: Copia il testo il più velocemente possibile
            </div>
            <div class="instruction">
            <i class="fas fa-lightbulb"></i> Suggerimento: Concentrati sulla precisione, non solo sulla velocità
            </div>
        </div>
        
        <div class="typing-text-container">
            <div class="text-label">Testo da copiare:</div>
            <div class="typing-text" id="typing-text">${text}</div>
            <div class="text-stats">
            <span><i class="fas fa-font"></i> ${text.length} caratteri</span>
            <span><i class="fas fa-keyboard"></i> ${text.split(' ').length} parole</span>
            </div>
        </div>
        
        <div class="typing-input-container">
            <div class="input-label">Il tuo testo:</div>
            <textarea 
            class="typing-input" 
            id="typing-input" 
            placeholder="Premi INVIO per iniziare il timer, poi digita qui..."
            rows="4"
            disabled
            ></textarea>
            <div class="input-hint">
            <i class="fas fa-info-circle"></i> Il timer parte quando premi INVIO la prima volta
            </div>
        </div>
        
        <div class="typing-stats">
            <div class="typing-stat">
            <div class="typing-stat-value" id="wpm">0</div>
            <div class="typing-stat-label">Parole/min</div>
            </div>
            <div class="typing-stat">
            <div class="typing-stat-value" id="accuracy">100%</div>
            <div class="typing-stat-label">Precisione</div>
            </div>
            <div class="typing-stat">
            <div class="typing-stat-value" id="time">0.0s</div>
            <div class="typing-stat-label">Tempo</div>
            </div>
            <div class="typing-stat">
            <div class="typing-stat-value" id="errors">0</div>
            <div class="typing-stat-label">Errori</div>
            </div>
        </div>
        
        <div class="typing-progress">
            <div class="progress-label">Progresso:</div>
            <div class="progress-bar">
            <div class="progress-fill" id="typing-progress" style="width: 0%"></div>
            </div>
            <div class="progress-text" id="progress-text">0%</div>
        </div>
        
        <div class="game-controls">
            <button id="restart-typing" class="play-btn">
            <i class="fas fa-redo"></i> Nuovo Testo
            </button>
            <button id="pause-typing" class="play-btn" style="display: none;">
            <i class="fas fa-pause"></i> Pausa
            </button>
        </div>
        
        <div class="typing-leaderboard">
            <div class="leaderboard-label">
            <i class="fas fa-trophy"></i> I tuoi record
            </div>
            <div class="leaderboard-stats">
            <div>Record velocità: <span id="best-wpm">${this.gameData.games['typing-speed']?.bestWPM || 0}</span> WPM</div>
            <div>Migliore precisione: <span id="best-accuracy">${this.gameData.games['typing-speed']?.bestAccuracy || 0}%</span></div>
            </div>
        </div>
        </div>
    `;
    
    const input = document.getElementById('typing-input');
    const wpmDisplay = document.getElementById('wpm');
    const accuracyDisplay = document.getElementById('accuracy');
    const timeDisplay = document.getElementById('time');
    const errorsDisplay = document.getElementById('errors');
    const progressBar = document.getElementById('typing-progress');
    const progressText = document.getElementById('progress-text');
    const restartBtn = document.getElementById('restart-typing');
    const pauseBtn = document.getElementById('pause-typing');
    const bestWpmDisplay = document.getElementById('best-wpm');
    const bestAccuracyDisplay = document.getElementById('best-accuracy');
    const originalText = text;
    const textDisplay = document.getElementById('typing-text');
    
    const updateTextHighlight = () => {
        const typed = typedText;
        let highlightedText = '';
        
        for (let i = 0; i < originalText.length; i++) {
        if (i < typed.length) {
            if (typed[i] === originalText[i]) {
            highlightedText += `<span class="char-correct">${originalText[i]}</span>`;
            } else {
            highlightedText += `<span class="char-wrong">${originalText[i]}</span>`;
            }
        } else if (i === typed.length) {
            highlightedText += `<span class="char-current">${originalText[i]}</span>`;
        } else {
            highlightedText += `<span class="char-remaining">${originalText[i]}</span>`;
        }
        }
        
        textDisplay.innerHTML = highlightedText;
    };
    
    // Inizializza evidenziazione
    updateTextHighlight();
    
    // Gestione input
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !isGameActive) {
        e.preventDefault();
        startGame();
        }
        
        // Blocca backspace se non è ancora iniziato
        if (!isGameActive && e.key === 'Backspace') {
        e.preventDefault();
        }
    });
    
    input.addEventListener('input', (e) => {
        if (!isGameActive && e.target.value.trim() !== '') {
        startGame();
        }
        
        typedText = e.target.value;
        updateTextHighlight();
        
        // Calcola errori
        errors = 0;
        for (let i = 0; i < Math.min(typedText.length, originalText.length); i++) {
        if (typedText[i] !== originalText[i]) {
            errors++;
        }
        }
        
        // Aggiungi errori per caratteri extra
        if (typedText.length > originalText.length) {
        errors += (typedText.length - originalText.length);
        }
        
        errorsDisplay.textContent = errors;
        
        // Calcola progresso
        const progress = Math.min(100, (typedText.length / originalText.length) * 100);
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `${Math.floor(progress)}%`;
        
        // Calcola statistiche in tempo reale
        if (startTime && isGameActive) {
        const elapsed = (Date.now() - startTime) / 1000; // secondi
        const words = typedText.trim().split(/\s+/).length;
        const wpm = Math.floor((words / elapsed) * 60) || 0;
        
        // Calcola precisione
        const correctChars = originalText.split('').filter((char, i) => 
            i < typedText.length && char === typedText[i]
        ).length;
        const accuracy = typedText.length > 0 
            ? Math.floor((correctChars / typedText.length) * 100)
            : 100;
        
        wpmDisplay.textContent = wpm;
        accuracyDisplay.textContent = `${accuracy}%`;
        timeDisplay.textContent = `${elapsed.toFixed(1)}s`;
        
        // Aggiorna record in tempo reale
        if (wpm > parseInt(bestWpmDisplay.textContent)) {
            bestWpmDisplay.textContent = wpm;
            bestWpmDisplay.classList.add('new-record');
        }
        
        if (accuracy > parseInt(bestAccuracyDisplay.textContent)) {
            bestAccuracyDisplay.textContent = accuracy;
            bestAccuracyDisplay.classList.add('new-record');
        }
        }
        
        // Controlla se completato
        if (typedText === originalText) {
        endGame();
        }
    });
    
    const startGame = () => {
        if (isGameActive) return;
        
        isGameActive = true;
        startTime = Date.now();
        input.disabled = false;
        input.focus();
        pauseBtn.style.display = 'block';
        
        // Avvia timer visivo
        timerInterval = setInterval(() => {
        if (!startTime || !isGameActive) return;
        
        const elapsed = (Date.now() - startTime) / 1000;
        timeDisplay.textContent = `${elapsed.toFixed(1)}s`;
        
        // Auto-save ogni 5 secondi
        if (Math.floor(elapsed) % 5 === 0) {
            this.saveTypingProgress(typedText);
        }
        }, 100);
    };
    
    const endGame = () => {
        if (!isGameActive || endTime) return;
        
        endTime = Date.now();
        clearInterval(timerInterval);
        isGameActive = false;
        input.disabled = true;
        pauseBtn.style.display = 'none';
        
        const timeTaken = (endTime - startTime) / 1000;
        const words = originalText.split(' ').length;
        const wpm = Math.floor((words / timeTaken) * 60);
        const accuracy = this.calculateTypingAccuracy(originalText, typedText);
        
        // Calcola punteggio finale
        const baseScore = Math.floor(wpm * 2);
        const accuracyBonus = Math.floor(accuracy / 2);
        const errorPenalty = Math.max(0, 50 - (errors * 5));
        const finalScore = baseScore + accuracyBonus + errorPenalty;
        
        // Animazione completamento
        document.querySelectorAll('.char-correct').forEach(char => {
        char.classList.add('completed');
        });
        
        // Mostra risultati
        setTimeout(() => {
        this.showResult('Test Completato! ⚡', 
            `Velocità: ${wpm} WPM\nPrecisione: ${accuracy}%\nErrori: ${errors}\nTempo: ${timeTaken.toFixed(1)} secondi\nPunteggio finale: ${finalScore}`, 
            finalScore);
        
        // Salva statistiche
        this.updateTypingStats(wpm, accuracy, finalScore);
        }, 1000);
    };
    
    const pauseGame = () => {
        if (!isGameActive) return;
        
        isGameActive = !isGameActive;
        
        if (isGameActive) {
        // Riprendi
        startTime = Date.now() - (Date.now() - startTime);
        pauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pausa';
        input.disabled = false;
        } else {
        // Metti in pausa
        pauseBtn.innerHTML = '<i class="fas fa-play"></i> Riprendi';
        input.disabled = true;
        }
    };
    
    // Event listeners
    restartBtn.addEventListener('click', () => {
        clearInterval(timerInterval);
        this.startTypingSpeed();
    });
    
    pauseBtn.addEventListener('click', pauseGame);
    
    // Auto-focus dopo caricamento
    setTimeout(() => {
        input.focus();
    }, 500);
    }

    calculateTypingAccuracy(original, typed) {
    if (typed.length === 0) return 100;
    
    let correct = 0;
    const minLength = Math.min(original.length, typed.length);
    
    // Conta caratteri corretti
    for (let i = 0; i < minLength; i++) {
        if (original[i] === typed[i]) correct++;
    }
    
    // Penalità per caratteri extra
    const extraChars = Math.max(0, typed.length - original.length);
    const totalPossible = original.length + extraChars;
    
    return Math.floor((correct / totalPossible) * 100);
    }

    saveTypingProgress(typedText) {
    if (!this.gameData.typingProgress) {
        this.gameData.typingProgress = [];
    }
    
    this.gameData.typingProgress.push({
        text: typedText,
        timestamp: Date.now()
    });
    
    // Mantieni solo ultimi 10 progressi
    if (this.gameData.typingProgress.length > 10) {
        this.gameData.typingProgress.shift();
    }
    
    this.saveGameData();
    }

    updateTypingStats(wpm, accuracy, score) {
    if (!this.gameData.games['typing-speed']) {
        this.gameData.games['typing-speed'] = {
        bestWPM: 0,
        bestAccuracy: 0,
        averageWPM: 0,
        totalTests: 0,
        totalTime: 0,
        totalWords: 0,
        plays: 0
        };
    }
    
    const typingStats = this.gameData.games['typing-speed'];
    
    // Aggiorna record
    if (wpm > typingStats.bestWPM) {
        typingStats.bestWPM = wpm;
    }
    
    if (accuracy > typingStats.bestAccuracy) {
        typingStats.bestAccuracy = accuracy;
    }
    
    // Aggiorna medie
    typingStats.plays++;
    typingStats.totalTests++;
    typingStats.averageWPM = Math.floor(
        ((typingStats.averageWPM * (typingStats.totalTests - 1)) + wpm) / typingStats.totalTests
    );
    
    // Aggiorna statistiche globali
    this.gameData.stats.gamesPlayed++;
    this.saveGameData();
    this.updateStats();
    }
  
  /* =========================================================
     5. GIOCO: PUZZLE PAROLE
  ========================================================= */
  startWordPuzzle() {
    const modalContent = document.querySelector('.game-modal .modal-content');
    
    const puzzles = [
        { word: "COMPUTER", hint: "Macchina elettronica per elaborare dati" },
        { word: "LIBERTA", hint: "Potere di agire senza costrizioni" },
        { word: "SOLE", hint: "Stella al centro del sistema solare" },
        { word: "AMICIZIA", hint: "Relazione affettiva tra persone" },
        { word: "SCUOLA", hint: "Luogo di istruzione e formazione" },
        { word: "VIAGGIO", hint: "Spostamento da un luogo a un altro" },
        { word: "MUSICA", hint: "Arte dei suoni organizzati nel tempo" },
        { word: "LIBRO", hint: "Insieme di fogli stampati rilegati" }
    ];
    
    const puzzle = puzzles[Math.floor(Math.random() * puzzles.length)];
    const letters = puzzle.word.split('');
    const shuffled = this.shuffleArray([...letters]);
    
    modalContent.innerHTML = `
        <div class="puzzle-game">
        <h2><i class="fas fa-puzzle-piece"></i> Puzzle Parole</h2>
        <p class="game-description">Trascina le lettere nell'ordine corretto per formare la parola!</p>
        
        <div class="puzzle-hint">
            <i class="fas fa-lightbulb"></i> Suggerimento: ${puzzle.hint}
            <br>
            <small>Lunghezza parola: ${letters.length} lettere</small>
        </div>
        
        <div class="puzzle-target" id="puzzle-target">
            <div class="target-label">ORDINE CORRETTO</div>
            <div class="target-slots" id="target-slots">
            ${letters.map((_, index) => `
                <div class="target-slot" data-index="${index}" id="slot-${index}">
                <div class="slot-placeholder">${index + 1}</div>
                </div>
            `).join('')}
            </div>
        </div>
        
        <div class="puzzle-source" id="puzzle-source">
            <div class="source-label">LETTERE DA USARE</div>
            <div class="source-pieces">
            ${shuffled.map((letter, index) => `
                <div class="puzzle-piece" draggable="true" id="piece-${index}" data-letter="${letter}">
                ${letter}
                </div>
            `).join('')}
            </div>
        </div>
        
        <div class="puzzle-feedback" id="puzzle-feedback">
            <div class="current-word" id="current-word"></div>
        </div>
        
        <div class="game-controls">
            <button id="check-puzzle" class="play-btn">
            <i class="fas fa-check"></i> Controlla
            </button>
            <button id="reset-puzzle" class="play-btn">
            <i class="fas fa-undo"></i> Ricomincia
            </button>
            <button id="solve-puzzle" class="play-btn">
            <i class="fas fa-eye"></i> Mostra Soluzione
            </button>
        </div>
        </div>
    `;
    
    // Stato del puzzle
    this.puzzleState = {
        target: {},
        pieces: {},
        solution: puzzle.word
    };
    
    // Inizializza drag & drop
    this.initPuzzleDragDrop();
    
    // Event listeners
    document.getElementById('check-puzzle').addEventListener('click', () => {
        this.checkPuzzleSolution();
    });
    
    document.getElementById('reset-puzzle').addEventListener('click', () => {
        this.resetPuzzle();
    });
    
    document.getElementById('solve-puzzle').addEventListener('click', () => {
        this.solvePuzzle();
    });
    }

    initPuzzleDragDrop() {
    const pieces = document.querySelectorAll('.puzzle-piece');
    const slots = document.querySelectorAll('.target-slot');
    
    // Inizializza stato
    pieces.forEach(piece => {
        piece.addEventListener('dragstart', this.handlePuzzleDragStart.bind(this));
        this.puzzleState.pieces[piece.id] = {
        element: piece,
        letter: piece.dataset.letter,
        inSlot: null
        };
    });
    
    slots.forEach(slot => {
        slot.addEventListener('dragover', this.handlePuzzleDragOver.bind(this));
        slot.addEventListener('drop', this.handlePuzzleDrop.bind(this));
        slot.addEventListener('dragenter', this.handlePuzzleDragEnter.bind(this));
        slot.addEventListener('dragleave', this.handlePuzzleDragLeave.bind(this));
        
        this.puzzleState.target[slot.id] = {
        element: slot,
        occupied: false,
        piece: null
        };
    });
    
    // Aggiorna visualizzazione
    this.updatePuzzleDisplay();
    }

    handlePuzzleDragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.id);
    e.target.classList.add('dragging');
    }

    handlePuzzleDragOver(e) {
    e.preventDefault();
    }

    handlePuzzleDragEnter(e) {
    e.preventDefault();
    if (e.target.classList.contains('target-slot')) {
        e.target.classList.add('drag-over');
    }
    }

    handlePuzzleDragLeave(e) {
    if (e.target.classList.contains('target-slot')) {
        e.target.classList.remove('drag-over');
    }
    }

    handlePuzzleDrop(e) {
    e.preventDefault();
    e.target.classList.remove('drag-over');
    
    const slot = e.target.closest('.target-slot');
    if (!slot) return;
    
    const pieceId = e.dataTransfer.getData('text/plain');
    const piece = document.getElementById(pieceId);
    
    if (!piece || !slot) return;
    
    // Rimuovi da slot precedente se presente
    const prevSlotId = this.puzzleState.pieces[pieceId]?.inSlot;
    if (prevSlotId) {
        const prevSlot = this.puzzleState.target[prevSlotId];
        if (prevSlot) {
        prevSlot.occupied = false;
        prevSlot.piece = null;
        prevSlot.element.innerHTML = '<div class="slot-placeholder">' + (parseInt(prevSlotId.split('-')[1]) + 1) + '</div>';
        }
    }
    
    // Posiziona nel nuovo slot
    slot.innerHTML = '';
    slot.appendChild(piece);
    piece.classList.remove('dragging');
    
    // Aggiorna stato
    const slotId = slot.id;
    this.puzzleState.target[slotId].occupied = true;
    this.puzzleState.target[slotId].piece = pieceId;
    this.puzzleState.pieces[pieceId].inSlot = slotId;
    
    this.updatePuzzleDisplay();
    }

    updatePuzzleDisplay() {
    const currentWord = [];
    const slots = document.querySelectorAll('.target-slot');
    
    slots.forEach(slot => {
        const pieceId = this.puzzleState.target[slot.id]?.piece;
        if (pieceId) {
        const piece = this.puzzleState.pieces[pieceId];
        if (piece) {
            currentWord[parseInt(slot.dataset.index)] = piece.letter;
        }
        }
    });
    
    const wordDisplay = currentWord.filter(l => l).join('');
    document.getElementById('current-word').textContent = `Parola attuale: ${wordDisplay || '______'}`;
    
    // Controlla se tutte le lettere sono piazzate
    const allPlaced = Object.values(this.puzzleState.pieces)
        .every(piece => piece.inSlot !== null);
    
    if (allPlaced) {
        document.getElementById('check-puzzle').classList.add('ready');
    }
    }

    checkPuzzleSolution() {
    const currentWord = [];
    const slots = document.querySelectorAll('.target-slot');
    
    slots.forEach(slot => {
        const pieceId = this.puzzleState.target[slot.id]?.piece;
        if (pieceId) {
        const piece = this.puzzleState.pieces[pieceId];
        if (piece) {
            currentWord.push(piece.letter);
        } else {
            currentWord.push('_');
        }
        } else {
        currentWord.push('_');
        }
    });
    
    const word = currentWord.join('');
    
    if (word === this.puzzleState.solution) {
        // VITTORIA!
        document.querySelectorAll('.puzzle-piece').forEach(piece => {
        piece.classList.add('correct');
        });
        
        const score = 100;
        this.showResult('Complimenti! 🎉', 
        `Hai ricomposto correttamente: ${this.puzzleState.solution}`, 
        score);
        this.updateGameStats('word-puzzle', score);
    } else {
        // ERRORE
        document.getElementById('puzzle-feedback').classList.add('wrong');
        document.getElementById('puzzle-feedback').innerHTML = `
        <div class="wrong-feedback">
            <i class="fas fa-times-circle"></i>
            <div>Non è corretto! Prova ancora.</div>
            <div>La tua parola: <strong>${word}</strong></div>
        </div>
        `;
        
        setTimeout(() => {
        document.getElementById('puzzle-feedback').classList.remove('wrong');
        this.updatePuzzleDisplay();
        }, 2000);
    }
    }

    resetPuzzle() {
    const pieces = document.querySelectorAll('.puzzle-piece');
    const slots = document.querySelectorAll('.target-slot');
    
    // Resetta stato
    Object.keys(this.puzzleState.pieces).forEach(pieceId => {
        this.puzzleState.pieces[pieceId].inSlot = null;
    });
    
    Object.keys(this.puzzleState.target).forEach(slotId => {
        this.puzzleState.target[slotId].occupied = false;
        this.puzzleState.target[slotId].piece = null;
    });
    
    // Resetta DOM
    slots.forEach((slot, index) => {
        slot.innerHTML = `<div class="slot-placeholder">${index + 1}</div>`;
        slot.classList.remove('drag-over', 'correct');
    });
    
    pieces.forEach(piece => {
        document.querySelector('.source-pieces').appendChild(piece);
        piece.classList.remove('dragging', 'correct');
    });
    
    this.updatePuzzleDisplay();
    }

    solvePuzzle() {
    const solution = this.puzzleState.solution.split('');
    const pieces = {};
    
    // Organizza pezzi per lettera
    Object.values(this.puzzleState.pieces).forEach(piece => {
        if (!pieces[piece.letter]) pieces[piece.letter] = [];
        pieces[piece.letter].push(piece);
    });
    
    // Piazzale nell'ordine corretto
    solution.forEach((letter, index) => {
        const slotId = `slot-${index}`;
        const slot = this.puzzleState.target[slotId];
        
        if (slot && pieces[letter] && pieces[letter].length > 0) {
        const piece = pieces[letter].shift();
        
        // Rimuovi da slot precedente
        if (piece.inSlot) {
            const prevSlot = this.puzzleState.target[piece.inSlot];
            if (prevSlot) {
            prevSlot.occupied = false;
            prevSlot.piece = null;
            prevSlot.element.innerHTML = '<div class="slot-placeholder">' + 
                (parseInt(piece.inSlot.split('-')[1]) + 1) + '</div>';
            }
        }
        
        // Posiziona nel nuovo slot
        slot.element.innerHTML = '';
        slot.element.appendChild(piece.element);
        slot.occupied = true;
        slot.piece = piece.element.id;
        piece.inSlot = slotId;
        }
    });
    
    this.updatePuzzleDisplay();
    }

  /* =========================================================
     UTILITY FUNCTIONS
  ========================================================= */
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
  
  showResult(title, message, score) {
    const resultsModal = document.getElementById('results-modal');
    const resultsBody = document.getElementById('results-body');
    
    resultsBody.innerHTML = `
        <div class="score-display">
        <div class="score-value">${score}</div>
        <div class="score-label">PUNTI</div>
        </div>
        <div class="result-message">${message}</div>
        <div class="coins-earned">
        <i class="fas fa-coins"></i> +${Math.floor(score / 10)} monete
        </div>
    `;
    
    this.closeModal();
    resultsModal.classList.add('active');
    
    // Aggiorna monete
    this.gameData.stats.coins += Math.floor(score / 10);
    this.saveGameData();
    this.updateStats();
    
    if (score === 100) {
        // Punteggio perfetto
        setTimeout(() => {
        this.showSpecialDuck('perfect');
        }, 1000);
    } else if (this.gameData.stats.coins >= 100 && this.gameData.stats.coins % 100 === 0) {
        // Ogni 100 monete
        setTimeout(() => {
        this.showSpecialDuck('milestone');
        }, 1000);
    }
    }
  
  updateGameStats(gameType, score) {
    if (!this.gameData.games[gameType]) {
        this.gameData.games[gameType] = { bestScore: 0, plays: 0 };
    }
    
    const oldBest = this.gameData.games[gameType].bestScore;
    
    this.gameData.games[gameType].plays++;
    
    if (score > this.gameData.games[gameType].bestScore) {
        this.gameData.games[gameType].bestScore = score;
        if (score > oldBest && oldBest > 0) {
        setTimeout(() => {
            this.showSpecialDuck('record');
        }, 500);
        }
    }
    
    this.gameData.stats.gamesPlayed++;
    this.gameData.stats.wins += score >= 50 ? 1 : 0;
    
    this.saveGameData();
    this.updateStats();
    }
  
  showGameModal() {
    const modal = document.getElementById('game-modal');
    modal.classList.add('active');
  }
  
  closeModal() {
    const modal = document.getElementById('game-modal');
    modal.classList.remove('active');
    this.activeGameInstance = null;
  }
  
  closeResults() {
    const resultsModal = document.getElementById('results-modal');
    resultsModal.classList.remove('active');
  }
  
  restartGame() {
    this.closeResults();
    this.startGame(this.currentGame);
  }
  
  updateStats() {
    // Statistiche globali
    document.getElementById('total-coins').textContent = this.gameData.stats.coins;
    document.getElementById('total-stars').textContent = this.gameData.stats.stars;
    document.getElementById('games-played').textContent = this.gameData.stats.gamesPlayed;
    document.getElementById('total-time').textContent = `${Math.floor(this.gameData.stats.totalTime / 60)}h`;
    
    const winRate = this.gameData.stats.gamesPlayed > 0 
      ? Math.floor((this.gameData.stats.wins / this.gameData.stats.gamesPlayed) * 100)
      : 0;
    document.getElementById('win-rate').textContent = `${winRate}%`;
    
    // Aggiorna record specifici
    const games = this.gameData.games;
    
    // Quiz Italiano
    const quizScore = games['quiz-italiano']?.bestScore || 0;
    document.querySelector('[data-game="quiz-italiano"] .score').innerHTML = 
      `<i class="fas fa-trophy"></i> Record: ${quizScore}`;
    
    // Velocità Digitale
    const typingWPM = games['typing-speed']?.bestScore || 0;
    document.querySelector('[data-game="typing-speed"] .score').innerHTML = 
      `<i class="fas fa-bolt"></i> WPM: ${typingWPM}`;
    
    // Puzzle Parole
    const puzzleCompleted = games['word-puzzle']?.completed || 0;
    document.querySelector('[data-game="word-puzzle"] .score').innerHTML = 
      `<i class="fas fa-check-circle"></i> Completati: ${puzzleCompleted}`;
  }
  
  startDuckAnimation() {
    const duck = document.getElementById('minigame-duck');
    const speech = document.getElementById('duck-speech');
    
    // Nascondi inizialmente
    duck.classList.remove('active');
    
    const messages = [
        "Bella mossa! 🎮",
        "Record battuto! 🏆",
        "Sei un campione! 👑",
        "Punteggio perfetto! ⭐",
        "Wow, impressionante! 🤯"
    ];
    
    // Funzione per mostrare il pulcino in occasioni speciali
    this.showSpecialDuck = (achievement) => {
        duck.classList.add('active');
        speech.textContent = "La G La U La E";
        
        // Nascondi dopo 5 secondi
        setTimeout(() => {
        duck.classList.remove('active');
        }, 5000);
    };
    
    // Attiva easter egg con sequenza segreta
    let keySequence = [];
    const secretCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    
    document.addEventListener('keydown', (e) => {
        keySequence.push(e.key);
        
        // Mantieni solo gli ultimi 10 tasti
        if (keySequence.length > secretCode.length) {
        keySequence.shift();
        }
        
        // Controlla se la sequenza corrisponde
        const sequenceString = keySequence.join(',');
        const secretString = secretCode.join(',');
        
        if (sequenceString === secretString) {
        this.showSpecialDuck('secret');
        keySequence = []; // Resetta sequenza
        this.showToast('Easter egg sbloccato! 🐥', 'success');
        }
    });
    }

    setupSecretTriggers() {
        const allGamesPlayed = Object.values(this.gameData.games)
            .every(game => game.plays > 0);
        
        if (allGamesPlayed && !this.gameData.stats.allGamesUnlocked) {
            setTimeout(() => {
            this.showSpecialDuck('completionist');
            this.showToast('Hai provato tutti i giochi! 🏆', 'success');
            }, 1000);
            this.gameData.stats.allGamesUnlocked = true;
            this.saveGameData();
        }
        const today = new Date().toDateString();
        if (this.gameData.stats.lastPlayDate !== today) {
            this.gameData.stats.lastPlayDate = today;
            this.saveGameData();
            setTimeout(() => {
            this.showToast('Buon divertimento con i minigiochi di oggi! 🎮', 'info');
            }, 2000);
        }
        const hour = new Date().getHours();
        const specialHours = [12, 18, 21];
        if (specialHours.includes(hour) && Math.random() < 0.3) {
            setTimeout(() => {
            this.showSpecialDuck('time');
            }, 3000);
        }
        }
}

// Inizializza quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
  window.minigamesManager = new MinigamesManager();
});