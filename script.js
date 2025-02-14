const socket = io();

// game state variables
let gameId = null;
let mySymbol = null;
let myNickname = null;
let lastMoveTime = 0; // to prevent spamming moves

// DOM elements
const nicknameInput = document.getElementById("nicknameInput");
const joinBtn = document.getElementById("joinBtn");
const statusDiv = document.getElementById("status");
const boardDiv = document.getElementById("board");
const loadingSpinner = document.getElementById("loadingSpinner");
const playAgainBtn = document.getElementById("playAgainBtn");

// create the 3x3 grid of cells
const cells = [];
for (let i = 0; i < 9; i++) {
  const cell = document.createElement("div");
  cell.classList.add("cell");
  cell.addEventListener("click", () => {
    // prevent spamming moves (1 move per second)
    if (gameId && mySymbol && Date.now() - lastMoveTime > 1000) {
      socket.emit("makeMove", { gameId, index: i });
      lastMoveTime = Date.now();
    }
  });
  boardDiv.appendChild(cell);
  cells.push(cell);
}

// validate nickname (3-15 characters, alphanumeric only)
function validateNickname(nickname) {
  const regex = /^[a-zA-Z0-9]{3,15}$/;
  return regex.test(nickname);
}

// join game button click handler
joinBtn.addEventListener("click", () => {
  myNickname = nicknameInput.value.trim();
  if (!validateNickname(myNickname)) {
    alert(
      "nickname must be 3-15 characters long and contain only letters and numbers"
    );
    return;
  }
  loadingSpinner.style.display = "block"; // show loading spinner
  socket.emit("joinGame", myNickname);
});

// play again button click handler
playAgainBtn.addEventListener("click", () => {
  gameId = null;
  mySymbol = null;
  statusDiv.textContent = 'Press "Join Game" to start new match';
  playAgainBtn.style.display = "none";
  cells.forEach((cell) => (cell.textContent = ""));
});

// socket listeners
socket.on("waiting", (message) => {
  statusDiv.textContent = message;
});

socket.on("gameStarted", (data) => {
  gameId = data.gameId;
  mySymbol = data.symbol;
  const opponentNickname = data.opponent;
  statusDiv.textContent = `game started. you are ${mySymbol}. opponent is: ${opponentNickname}`;
  loadingSpinner.style.display = "none"; // hide loading spinner
  cells.forEach((cell) => (cell.textContent = ""));
});

socket.on("updateBoard", (data) => {
  const { board, currentTurn } = data;
  for (let i = 0; i < 9; i++) {
    cells[i].textContent = board[i] ? board[i] : "";
  }
  statusDiv.textContent = `${currentTurn}'s turn`;
});

socket.on("gameOver", (data) => {
  const winAudio = document.getElementById("winSound");
  const loseAudio = document.getElementById("loseSound");

  // lazy load audio files
  if (!winAudio.src) winAudio.src = winAudio.getAttribute("data-src");
  if (!loseAudio.src) loseAudio.src = loseAudio.getAttribute("data-src");

  // reset and stop previous sounds
  winAudio.pause();
  winAudio.currentTime = 0;
  loseAudio.pause();
  loseAudio.currentTime = 0;

  // update the board
  const { board, winner } = data;
  for (let i = 0; i < 9; i++) {
    cells[i].textContent = board[i] ? board[i] : "";
  }

  // handle status and effects
  if (winner) {
    if (winner === myNickname) {
      winAudio.play();
      statusDiv.textContent = "🎉 You won!";
      statusDiv.classList.add("winner-status");
      statusDiv.classList.remove("loser-status");
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } else {
      loseAudio.play();
      statusDiv.textContent = "😢 You lost...";
      statusDiv.classList.add("loser-status");
      statusDiv.classList.remove("winner-status");
    }
  } else {
    statusDiv.textContent = "🤝 Draw!";
    statusDiv.classList.remove("winner-status", "loser-status");
  }

  // show play again button
  playAgainBtn.style.display = "block";
});

socket.on("opponentDisconnected", () => {
  statusDiv.textContent = "opponent disconnected";
  playAgainBtn.style.display = "block";
});

// error handling for socket connection
socket.on("connect_error", (err) => {
  statusDiv.textContent = "connection error. please try again later.";
  console.error("connection error:", err);
});
