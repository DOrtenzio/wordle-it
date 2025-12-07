const https = require('https');
const http = require('http');

class AutoPinger {
  constructor() {
    this.url = process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 3000}`;
    this.isProduction = process.env.NODE_ENV === 'production';
    this.intervalId = null;
    this.failureCount = 0;
    this.maxFailures = 5;
  }
  
  start() {
    if (!this.isProduction) {
      return;
    }
    
    setTimeout(() => {
      this.pingServer();
    }, 10000);
    
    this.intervalId = setInterval(() => {
      this.pingServer();
    }, 49000); 
  }
  
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
  
  pingServer() {
    const timestamp = new Date().toISOString();
    
    const url = new URL(`${this.url}/health`);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'GET',
      timeout: 15000, 
      headers: {
        'User-Agent': 'Wordle-AutoPinger/1.0',
        'Accept': 'application/json'
      }
    };
    
    const protocol = url.protocol === 'https:' ? https : http;
    
    const req = protocol.request(options, (res) => {
      let data = '';
      
      res.on('data', chunk => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          this.failureCount = 0; // Reset contatore errori
          try {
            const json = JSON.parse(data);
          } catch (e) {
          }
        } else {
          this.failureCount++;
        }
      });
    });
    
    req.on('error', (err) => {
      this.failureCount++;
      
      if (this.failureCount >= this.maxFailures) {
      }
    });
    
    req.on('timeout', () => {
      this.failureCount++;
      req.destroy();
    });
    
    req.end();
  }
}

module.exports = AutoPinger;

if (require.main === module) {
  const pinger = new AutoPinger();
  pinger.isProduction = true;
  pinger.testPing();
}