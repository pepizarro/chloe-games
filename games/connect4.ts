export const COLS = 7;
export const ROWS = 6;
export type Cell = string | null;
export type State = { board: Cell[] }; // row-major, row 0 = top

const init = (): State => ({ board: Array(COLS * ROWS).fill(null) });

/** Returns new board, or null if column is full. */
function drop(board: Cell[], col: number, player: string): Cell[] | null {
  for (let r = ROWS - 1; r >= 0; r--) {
    const i = r * COLS + col;
    if (board[i] === null) {
      const next = board.slice();
      next[i] = player;
      return next;
    }
  }
  return null;
}

/** Player name, 'draw', or null if still playing. */
function winner(board: Cell[]): string | null {
  const at = (r: number, c: number) =>
    r < 0 || r >= ROWS || c < 0 || c >= COLS ? undefined : board[r * COLS + c];
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const p = at(r, c);
      if (!p) continue;
      for (const [dr, dc] of dirs)
        if ([1, 2, 3].every((k) => at(r + dr * k, c + dc * k) === p)) return p;
    }
  return board.includes(null) ? null : "draw";
}

export const connect4 = { init, drop, winner };
