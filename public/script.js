const socket = io();

//define ingame variables for future values
let gameId = null;
let mySymbol = null;
let myNickname = null;

//get elements from html page
const nicknameInput = document.getElementById("nicknameInput");
const joinBtn = document.getElementById("joinBtn");
const statusDiv = document.getElementById("status");
const boardDiv = document.getElementById("board");

// create the 3x3 grid of cells (default in tictactoe)
const cells = [];
for (let i = 0; i < 9; i++) {
  const cell = document.createElement("div");
  cell.classList.add("cell");
  cell.addEventListener("click", () => {
    // only move if we have a game running and a symbol (o,x) assigned to current player
    if (gameId && mySymbol) {
      socket.emit("makeMove", { gameId, index: i });
    }
  });
  boardDiv.appendChild(cell); //add to page as element to show to user
  cells.push(cell); //add to array with cells for storing
}

//  join game
joinBtn.addEventListener("click", () => {
  myNickname = nicknameInput.value.trim();
  if (!myNickname) {
    alert("cant be null, enter something as nickname");
    return;
  }
  socket.emit("joinGame", myNickname);
});

// Socket listeners
socket.on("waiting", (message) => {
  statusDiv.textContent = message;
});

//handle game start
socket.on("gameStarted", (data) => {
  gameId = data.gameId;
  mySymbol = data.symbol;
  const opponentNickname = data.opponent;
  statusDiv.textContent = `game started. you are ${mySymbol}. opponent is: ${opponentNickname}`;

  // Clear the board
  cells.forEach((cell) => (cell.textContent = ""));
});

// handle updateBoard to update the game state
socket.on("updateBoard", (data) => {
  // extract the current board state and whose turn it is
  const { board, currentTurn } = data;

  // update the text content of each cell in the game board
  for (let i = 0; i < 9; i++) {
    // if the cell is filled, display the symbol; if not, clear the cell
    cells[i].textContent = board[i] ? board[i] : "";
  }

  // update the status to show whose turn it is
  statusDiv.textContent = `${currentTurn}'s turn`;
});

// socket.on('gameOver', (data) => {
//     const { board, winner } = data;
//     for (let i = 0; i < 9; i++) {
//         cells[i].textContent = board[i] ? board[i] : '';
//     }
//     if (winner) {
//         if (winner === myNickname) {
//             statusDiv.textContent = 'You won';
//         } else {
//             statusDiv.textContent = `${winner} won`;
//         }
//     } else {
//         statusDiv.textContent = "draw, no winner";
//     }
// });

socket.on("gameOver", (data) => {
  const winAudio = document.getElementById("winSound");
  const loseAudio = document.getElementById("loseSound");

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
      // victory effects
      winAudio.play();
      statusDiv.textContent = "🎉 You won!";
      statusDiv.classList.add("winner-status");
      statusDiv.classList.remove("loser-status");

      // confetti animation
      const duration = 3000;
      const end = Date.now() + duration;
      (function frame() {
        confetti({
          particleCount: 7,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ["#FFD700", "#FF0000", "#00FF00"],
        });
        confetti({
          particleCount: 7,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ["#FFD700", "#FF0000", "#00FF00"],
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      })();
    } else {
      // defeat effects
      loseAudio.play();
      statusDiv.textContent = "😢 You lost...";
      statusDiv.classList.add("loser-status");
      statusDiv.classList.remove("winner-status");

      // rain animation
      const count = 200;
      const defaults = {
        origin: { y: 0 },
        gravity: 0.8,
        scalar: 1.2,
      };

      function fire(particleRatio, opts) {
        confetti(
          Object.assign({}, defaults, opts, {
            particleCount: Math.floor(count * particleRatio),
            colors: ["#1E90FF", "#4169E1", "#0000FF"],
            shapes: ["circle"],
            ticks: 200,
            drift: 0.5,
          })
        );
      }

      fire(0.5, { spread: 50 });
      fire(0.3, { spread: 100 });
      fire(0.2, { spread: 150 });
    }
  } else {
    // draw
    statusDiv.textContent = "🤝 Draw!";
    statusDiv.classList.remove("winner-status", "loser-status");
  }

  // reset game after 5 seconds
  setTimeout(() => {
    gameId = null;
    mySymbol = null;
    statusDiv.textContent = 'Press "Join Game" to start new match';
    statusDiv.classList.remove("winner-status", "loser-status");
  }, 5000);
});

socket.on("opponentDisconnected", () => {
  statusDiv.textContent = "opponent disconnected";
});
