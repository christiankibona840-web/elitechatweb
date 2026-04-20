// Tic Tac Toe game helpers — pure logic, no UI/Supabase
export type Cell = '' | 'X' | 'O';
export type Board = Cell[]; // length 9

export const EMPTY_BOARD: Board = ['', '', '', '', '', '', '', '', ''];

const LINES: number[][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],            // diagonals
];

export interface GameResult {
  winner: 'X' | 'O' | 'draw' | null;
  line: number[] | null; // winning line cell indices
}

export function evaluateBoard(board: Board): GameResult {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a] as 'X' | 'O', line };
    }
  }
  if (board.every(c => c !== '')) return { winner: 'draw', line: null };
  return { winner: null, line: null };
}

export function nextTurn(turn: 'X' | 'O'): 'X' | 'O' {
  return turn === 'X' ? 'O' : 'X';
}
