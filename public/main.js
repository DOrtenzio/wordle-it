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