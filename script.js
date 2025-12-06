let word = WORDS_IT[Math.floor(Math.random() * WORDS_IT.length)];
let attempts = 0;
const maxAttempts = 6;
let currentInput = "";

const board = document.getElementById("board");
const message = document.getElementById("message");
const keyboard = document.getElementById("keyboard");

// CREA GRIGLIA
for (let i = 0; i < maxAttempts * 5; i++) {
  const tile = document.createElement("div");
  tile.classList.add("tile");
  board.appendChild(tile);
}

// CREA TASTIERA VIRTUALE
const keyboardLayout = [
  "qwertyuiop",
  "asdfghjkl",
  "↩zxcvbnm⌫"
];

keyboardLayout.forEach(row => {
  const rowDiv = document.createElement("div");
  rowDiv.classList.add("key-row");

  row.split("").forEach(char => {
    const key = document.createElement("button");
    key.classList.add("key");

    if (char === "↩" || char === "⌫") {
      key.classList.add("special");
    }

    key.textContent = char;
    key.onclick = () => handleKey(char);

    rowDiv.appendChild(key);
  });

  keyboard.appendChild(rowDiv);
});

// HANDLER TASTIERA
document.addEventListener("keydown", e => {
  if (e.key.match(/^[a-zA-Z]$/) && currentInput.length < 5) {
    addLetter(e.key);
  }
  if (e.key === "Backspace") removeLetter();
  if (e.key === "Enter") submitWord();
});

function handleKey(char) {
  if (char === "⌫") removeLetter();
  else if (char === "↩") submitWord();
  else if (currentInput.length < 5) addLetter(char);
}

function addLetter(letter) {
  letter = letter.toLowerCase();
  if (currentInput.length === 5) return;

  let tile = board.children[attempts * 5 + currentInput.length];
  tile.textContent = letter;
  tile.classList.add("pop");

  setTimeout(() => tile.classList.remove("pop"), 150);

  currentInput += letter;
}

function removeLetter() {
  if (currentInput.length === 0) return;

  currentInput = currentInput.slice(0, -1);
  let tile = board.children[attempts * 5 + currentInput.length];
  tile.textContent = "";
}

function submitWord() {
  if (currentInput.length < 5) {
    message.textContent = "La parola deve avere 5 lettere.";
    return;
  }

  if (!WORDS_IT.includes(currentInput)) {
    message.textContent = "Parola non nel dizionario.";
    return;
  }

  checkWord();
}

function checkWord() {
  const guess = currentInput;
  const rowStart = attempts * 5;

  let wordCopy = word.split("");

  // flip animato
  for (let i = 0; i < 5; i++) {
    let tile = board.children[rowStart + i];

    setTimeout(() => {
      tile.classList.add("flip");

      let letter = guess[i];

      if (letter === word[i]) {
        tile.classList.add("correct");
        updateKeyboard(letter, "correct");
        wordCopy[i] = null;
      }
    }, i * 300);
  }

  // seconda passata per presenti/assenti
  setTimeout(() => {
    for (let i = 0; i < 5; i++) {
      let tile = board.children[rowStart + i];
      let letter = guess[i];

      if (!tile.classList.contains("correct")) {
        if (wordCopy.includes(letter)) {
          tile.classList.add("present");
          updateKeyboard(letter, "present");
          wordCopy[wordCopy.indexOf(letter)] = null;
        } else {
          tile.classList.add("absent");
          updateKeyboard(letter, "absent");
        }
      }
    }

    finalizeAttempt(guess);

  }, 1600);

}

function updateKeyboard(letter, state) {
  const key = [...document.querySelectorAll(".key")]
    .find(k => k.textContent.toLowerCase() === letter);

  if (key) {
    if (state === "correct") key.classList.add("correct");
    else if (state === "present" && !key.classList.contains("correct"))
      key.classList.add("present");
    else if (!key.classList.contains("correct") &&
             !key.classList.contains("present"))
      key.classList.add("absent");
  }
}

function finalizeAttempt(guess) {
  if (guess === word) {
    message.textContent = "Bravo! La parola era: " + word.toUpperCase();
    disableInput();
    return;
  }

  attempts++;
  currentInput = "";

  if (attempts === maxAttempts) {
    message.textContent = "Hai perso! La parola era: " + word.toUpperCase();
    disableInput();
  }
}

function disableInput() {
  document.removeEventListener("keydown", handleKey);
  keyboard.style.opacity = 0.4;
}