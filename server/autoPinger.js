const https = require('https');
const http = require('http');
const nodeCron = require('node-cron');

class AutoPinger {
  constructor() {
    this.url = process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 3000}`;
    this.isProduction = process.env.NODE_ENV === 'production';
  }
  
  start() {
    if (!this.isProduction) {
      console.log('Auto-ping disattivato in sviluppo');
      return;
    }
    
    console.log('🔄 Auto-ping attivato per:', this.url);
    
    // Ping ogni 8 minuti (Render dorme dopo 15 minuti)
    nodeCron.schedule('*/8 * * * *', () => {
      this.pingServer();
    });
    
    // Ping immediato all'avvio
    setTimeout(() => this.pingServer(), 5000);
  }
  
  pingServer() {
    const url = new URL(this.url);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: '/health',
      method: 'GET',
      timeout: 10000
    };
    
    const protocol = url.protocol === 'https:' ? https : http;
    
    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`✅ Ping riuscito: ${this.url} - Status: ${res.statusCode}`);
      });
    });
    
    req.on('error', (err) => {
      console.warn(`⚠️  Ping fallito: ${err.message}`);
    });
    
    req.on('timeout', () => {
      console.warn(`⏱️  Ping timeout per ${this.url}`);
      req.destroy();
    });
    
    req.end();
  }
}

module.exports = AutoPinger;