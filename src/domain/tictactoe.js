export const TICTACTOE_CELLS = 9;
export const TICTACTOE_SIZE = 3;

export function createEmptyBoard() {
  return Array(TICTACTOE_CELLS).fill(null);
}

export function isBoardFull(board) {
  return Array.isArray(board) && board.every((cell) => cell === 'X' || cell === 'O');
}

export function evaluateBoard(board) {
  if (!Array.isArray(board)) return { winner: null, line: null, draw: false };
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (const line of lines) {
    const [a, b, c] = line;
    const symbol = board[a];
    if (!symbol) continue;
    if (board[b] === symbol && board[c] === symbol) {
      return { winner: symbol, line, draw: false };
    }
  }
  const draw = isBoardFull(board);
  return { winner: null, line: null, draw };
}

export function serializeBoard(board) {
  if (!Array.isArray(board)) return createEmptyBoard();
  return board.map((cell) => {
    if (cell === 'X' || cell === 'O') return cell;
    return null;
  });
}
