// Connect 4 board: 6 rows x 7 cols, stored as a flat 42-length string array.
// Index = row * 7 + col, row 0 = TOP, row 5 = BOTTOM.
// Cell values: '' | 'R' (red) | 'Y' (yellow)

export const C4_ROWS = 6;
export const C4_COLS = 7;
export type C4Cell = '' | 'R' | 'Y';
export type C4Board = C4Cell[];

export const emptyBoard = (): C4Board => Array(C4_ROWS * C4_COLS).fill('') as C4Board;

export const idx = (row: number, col: number) => row * C4_COLS + col;

/** Returns the row index where a piece will land in `col`, or -1 if column is full. */
export const dropRow = (board: C4Board, col: number): number => {
  for (let r = C4_ROWS - 1; r >= 0; r--) {
    if (board[idx(r, col)] === '') return r;
  }
  return -1;
};

export interface C4Result {
  winner: 'R' | 'Y' | 'draw' | null;
  line?: number[];
}

const DIRS: Array<[number, number]> = [
  [0, 1],   // horizontal →
  [1, 0],   // vertical ↓
  [1, 1],   // diagonal ↘
  [1, -1],  // diagonal ↙
];

export const evaluateC4 = (board: C4Board): C4Result => {
  for (let r = 0; r < C4_ROWS; r++) {
    for (let c = 0; c < C4_COLS; c++) {
      const cell = board[idx(r, c)];
      if (cell === '') continue;
      for (const [dr, dc] of DIRS) {
        const cells = [idx(r, c)];
        for (let k = 1; k < 4; k++) {
          const nr = r + dr * k;
          const nc = c + dc * k;
          if (nr < 0 || nr >= C4_ROWS || nc < 0 || nc >= C4_COLS) break;
          if (board[idx(nr, nc)] !== cell) break;
          cells.push(idx(nr, nc));
        }
        if (cells.length === 4) {
          return { winner: cell as 'R' | 'Y', line: cells };
        }
      }
    }
  }
  if (board.every(c => c !== '')) return { winner: 'draw' };
  return { winner: null };
};
