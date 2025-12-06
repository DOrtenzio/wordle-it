# 🎮 Wordle ITA Online

**Gioca a Wordle in italiano con amici in tempo reale!**  
Un clone del famoso gioco di parole con modalità multiplayer online.

![Wordle ITA Online](https://img.shields.io/badge/Wordle-ITA-blue) 
![Multiplayer](https://img.shields.io/badge/Multiplayer-Online-green) 
![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ Caratteristiche

### 🎯 Modalità Singleplayer
- **Wordle classico** in italiano
- **6 tentativi** per indovinare parole di 5 lettere
- **Tastiera colorata** con feedback visivo
- **Statistiche personali** (vittorie, streak, record)
- **Tema chiaro/scuro** con persistenza

### 👥 Modalità Multiplayer Online
- **Stanze private** con codice (2-4 giocatori)
- **Turni in tempo reale** con timer
- **Chat integrata** durante il gioco
- **Classifica live** con punteggio
- **Partite a più round** (default: 3)
- **Auto-ping** per mantenere server attivo

### 🎨 Design Moderno
- UI responsive e animazioni fluide
- Tastiera virtuale con colorazione progressiva
- Animazioni flip per le lettere
- Dark/Light mode toggle
- Mobile-friendly

## 🚀 Quick Start

### Prerequisiti
- Node.js 16+ e npm
- Git

### Installazione Locale

```bash
# 1. Clona il repository
git clone https://github.com/tuo-username/wordle-ita-online.git
cd wordle-ita-online

# 2. Installa dipendenze del server
cd server
npm install

# 3. Avvia il server di sviluppo
npm run dev

# 4. Apri il browser su
http://localhost:3000
```

### Deploy su Render (GRATIS)

1. **Push su GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy su Render.com**
   - Vai su [render.com](https://render.com)
   - Clicca "New +" → "Web Service"
   - Connetti il tuo repository GitHub
   - Configura:
     - **Name**: `wordle-online`
     - **Environment**: `Node`
     - **Build Command**: `npm install`
     - **Start Command**: `node server.js`
   - Clicca "Create Web Service"

3. **Ottieni URL**: `https://wordle-online.onrender.com`

## 📁 Struttura Progetto

```
wordle-ita-online/
├── public/                    # Frontend (HTML, CSS, JS)
│   ├── index.html            # Pagina principale
│   ├── style.css             # Stili principali
│   ├── game.css              # Stili gioco
│   ├── online.js             # Logica multiplayer
│   ├── singleplayer.js       # Logica singleplayer
│   └── words_it.js           # Dizionario italiano
├── server/                   # Backend Node.js
│   ├── server.js            # Server principale
│   ├── roomManager.js       # Gestione stanze
│   ├── gameManager.js       # Logica gioco
│   ├── autoPinger.js        # Mantiene server attivo
│   ├── package.json         # Dipendenze
|   ├── words_it.js           # Dizionario italiano
│   └── render.yaml          # Configurazione Render
├── .gitignore               # File da ignorare
└── README.md                # Questo file
```

## 🔧 Configurazione

### Variabili d'Ambiente (opzionale)

Crea `server/.env`:
```env
NODE_ENV=development
PORT=3000
WS_PORT=8080
RENDER_EXTERNAL_URL=http://localhost:3000
```

### Dizionario Personalizzato

Modifica `public/words_it.js` per aggiungere/rimuovere parole:
```javascript
const WORDS_IT = [
  "abate", "abete", "abile", "abiti", "abuso",
  "acaro", "accio", "acido", "acqua", "acume",
  // ... altre parole
];
```

## 🎮 Come Giocare Online

1. **Crea una stanza**
   - Inserisci il tuo nome
   - Clicca "Crea Stanza Online"
   - Condividi il codice con gli amici

2. **Unisciti a una stanza**
   - Inserisci il tuo nome
   - Digita il codice stanza (es: ABCD)
   - Clicca "Unisciti"

3. **Inizia a giocare**
   - Tutti i giocatori cliccano "Pronto"
   - L'host clicca "Inizia Partita"
   - Giocate a turni (2 minuti ciascuno)
   - Vince chi totalizza più punti in 3 round

## 🏆 Sistema Punteggio

| Tentativi | Punteggio Base | Bonus Tempo |
|-----------|----------------|-------------|
| 1         | 1000           | +5/secondo  |
| 2         | 900            | +4/secondo  |
| 3         | 800            | +3/secondo  |
| 4         | 700            | +2/secondo  |
| 5         | 600            | +1/secondo  |
| 6         | 500            | 0           |

**Formula**: `Punteggio = Base - (100 × (tentativi-1)) + ((120 - tempo_usato) × 5)`

## 🌐 Hosting Gratuito

### Render.com (Raccomandato)
- **750 ore/mese** gratis (abbastanza per sempre acceso)
- **Supporta WebSocket** su stessa porta
- **Dominio gratis**: `tuoprogetto.onrender.com`
- **Auto-ping integrato** previene sleep

### Alternative
- **Railway.app**: $5 crediti gratis/mese
- **Replit.com**: Zero configurazione
- **Glitch.com**: Facile ma si spegne spesso

## 🔌 API Endpoints

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/` | GET | Frontend principale |
| `/health` | GET | Health check server |
| `/api/stats` | GET | Statistiche live |
| `ws://...` | WebSocket | Comunicazione real-time |

## 🛠️ Comandi Utili

```bash
# Sviluppo locale
cd server
npm run dev          # Avvia server con nodemon

# Produzione
npm start           # Avvia server produzione

# Test WebSocket
curl http://localhost:3000/health
```

## 🤝 Contribuire

1. Fork il repository
2. Crea un branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Apri una Pull Request

## 📄 Licenza

Distribuito sotto licenza MIT. Vedi `LICENSE` per maggiori informazioni.

## 👨‍💻 Autore

**Moneoo** - [@DOrtenzio](https://github.com/DOrtenzio)

## 🙏 Ringraziamenti

- Ispirato dal gioco originale [Wordle](https://www.nytimes.com/games/wordle)
- Dizionario italiano da [paroleitaliane](https://github.com/napolux/paroleitaliane)
- Icone da [Font Awesome](https://fontawesome.com)

---

**Divertiti a giocare!** 🎯✨

Se ti piace il progetto, lascia una ⭐ su GitHub!