
const socket = io();

//define ingame variables for future values
let gameId = null;
let mySymbol = null;
let myNickname = null;

//get elements from html page
const nicknameInput = document.getElementById('nicknameInput');
const joinBtn = document.getElementById('joinBtn');
const statusDiv = document.getElementById('status');
const boardDiv = document.getElementById('board');

// create the 3x3 grid of cells (default in tictactoe)
const cells = [];
for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.classList.add('cell');
    cell.addEventListener('click', () => {
        // only move if we have a game running and a symbol (o,x) assigned to current player
        if (gameId && mySymbol) {
            socket.emit('makeMove', { gameId, index: i });
        }
    });
    boardDiv.appendChild(cell); //add to page as element to show to user
    cells.push(cell); //add to array with cells for storing
}

//  join game
joinBtn.addEventListener('click', () => {
    myNickname = nicknameInput.value.trim();
    if (!myNickname) {
        alert('cant be null, enter something as nickname');
        return;
    }
    socket.emit('joinGame', myNickname);
});

// Socket listeners
socket.on('waiting', (message) => {
    statusDiv.textContent = message;
});

//handle game start
socket.on('gameStarted', (data) => {

    gameId = data.gameId;
    mySymbol = data.symbol;
    const opponentNickname = data.opponent;
    statusDiv.textContent = `game started. you are ${mySymbol}. opponent is: ${opponentNickname}`;

    // Clear the board
    cells.forEach(cell => (cell.textContent = ''));
});


// handle updateBoard to update the game state
socket.on('updateBoard', (data) => {
    // extract the current board state and whose turn it is
    const { board, currentTurn } = data;

    // update the text content of each cell in the game board
    for (let i = 0; i < 9; i++) {
        // if the cell is filled, display the symbol; if not, clear the cell
        cells[i].textContent = board[i] ? board[i] : '';
    }

    // update the status to show whose turn it is
    statusDiv.textContent = `${currentTurn}'s turn`;
});





socket.on('gameOver', (data) => {
    const { board, winner } = data;
    for (let i = 0; i < 9; i++) {
        cells[i].textContent = board[i] ? board[i] : '';
    }
    if (winner) {
        if (winner === myNickname) {
            statusDiv.textContent = 'You won';
        } else {
            statusDiv.textContent = `${winner} won`;
        }
    } else {
        statusDiv.textContent = "draw, no winner";
    }
});

socket.on('opponentDisconnected', () => {
    statusDiv.textContent = 'opponent disconnected';
});