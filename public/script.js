const socket = io();

// Определение переменных для хранения данных игры
let gameId = null; // ID текущей игры
let mySymbol = null; // Символ текущего игрока (X или O)
let myNickname = null; // Никнейм текущего игрока

// Получение элементов из HTML
const nicknameInput = document.getElementById("nicknameInput"); // Поле ввода никнейма
const joinBtn = document.getElementById("joinBtn"); // Кнопка "Присоединиться к игре"
const statusDiv = document.getElementById("status"); // Элемент для отображения статуса игры
const boardDiv = document.getElementById("board"); // Элемент игрового поля

// Создание сетки 3x3 для игры в крестики-нолики
const cells = [];
for (let i = 0; i < 9; i++) {
  const cell = document.createElement("div");
  cell.classList.add("cell"); // Добавляем класс для стилизации ячейки
  cell.addEventListener("click", () => {
    // Обработчик клика по ячейке
    // Ход возможен только если игра активна и у игрока есть символ (X или O)
    if (gameId && mySymbol) {
      socket.emit("makeMove", { gameId, index: i }); // Отправляем ход на сервер
    }
  });
  boardDiv.appendChild(cell); // Добавляем ячейку на страницу
  cells.push(cell); // Сохраняем ячейку в массив для дальнейшего использования
}

// Обработчик нажатия на кнопку "Присоединиться к игре"
joinBtn.addEventListener("click", () => {
  myNickname = nicknameInput.value.trim(); // Получаем никнейм из поля ввода
  if (!myNickname) {
    alert("Никнейм не может быть пустым. Введите что-нибудь."); // Проверка на пустой никнейм
    return;
  }
  socket.emit("joinGame", myNickname); // Отправляем запрос на присоединение к игре
});

// Слушатель события "waiting" (ожидание второго игрока)
socket.on("waiting", (message) => {
  statusDiv.textContent = message; // Обновляем статус
});

// Слушатель события "gameStarted" (игра началась)
socket.on("gameStarted", (data) => {
  gameId = data.gameId; // Сохраняем ID игры
  mySymbol = data.symbol; // Сохраняем символ текущего игрока
  const opponentNickname = data.opponent; // Получаем никнейм оппонента
  statusDiv.textContent = `Игра началась. Вы играете за ${mySymbol}. Ваш оппонент: ${opponentNickname}`;

  // Очищаем игровое поле
  cells.forEach((cell) => (cell.textContent = ""));
});

// Слушатель события "updateBoard" (обновление состояния игрового поля)
socket.on("updateBoard", (data) => {
  const { board, currentTurn } = data; // Получаем текущее состояние поля и чей ход

  // Обновляем содержимое каждой ячейки
  for (let i = 0; i < 9; i++) {
    cells[i].textContent = board[i] ? board[i] : ""; // Если ячейка заполнена, отображаем символ
  }

  // Обновляем статус, чтобы показать, чей сейчас ход
  statusDiv.textContent = `Ход игрока ${currentTurn}`;
});

// Слушатель события "gameOver" (игра завершена)
socket.on("gameOver", (data) => {
  const winAudio = document.getElementById("winSound"); // Аудио для победы
  const loseAudio = document.getElementById("loseSound"); // Аудио для поражения

  // Сбрасываем и останавливаем предыдущие звуки
  winAudio.pause();
  winAudio.currentTime = 0;
  loseAudio.pause();
  loseAudio.currentTime = 0;

  // Обновляем игровое поле
  const { board, winner } = data;
  for (let i = 0; i < 9; i++) {
    cells[i].textContent = board[i] ? board[i] : "";
  }

  // Обработка статуса и эффектов
  if (winner) {
    if (winner === myNickname) {
      // Эффекты победы
      winAudio.play(); // Воспроизводим звук победы
      statusDiv.textContent = "🎉 Вы победили!";
      statusDiv.classList.add("winner-status"); // Добавляем класс для стилизации победы
      statusDiv.classList.remove("loser-status");

      // Анимация конфетти
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
      // Эффекты поражения
      loseAudio.play(); // Воспроизводим звук поражения
      statusDiv.textContent = "😢 Вы проиграли...";
      statusDiv.classList.add("loser-status"); // Добавляем класс для стилизации поражения
      statusDiv.classList.remove("winner-status");

      // Анимация дождя
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
    // Ничья
    statusDiv.textContent = "🤝 Ничья!";
    statusDiv.classList.remove("winner-status", "loser-status");
  }

  // Сброс игры через 5 секунд
  setTimeout(() => {
    gameId = null;
    mySymbol = null;
    statusDiv.textContent = 'Нажмите "Присоединиться к игре", чтобы начать новую партию';
    statusDiv.classList.remove("winner-status", "loser-status");
  }, 5000);
});

// Слушатель события "opponentDisconnected" (оппонент отключился)
socket.on("opponentDisconnected", () => {
  statusDiv.textContent = "Оппонент отключился";
});
