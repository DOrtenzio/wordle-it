/* =========================================================
   WORDLE INFINITO ITA - VERSIONE MODERNA & FIXATA
   Tastiera • Animazioni • Statistiche • Tema • Modalità difficile
   ========================================================= */

let word = "";                
let attempts = 0;             
const maxAttempts = 6;        
let currentInput = "";        
let hardMode = false;         
let mustInclude = [];         
let mustMatch = {};           

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

  board.innerHTML = "";
  for (let i = 0; i < maxAttempts * 5; i++) {
    const tile = document.createElement("div");
    tile.classList.add("tile");
    board.appendChild(tile);
  }

  [...document.querySelectorAll(".key")].forEach(k => {
    k.classList.remove("correct", "present", "absent");
  });

  hidePopup();
  hideStats();
}

/* =========================================================
   2. TOAST / MESSAGGI
========================================================= */

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1200);
}

/* =========================================================
   3. TASTIERA VIRTUALE
========================================================= */

const layout = ["qwertyuiop","asdfghjkl","↩zxcvbnm⌫"];

function createKeyboard() {
  layout.forEach(row=>{
    const rowDiv = document.createElement("div");
    rowDiv.classList.add("key-row");
    row.split("").forEach(ch=>{
      const key = document.createElement("button");
      key.classList.add("key");
      if(ch==="↩"||ch==="⌫") key.classList.add("special");
      key.textContent = ch;
      key.onclick=()=>handleKey(ch);
      rowDiv.appendChild(key);
    });
    keyboard.appendChild(rowDiv);
  });
}

function handleKey(k){
  if(k==="⌫") return removeLetter();
  if(k==="↩") return submitWord();
  if(/^[a-z]$/i.test(k)) addLetter(k);
}

/* =========================================================
   4. GESTIONE INPUT
========================================================= */

document.addEventListener("keydown",e=>{
  if(/^[a-z]$/i.test(e.key)) addLetter(e.key);
  if(e.key==="Backspace") removeLetter();
  if(e.key==="Enter") submitWord();
});

function addLetter(letter){
  if(currentInput.length>=5 || attempts>=maxAttempts) return;
  currentInput+=letter.toLowerCase();
  const tile = board.children[attempts*5 + currentInput.length -1];
  tile.textContent=letter.toUpperCase();
  tile.classList.add("pop");
  setTimeout(()=>tile.classList.remove("pop"),150);
}

function removeLetter(){
  if(currentInput.length===0) return;
  const idx=currentInput.length-1;
  const tile=board.children[attempts*5+idx];
  tile.textContent="";
  currentInput=currentInput.slice(0,-1);
}

/* =========================================================
   5. MODALITÀ DIFFICILE
========================================================= */

function validateHardMode(guess){
  for(let l of mustInclude){
    if(!guess.includes(l)){ showToast(`Devi includere: ${l.toUpperCase()}`); return false;}
  }
  for(let pos in mustMatch){
    if(guess[pos]!==mustMatch[pos]){ showToast(`La lettera ${mustMatch[pos].toUpperCase()} in posizione ${Number(pos)+1} è obbligatoria`); return false;}
  }
  return true;
}

/* =========================================================
   6. VERIFICA PAROLA
========================================================= */

function submitWord(){
  if(currentInput.length<5){ showToast("Parola troppo corta"); return;}
  if(!WORDS_IT.includes(currentInput)){ showToast("Parola non valida"); return;}
  if(hardMode && !validateHardMode(currentInput)) return;
  checkWord(currentInput);
}

function checkWord(guess){
  const row = attempts*5;
  let wordCopy = word.split("");
  let guessArr = guess.split("");

  for(let i=0;i<5;i++){
    if(guessArr[i]===wordCopy[i]){
      const tile=board.children[row+i];
      setTimeout(()=>tile.classList.add("flip","correct"),i*250);
      updateKeyboard(guessArr[i],"correct");
      mustInclude.push(guessArr[i]);
      mustMatch[i]=guessArr[i];
      wordCopy[i]=null;
      guessArr[i]="*";
    }
  }

  setTimeout(()=>{
    for(let i=0;i<5;i++){
      const tile=board.children[row+i];
      if(tile.classList.contains("correct")) continue;
      const letter=guessArr[i];
      if(wordCopy.includes(letter)){
        tile.classList.add("present");
        updateKeyboard(letter,"present");
        mustInclude.push(letter);
        wordCopy[wordCopy.indexOf(letter)]=null;
      } else {
        tile.classList.add("absent");
        updateKeyboard(letter,"absent");
      }
    }
    finalizeAttempt(guess);
  },1000);
}

/* =========================================================
   7. AGGIORNAMENTO TASTIERA
========================================================= */

function updateKeyboard(letter,status){
  const key=[...document.querySelectorAll(".key")].find(k=>k.textContent.toLowerCase()===letter);
  if(!key) return;
  if(status==="correct"){ key.classList.remove("present"); key.classList.add("correct"); }
  else if(status==="present"){ if(!key.classList.contains("correct")) key.classList.add("present"); }
  else{ if(!key.classList.contains("correct")&&!key.classList.contains("present")) key.classList.add("absent"); }
}

/* =========================================================
   8. FINE PARTITA + STATISTICHE
========================================================= */

function finalizeAttempt(guess){
  if(guess===word){ showToast("Ottimo!"); addStats(true); showPopup(true); return;}
  attempts++;
  if(attempts>=maxAttempts){ showToast("Peccato!"); addStats(false); showPopup(false);}
  currentInput="";
}

/* ----------------- Statistiche ----------------- */

function loadStats(){ return JSON.parse(localStorage.getItem("wordle_stats")||`{"games":0,"wins":0,"streak":0,"best":0}`);}
function saveStats(s){ localStorage.setItem("wordle_stats",JSON.stringify(s));}
function addStats(won){
  let s=loadStats(); s.games++;
  if(won){ s.wins++; s.streak++; if(s.streak>s.best)s.best=s.streak;}
  else s.streak=0;
  saveStats(s);
}

/* ----------------- POPUP ----------------- */

function showPopup(win){
  const overlay=document.getElementById("popup-overlay");
  document.getElementById("popup-title").textContent=win?"Hai vinto!":"Hai perso!";
  document.getElementById("popup-word").textContent="Parola: "+word.toUpperCase();
  overlay.classList.remove("hidden");
}
function hidePopup(){ document.getElementById("popup-overlay").classList.add("hidden"); }

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
   12. AVVIO
========================================================= */

document.addEventListener("DOMContentLoaded", function() {
  // Inizializza le variabili DOM
  board = document.getElementById("board");
  keyboard = document.getElementById("keyboard");
  toast = document.getElementById("toast");

  // Assegna gli event listener solo dopo che il DOM è completamente caricato
  document.getElementById("popup-close").onclick = hidePopup;
  document.getElementById("stats-btn").onclick = showStats;
  document.getElementById("stats-close").onclick = hideStats;
  document.getElementById("stats-overlay").onclick = function(e) {
    if (e.target === this) hideStats();
  };
  document.getElementById("theme-btn").onclick = () => document.body.classList.toggle("dark");
  document.getElementById("hard-btn").onclick = () => {
    hardMode = !hardMode;
    showToast(hardMode ? "Modalità difficile attivata" : "Modalità difficile disattivata");
    document.getElementById("hard-btn").style.background = hardMode ? "#c9b458" : "";
  };
  document.getElementById("new-btn").onclick = newGame;
  
  // Inizializza il gioco
  createKeyboard();
  newGame();
});