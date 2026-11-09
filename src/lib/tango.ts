// Tango puzzle generator — 6×6 or 8×8 grid of two symbols, generated via "digging".

export const EMPTY = 0;
export const ORANGE = 1;
export const BLUE = 2;

export const NONE = 0;
export const EQUAL = 1;
export const NOT_EQUAL = 2;

export type Cell = 0 | 1 | 2;
export type Grid = Cell[][]; // N × N
export type Rel = 0 | 1 | 2;
export type HRel = Rel[][]; // N rows × (N - 1) columns
export type VRel = Rel[][]; // (N - 1) rows × N columns

export interface TangoPuzzle {
  grid: Grid;
  solution: Grid;
  hRel: HRel;
  vRel: VRel;
}

export type GridSize = 6 | 8;

function makeGrid(N: GridSize): Grid {
  return Array.from({ length: N }, () => Array<Cell>(N).fill(EMPTY as Cell));
}

function isValidSoFar(grid: Grid, hRel: HRel, vRel: VRel): boolean {
  const N = grid.length;
  // no three in a row horizontally
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N - 2; c++) {
      const v = grid[r][c];
      if (v !== EMPTY && v === grid[r][c + 1] && v === grid[r][c + 2]) return false;
    }
  }
  // vertically
  for (let c = 0; c < N; c++) {
    for (let r = 0; r < N - 2; r++) {
      const v = grid[r][c];
      if (v !== EMPTY && v === grid[r + 1][c] && v === grid[r + 2][c]) return false;
    }
  }
  // balance
  for (let r = 0; r < N; r++) {
    let o = 0;
    let b = 0;
    for (let c = 0; c < N; c++) {
      if (grid[r][c] === ORANGE) o++;
      else if (grid[r][c] === BLUE) b++;
    }
    if (o > N / 2 || b > N / 2) return false;
  }
  for (let c = 0; c < N; c++) {
    let o = 0;
    let b = 0;
    for (let r = 0; r < N; r++) {
      if (grid[r][c] === ORANGE) o++;
      else if (grid[r][c] === BLUE) b++;
    }
    if (o > N / 2 || b > N / 2) return false;
  }
  // relations
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N - 1; c++) {
      const rel = hRel[r][c];
      const a = grid[r][c];
      const b = grid[r][c + 1];
      if (rel !== NONE && a !== EMPTY && b !== EMPTY) {
        if (rel === EQUAL && a !== b) return false;
        if (rel === NOT_EQUAL && a === b) return false;
      }
    }
  }
  for (let r = 0; r < N - 1; r++) {
    for (let c = 0; c < N; c++) {
      const rel = vRel[r][c];
      const a = grid[r][c];
      const b = grid[r + 1][c];
      if (rel !== NONE && a !== EMPTY && b !== EMPTY) {
        if (rel === EQUAL && a !== b) return false;
        if (rel === NOT_EQUAL && a === b) return false;
      }
    }
  }
  return true;
}

function okAt(grid: Grid, hRel: HRel, vRel: VRel, r: number, c: number): boolean {
  const N = grid.length;
  const v = grid[r][c];
  if (v === EMPTY) return true;

  // triples through (r, c)
  for (let s = c - 2; s <= c; s++) {
    if (s < 0 || s + 2 >= N) continue;
    if (grid[r][s] === v && grid[r][s + 1] === v && grid[r][s + 2] === v) return false;
  }
  for (let s = r - 2; s <= r; s++) {
    if (s < 0 || s + 2 >= N) continue;
    if (grid[s][c] === v && grid[s + 1][c] === v && grid[s + 2][c] === v) return false;
  }

  // balance in row r and column c
  let o = 0;
  let b = 0;
  for (let i = 0; i < N; i++) {
    if (grid[r][i] === ORANGE) o++;
    else if (grid[r][i] === BLUE) b++;
  }
  if (o > N / 2 || b > N / 2) return false;
  o = 0;
  b = 0;
  for (let i = 0; i < N; i++) {
    if (grid[i][c] === ORANGE) o++;
    else if (grid[i][c] === BLUE) b++;
  }
  if (o > N / 2 || b > N / 2) return false;

  // relations touching (r, c)
  const checkRel = (rel: Rel, a: Cell, d: Cell): boolean => {
    if (rel === NONE || a === EMPTY || d === EMPTY) return true;
    if (rel === EQUAL) return a === d;
    return a !== d;
  };
  if (c > 0 && !checkRel(hRel[r][c - 1], grid[r][c - 1], v)) return false;
  if (c < N - 1 && !checkRel(hRel[r][c], v, grid[r][c + 1])) return false;
  if (r > 0 && !checkRel(vRel[r - 1][c], grid[r - 1][c], v)) return false;
  if (r < N - 1 && !checkRel(vRel[r][c], v, grid[r + 1][c])) return false;

  return true;
}

