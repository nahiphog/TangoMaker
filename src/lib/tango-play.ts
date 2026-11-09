import type { Cell, Grid, TangoPuzzle } from "./tango";

export function placeCell(board: Grid, givens: Grid, r: number, c: number, value: Cell): Grid {
  if (givens[r][c] !== 0 || board[r][c] === value) return board;
  return board.map((row, index) =>
    index === r ? row.map((v, col) => (col === c ? value : v)) : row,
  );
}

// Only visible rule violations, never deductions based on the hidden solution.
export function checkRules(board: Grid, puzzle: Pick<TangoPuzzle, "hRel" | "vRel">) {
  const n = board.length;
  const conflicts = new Set<string>();
  const messages = new Set<string>();
  const mark = (positions: [number, number][], message: string) => {
    positions.forEach(([r, c]) => conflicts.add(`${r},${c}`));
    messages.add(message);
  };
  for (let i = 0; i < n; i++) {
    for (const vertical of [false, true]) {
      const positions: [number, number][] = Array.from({ length: n }, (_, j) =>
        vertical ? [j, i] : [i, j],
      );
      const values = positions.map(([r, c]) => board[r][c]);
      for (const value of [1, 2]) {
        if (values.filter((v) => v === value).length > n / 2) {
          mark(
            positions.filter((_, j) => values[j] === value),
            `Each row and column can contain only ${n / 2} of each color.`,
          );
        }
      }
      for (let j = 0; j < n - 2; j++) {
        if (values[j] && values[j] === values[j + 1] && values[j] === values[j + 2]) {
          mark(positions.slice(j, j + 3), "No three consecutive cells may have the same color.");
        }
      }
    }
  }
  const relation = (r: number, c: number, rr: number, cc: number, rel: number) => {
    const a = board[r][c],
      b = board[rr][cc];
    if (rel && a && b && (a === b) !== (rel === 1)) {
      mark(
        [
          [r, c],
          [rr, cc],
        ],
        "Cells joined by = must match; cells joined by × must differ.",
      );
    }
  };
  puzzle.hRel.forEach((row, r) => row.forEach((rel, c) => relation(r, c, r, c + 1, rel)));
  puzzle.vRel.forEach((row, r) => row.forEach((rel, c) => relation(r, c, r + 1, c, rel)));
  return { conflicts, messages: [...messages] };
}

export function checkProgress(board: Grid, solution: Grid) {
  const mistakes = new Set<string>();
  let empty = 0;
  board.forEach((row, r) =>
    row.forEach((value, c) => {
      if (!value) empty++;
      else if (value !== solution[r][c]) mistakes.add(`${r},${c}`);
    }),
  );
  return { mistakes, empty, solved: empty === 0 && mistakes.size === 0 };
}
