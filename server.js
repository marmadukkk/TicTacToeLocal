// Импорт необходимых модулей
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

// Инициализация Express и HTTP-сервера
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Отдача статических файлов (фронтенд)
app.use(express.static('public'));

// Переменные для управления состоянием игры
let waitingPlayer = null; // Игрок, ожидающий соперника
let games = {}; // Активные игры

// Обработка подключения нового клиента
io.on('connection', (socket) => {
  console.log('Пользователь подключился:', socket.id);

  // Обработка запроса на присоединение к игре
  socket.on('joinGame', (nickname) => {
    socket.nickname = nickname; // Сохранение никнейма игрока

    // Если нет ожидающего игрока, текущий игрок становится ожидающим
    if (!waitingPlayer) {
      waitingPlayer = socket;
      socket.emit('waiting', 'Ожидание соперника...');
    } else {
      // Если есть ожидающий игрок, начинаем игру
      const opponentSocket = waitingPlayer;
      const gameId = `${opponentSocket.id}#${socket.id}`; // Уникальный ID игры

      // Инициализация данных игры
      games[gameId] = {
        players: [opponentSocket, socket], // Список игроков
        board: Array(9).fill(null),        // Игровое поле (9 клеток, изначально пустых)
        currentPlayerIndex: 0,             // Индекс текущего игрока (0 или 1)
        gameOver: false                   // Статус завершения игры
      };

      // Уведомление игроков о начале игры
      opponentSocket.emit('gameStarted', {
        gameId,
        symbol: 'X', // Первый игрок получает 'X'
        opponent: socket.nickname
      });
      socket.emit('gameStarted', {
        gameId,
        symbol: 'O', // Второй игрок получает 'O'
        opponent: opponentSocket.nickname
      });

      // Очистка ожидающего игрока
      waitingPlayer = null;
    }
  });

  // Обработка хода игрока
  socket.on('makeMove', ({ gameId, index }) => {
    const game = games[gameId];
    if (!game || game.gameOver) return; // Если игра завершена, игнорируем ход

    const { board, currentPlayerIndex, players } = game;
    const currentSocket = players[currentPlayerIndex];

    // Если ход делает не текущий игрок, игнорируем
    if (socket.id !== currentSocket.id) {
      return;
    }

    // Если клетка пуста, делаем ход
    if (board[index] === null) {
      board[index] = currentPlayerIndex === 0 ? 'X' : 'O'; // Заполняем клетку символом игрока

      // Проверка на победу
      if (checkWin(board)) {
        // Уведомление игроков о победе
        io.to(players[0].id).emit('gameOver', {
          board,
          winner: socket.nickname
        });
        io.to(players[1].id).emit('gameOver', {
          board,
          winner: socket.nickname
        });
        game.gameOver = true; // Игра завершена
      }

      // Проверка на ничью
      else if (board.every(cell => cell !== null)) {
        // Уведомление игроков о ничьей
        io.to(players[0].id).emit('gameOver', {
          board,
          winner: null
        });
        io.to(players[1].id).emit('gameOver', {
          board,
          winner: null
        });
        game.gameOver = true; // Игра завершена
      }

      // Смена хода
      else {
        game.currentPlayerIndex = (game.currentPlayerIndex + 1) % 2; // Переход хода к другому игроку
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

  // Обработка отключения игрока
  socket.on('disconnect', () => {
    console.log('Пользователь отключился:', socket.id);

    // Если отключившийся игрок был в ожидании, очищаем его
    if (waitingPlayer && waitingPlayer.id === socket.id) {
      waitingPlayer = null;
    }

    // Если отключившийся игрок был в игре, уведомляем соперника
    for (const gameId in games) {
      const game = games[gameId];
      if (!game.gameOver && game.players.some(p => p.id === socket.id)) {
        const otherPlayer = game.players.find(p => p.id !== socket.id);
        if (otherPlayer) {
          otherPlayer.emit('opponentDisconnected'); // Уведомление о выходе соперника
        }
        delete games[gameId]; // Удаление игры
      }
    }
  });
});

// Функция проверки победы
function checkWin(board) {
  // Все возможные выигрышные комбинации
  const winPatterns = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Горизонтальные
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Вертикальные
    [0, 4, 8], [2, 4, 6]             // Диагональные
  ];

  // Проверка, есть ли выигрышная комбинация
  return winPatterns.some(([a, b, c]) => {
    return board[a] && board[a] === board[b] && board[b] === board[c];
  });
}

// Запуск сервера
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
