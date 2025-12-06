let word = WORDS_IT[Math.floor(Math.random() * WORDS_IT.length)].toLowerCase();
let attempts = 0;
const maxAttempts = 6;

const board = document.getElementById("board");
const input = document.getElementById("guess-input");
const btn = document.getElementById("guess-btn");
const message = document.getElementById("message");

// crea caselle
for (let i = 0; i < maxAttempts * 5; i++) {
  const tile = document.createElement("div");
  tile.classList.add("tile");
  board.appendChild(tile);
}

btn.addEventListener("click", guess);

function guess() {
  let attempt = input.value.toLowerCase().trim();

  if (attempt.length !== 5) {
    message.textContent = "La parola deve avere 5 lettere.";
    return;
  }

  if (!WORDS_IT.includes(attempt)) {
    message.textContent = "Parola non valida nel dizionario.";
    return;
  }

  const offset = attempts * 5;

  for (let i = 0; i < 5; i++) {
    const tile = board.children[offset + i];
    tile.textContent = attempt[i];

    if (attempt[i] === word[i]) {
      tile.classList.add("correct");
    } else if (word.includes(attempt[i])) {
      tile.classList.add("present");
    } else {
      tile.classList.add("absent");
    }
  }

  attempts++;

  if (attempt === word) {
    message.textContent = "Bravo! La parola era: " + word;
    btn.disabled = true;
    return;
  }

  if (attempts === maxAttempts) {
    message.textContent = "Hai perso! La parola era: " + word;
    btn.disabled = true;
  }

  input.value = "";
}
