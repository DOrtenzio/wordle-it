const https = require('https');
const http = require('http');

class AutoPinger {
  constructor() {
    this.url = process.env.RENDER_EXTERNAL_URL || 'https://wordle-it.onrender.com';
    this.isProduction = process.env.NODE_ENV === 'production';
    this.intervalId = null;
  }
  
  start() {
    console.log(`🚀 AutoPinger avviato su: ${this.url}`);
    
    setTimeout(() => this.pingServer(), 30000);
    
    this.intervalId = setInterval(() => {
      this.pingServer();
    }, 45000); 
  }

  pingServer() {
    try {
      const url = new URL(`${this.url}/health`);
      const protocol = url.protocol === 'https:' ? https : http;

      console.log(`📡 Ping in corso a ${url.href}...`);

      const req = protocol.get(url.href, (res) => {
        console.log(`✅ Risposta ricevuta: ${res.statusCode}`);
      });

      req.on('error', (err) => {
        console.error(`❌ Errore durante il ping: ${err.message}`);
      });

      req.on('timeout', () => {
        console.error('⚠️ Timeout del ping');
        req.destroy();
      });

    } catch (error) {
      console.error('❌ Errore URL Pinger:', error.message);
    }
  }
}

module.exports = AutoPinger;