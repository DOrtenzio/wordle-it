// Configurazioni globali e inizializzazione
document.addEventListener('DOMContentLoaded', function() {
  // Carica tema
  const savedTheme = localStorage.getItem('wordle_theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark');
  }
  
  // Inizializza gioco online
  window.wordleOnline = new WordleOnline();
  
  // Connetti WebSocket
  setTimeout(() => {
    window.wordleOnline.connectWebSocket();
  }, 1000);
  
  // Focus sul nome giocatore
  document.getElementById('player-name').focus();
  
  // Auto-uppercase per codice stanza
  document.getElementById('room-code-input').addEventListener('input', function(e) {
    this.value = this.value.toUpperCase();
  });
});

(function initEasterEgg() {
  let clickCount = 0;
  const maxClicks = 11;
  let resetTimeout = null;
  
  // Frasi motivazionali in italiano
  const motivationalQuotes = [
    "Continua così, sei fantastico! 🌟",
    "Non mollare mai! 💪",
    "Sei un campione delle parole! 🏆",
    "Forza, ce la puoi fare! 🚀",
    "Credici sempre! ✨",
    "Ogni parola è un passo avanti! 👣",
    "Il successo ti aspetta! 🎯",
    "Sei più forte di quanto pensi! 💎",
    "La vittoria è vicina! 🏅",
    "Tu sei speciale! 🌈",
    "Keep calm e gioca a Wordle! 😎",
    "Wordle master in arrivo! 👑",
    "Le parole sono dalla tua parte! 📚",
    "Genio delle lettere! 🧠",
    "Straordinario! Continua così! ⭐",
    "Quack quack! Sono fiero di te! 🦆",
    "Le papere credono in te! 🦆💕",
    "Vola alto come una papera! 🦆✈️",
    "Moneoo o Ooenom questo è il dilemma! 💀🥸"
  ];
  
  document.addEventListener('DOMContentLoaded', function() {
    const title = document.querySelector('.game-header h1');
    
    if (!title) {
      return;
    }
    
    // Crea il container della papera (nascosto)
    createDuckContainer();
    
    // Aggiungi event listener
    title.style.cursor = 'pointer';
    title.style.userSelect = 'none';
    
    title.addEventListener('click', function(e) {
      handleTitleClick(e);
    });
  });
  
  // Crea il container HTML della papera
  function createDuckContainer() {
    const duckHTML = `
      <div class="easter-egg-duck" id="easterEggDuck">
        <div class="duck-speech" id="duckSpeech">
          Continua così, sei fantastico! 🌟
        </div>
        <div class="duck-character">🦆</div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', duckHTML);
  }
  
  // Gestisce il click sul titolo
  function handleTitleClick(e) {
    clickCount++;
    
    const title = e.currentTarget;
    
    // Effetto visivo sul click
    title.style.transform = 'scale(0.95)';
    setTimeout(() => {
      title.style.transform = 'scale(1)';
    }, 100);
    
    // Crea particella al click
    createParticle(e.clientX, e.clientY);
    
    // Reset timer - se non clicca per 3 secondi, reset
    clearTimeout(resetTimeout);
    resetTimeout = setTimeout(() => {
      clickCount = 0;
    }, 3000);
    
    // Effetti speciali a metà strada
    if (clickCount === 5) {
      createMultipleParticles(e.clientX, e.clientY);
      playMiniSound(300);
    }
    
    if (clickCount === 8) {
      createMultipleParticles(e.clientX, e.clientY);
      playMiniSound(400);
    }
    
    // Easter egg attivato!
    if (clickCount === maxClicks) {
      activateEasterEgg();
      clickCount = 0;
    }
  }
  
  // Attiva l'easter egg
  function activateEasterEgg() {
    
    const duckContainer = document.getElementById('easterEggDuck');
    const duckSpeech = document.getElementById('duckSpeech');
    
    if (!duckContainer) return;
    
    // Scegli frase casuale
    const randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
    duckSpeech.textContent = randomQuote;
    console.log("Frase: "+randomQuote);
    
    // Mostra la papera
    duckContainer.classList.add('active');
    
    // Suono quack
    playQuackSound();
    
    // Effetto confetti
    createConfetti();
    
    // Rimuovi dopo l'animazione (15 secondi)
    setTimeout(() => {
      duckContainer.classList.remove('active');
    }, 15000);
  }
  
  // Crea particella singola
  function createParticle(x, y) {
    const particle = document.createElement('div');
    particle.className = 'duck-particle';
    
    const emojis = ['✨', '⭐', '💫', '🌟', '💖', '🎵'];
    particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    
    particle.style.left = x + 'px';
    particle.style.top = y + 'px';
    particle.style.position = 'fixed';
    particle.style.zIndex = '9999';
    particle.style.pointerEvents = 'none';
    
    document.body.appendChild(particle);
    
    setTimeout(() => particle.remove(), 2000);
  }
  
  // Crea multiple particelle
  function createMultipleParticles(x, y) {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        createParticle(
          x + (Math.random() - 0.5) * 100,
          y + (Math.random() - 0.5) * 100
        );
      }, i * 50);
    }
  }
  
  // Effetto confetti
  function createConfetti() {
    const confettiCount = 30;
    const confettiEmojis = ['🎊', '🎉', '🎈', '🎁', '🎀', '🦆', '💝', '⭐'];
    
    for (let i = 0; i < confettiCount; i++) {
      setTimeout(() => {
        const confetti = document.createElement('div');
        confetti.className = 'duck-particle';
        confetti.textContent = confettiEmojis[Math.floor(Math.random() * confettiEmojis.length)];
        
        confetti.style.left = Math.random() * window.innerWidth + 'px';
        confetti.style.top = '-50px';
        confetti.style.position = 'fixed';
        confetti.style.zIndex = '9999';
        confetti.style.pointerEvents = 'none';
        confetti.style.fontSize = '24px';
        confetti.style.animation = `particleFloat ${2 + Math.random() * 2}s ease-out forwards`;
        
        document.body.appendChild(confetti);
        
        setTimeout(() => confetti.remove(), 4000);
      }, i * 50);
    }
  }
  
  // Suono mini (feedback click)
  function playMiniSound(frequency) {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
      // Audio non disponibile
    }
  }
  
  // Suono quack della papera
  function playQuackSound() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Simula un quack
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.2);
      oscillator.type = 'sawtooth';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
      
      // Secondo quack
      setTimeout(() => {
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        
        osc2.frequency.setValueAtTime(380, audioContext.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(180, audioContext.currentTime + 0.2);
        osc2.type = 'sawtooth';
        
        gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        osc2.start(audioContext.currentTime);
        osc2.stop(audioContext.currentTime + 0.3);
      }, 300);
      
    } catch (e) {
    }
  }
})();