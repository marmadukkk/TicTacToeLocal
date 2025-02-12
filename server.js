
//imports and inits
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// serve static files (frontend) 
app.use(express.static('public'));



let waitingPlayer = null;

//  ongoing games
let games = {};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('joinGame', (nickname) => {
    socket.nickname = nickname;

    // if no one is waiting, mark current player as waiting
    if (!waitingPlayer) {
      waitingPlayer = socket;
      //emit allows send data as events
      socket.emit('waiting', 'Waiting for an opponent...');
    } else {
      // if there is someone waiting, start game
      const opponentSocket = waitingPlayer;
      const gameId = `${opponentSocket.id}#${socket.id}`;

      // init game data
      games[gameId] = {
        players: [opponentSocket, socket],// list of players
        board: Array(9).fill(null),        // 9 cells, initially empty(filled with nulls)
        currentPlayerIndex: 0,            // 0 => first player, 1 => second
        gameOver: false //game status 
      };

      // notify players about game start
      //for first player
      opponentSocket.emit('gameStarted', {
        gameId,
        symbol: 'X',
        opponent: socket.nickname
      });
      //for second player
      socket.emit('gameStarted', {
        gameId,
        symbol: 'O',
        opponent: opponentSocket.nickname
      });

      // clear waiting player
      waitingPlayer = null;
    }
  });

  // Listen for a move being made
  socket.on('makeMove', ({ gameId, index }) => {
    const game = games[gameId];
    if (!game || game.gameOver) return;

    const { board, currentPlayerIndex, players } = game;
    const currentSocket = players[currentPlayerIndex];

    // if the socket making the move does not belongs to the current player, ignore it
    if (socket.id !== currentSocket.id) {
      return;
    }

    // if the cell is empty(able to move), mark it with users symbol
    if (board[index] === null) {
      board[index] = currentPlayerIndex === 0 ? 'X' : 'O';

      // check if current move wins the game
      if (checkWin(board)) {

        // send to users who winned 
        //for first player
        io.to(players[0].id).emit('gameOver', {
          board,
          winner: socket.nickname
        });
        //for second player
        io.to(players[1].id).emit('gameOver', {
          board,
          winner: socket.nickname
        });
        //update game status
        game.gameOver = true;
      }

      // check for a draw (board is full, but no winning combinations appliable  to current board)
      else if (board.every(cell => cell !== null)) {

        //same notify for players like in previous case
        io.to(players[0].id).emit('gameOver', {
          board,
          winner: null
        });
        io.to(players[1].id).emit('gameOver', {
          board,
          winner: null
        });


        game.gameOver = true;
      }

      //  switch turns (allow next player to move)
      else {
        game.currentPlayerIndex = (game.currentPlayerIndex + 1) % 2;
        io.to(players[0].id).emit('updateBoard', {
          board,
          currentTurn: players[game.currentPlayerIndex].nickname
        });
        io.to(players[1].id).emit('updateBoard', {
          board,
          currentTurn: players[game.currentPlayerIndex].nickname
        });
      }
    }
  });

  // for disconnect
  socket.on('disconnect', () => {
    console.log('disconnected:', socket.id);

    // if this user was in waiting list, clear it
    if (waitingPlayer && waitingPlayer.id === socket.id) {
      waitingPlayer = null;
    }

    // if this user was in a game notify the opponent (game will end because only one player is alive)
    for (const gameId in games) {
      const game = games[gameId];
      if (!game.gameOver && game.players.some(p => p.id === socket.id)) {
        // find the other player
        const otherPlayer = game.players.find(p => p.id !== socket.id);
        if (otherPlayer) {
          otherPlayer.emit('opponentDisconnected');
        }
        // delete the game data
        delete games[gameId];
      }
    }
  });
});


function checkWin(board) {
  //there is 8 winning patterns and the simplest solution that i found is to just check if one of them is appliable to current desk. if there are same symbols on all places of some winning combination return winning symbol
  const winPatterns = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  return winPatterns.some(([a, b, c]) => {
    return board[a] && board[a] === board[b] && board[b] === board[c];
  });
}

// start server
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
