##TIC TAC TOE LOCAL

# Game Logic

- 3x3 desk filled with nulls (initial state)
- Two types of elements: `x` or `o`
- Win patterns:
  - Horizontal: 3 same elements
  - Vertical: 3 same elements
  - Diagonal: 3 same elements

- If desk is fully filled but no win patterns on it, end game.

# Client

- Able to connect to server
- Able to start game
- Able to send moves
- Able to receive other client (opponent) moves
- Able to receive game status

# Server
- able to handle connnection of clients

- able to handle moves

- able to send results to clients