// Exhaustive search, stopping only after two solutions are proven. Never
// interpret an interrupted search as unique. The input is restored on return.
function countSolutions(grid: Grid, hRel: HRel, vRel: VRel, limit = 2): number {
  const N = grid.length;
  if (!isValidSoFar(grid, hRel, vRel)) return 0;
  let solutions = 0;
  const backtrack = (): void => {
    if (solutions >= limit) return;
    let bestR = -1;
    let bestC = -1;
    let bestValues: Cell[] = [];
    // Choose the most constrained empty cell; singleton domains propagate
    // forced placements before branching on less constrained cells.
    search: for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (grid[r][c] !== EMPTY) continue;
        const values: Cell[] = [];
        for (const value of [ORANGE, BLUE] as Cell[]) {
          grid[r][c] = value;
          if (okAt(grid, hRel, vRel, r, c)) values.push(value);
        }
        grid[r][c] = EMPTY;
        if (values.length === 0) return;
        if (bestR === -1 || values.length < bestValues.length) {
          bestR = r;
          bestC = c;
          bestValues = values;
          if (values.length === 1) break search;
        }
      }
    }
    if (bestR === -1) {
      solutions++;
      return;
    }
    for (const value of bestValues) {
      grid[bestR][bestC] = value;
      backtrack();
      grid[bestR][bestC] = EMPTY;
      if (solutions >= limit) break;
    }
  };
  backtrack();
  return solutions;
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateFullSolution(N: GridSize): Grid {
  const grid = makeGrid(N);
  const emptyH: HRel = Array.from({ length: N }, () => Array<Rel>(N - 1).fill(NONE as Rel));
  const emptyV: VRel = Array.from({ length: N - 1 }, () => Array<Rel>(N).fill(NONE as Rel));

  const fill = (r: number, c: number): boolean => {
    if (r === N) return true;
    const nextR = r + Math.floor((c + 1) / N);
    const nextC = (c + 1) % N;
    for (const val of shuffle([ORANGE, BLUE] as Cell[])) {
      grid[r][c] = val;
      if (isValidSoFar(grid, emptyH, emptyV) && fill(nextR, nextC)) return true;
      grid[r][c] = EMPTY as Cell;
    }
    return false;
  };

  if (!fill(0, 0)) throw new Error("Could not generate a complete Tango solution.");
  return grid;
}

type PoolItem = ["cell" | "h" | "v", number, number];

export function generateTango(N: GridSize = 6): TangoPuzzle {
  if (N !== 6 && N !== 8) throw new Error("Choose a 6×6 or 8×8 grid.");
  const solution = generateFullSolution(N);
  const grid: Grid = solution.map((row) => [...row]);

  const hRel: HRel = Array.from({ length: N }, (_, r) =>
    Array.from(
      { length: N - 1 },
      (_, c) => (solution[r][c] === solution[r][c + 1] ? EQUAL : NOT_EQUAL) as Rel,
    ),
  );
  const vRel: VRel = Array.from({ length: N - 1 }, (_, r) =>
    Array.from(
      { length: N },
      (_, c) => (solution[r][c] === solution[r + 1][c] ? EQUAL : NOT_EQUAL) as Rel,
    ),
  );

  const pool: PoolItem[] = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) pool.push(["cell", r, c]);
  for (let r = 0; r < N; r++) for (let c = 0; c < N - 1; c++) pool.push(["h", r, c]);
  for (let r = 0; r < N - 1; r++) for (let c = 0; c < N; c++) pool.push(["v", r, c]);
  shuffle(pool);

  for (const [type, r, c] of pool) {
    if (type === "cell") {
      const saved = grid[r][c];
      grid[r][c] = EMPTY as Cell;
      if (countSolutions(grid, hRel, vRel, 2) !== 1) grid[r][c] = saved;
    } else if (type === "h") {
      const saved = hRel[r][c];
      hRel[r][c] = NONE as Rel;
      if (countSolutions(grid, hRel, vRel, 2) !== 1) hRel[r][c] = saved;
    } else {
      const saved = vRel[r][c];
      vRel[r][c] = NONE as Rel;
      if (countSolutions(grid, hRel, vRel, 2) !== 1) vRel[r][c] = saved;
    }
  }

  return { grid, solution, hRel, vRel };
}

export function tallies(p: TangoPuzzle): { circles: number; symbols: number } {
  let circles = 0;
  for (const row of p.grid) for (const v of row) if (v !== EMPTY) circles++;
  let symbols = 0;
  for (const row of p.hRel) for (const v of row) if (v !== NONE) symbols++;
  for (const row of p.vRel) for (const v of row) if (v !== NONE) symbols++;
  return { circles, symbols };
}
