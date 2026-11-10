import { countSolutions, GRID_SIZES, type GridSize, type TangoPuzzle } from "./tango.ts";

export const MAX_PUZZLE_FILE_BYTES = 64 * 1024;
export function exportPuzzle(puzzle: TangoPuzzle): string {
  return JSON.stringify(
    {
      format: "TangoMaker",
      version: 1,
      size: puzzle.grid.length,
      grid: puzzle.grid,
      hRel: puzzle.hRel,
      vRel: puzzle.vRel,
    },
    null,
    2,
  );
}

export function parsePuzzle(text: string): Omit<TangoPuzzle, "solution"> {
  if (text.length > MAX_PUZZLE_FILE_BYTES)
    throw new Error("Puzzle files must be smaller than 64 KB.");
  let data;
  try {
    data = JSON.parse(text.replace(/^\uFEFF/, ""));
  } catch {
    throw new Error("This is not a valid JSON puzzle file.");
  }
  if (!data || data.format !== "TangoMaker" || data.version !== 1) {
    throw new Error("Choose a TangoMaker version 1 puzzle file exported by this app.");
  }
  if (!GRID_SIZES.includes(data.size as GridSize))
    throw new Error("Grid size must be 6, 8, 10, or 12.");
  const n = data.size;
  const matrix = (value: unknown, rows: number, cols: number, name: string) => {
    if (
      !Array.isArray(value) ||
      value.length !== rows ||
      value.some(
        (row) =>
          !Array.isArray(row) ||
          row.length !== cols ||
          row.some((v) => !Number.isInteger(v) || v < 0 || v > 2),
      )
    ) {
      throw new Error(`Invalid ${name}: expected ${rows} rows of ${cols} values (0, 1, or 2).`);
    }
    return value.map((row) => [...row]);
  };
  return {
    grid: matrix(data.grid, n, n, "grid"),
    hRel: matrix(data.hRel, n, n - 1, "horizontal relations"),
    vRel: matrix(data.vRel, n - 1, n, "vertical relations"),
  };
}

// Validation and reconstruction run only in a worker. Unknown is never accepted
// as uniqueness, and no answer supplied by an imported file is trusted.
export function importPuzzle(text: string, budgetMs = 15000): TangoPuzzle {
  const clues = parsePuzzle(text);
  const deadline = performance.now() + budgetMs;
  const count = countSolutions(clues.grid, clues.hRel, clues.vRel, 2, 1_000_000, deadline);
  if (count === null)
    throw new Error(
      "Could not verify uniqueness within the time limit. The puzzle was not imported.",
    );
  if (count !== 1)
    throw new Error(
      count === 0 ? "This puzzle has no solution." : "This puzzle has more than one solution.",
    );
  const solution = clues.grid.map((row) => [...row]);
  for (let r = 0; r < solution.length; r++)
    for (let c = 0; c < solution.length; c++) {
      if (solution[r][c]) continue;
      solution[r][c] = 1;
      const possible = countSolutions(solution, clues.hRel, clues.vRel, 1, 1_000_000, deadline);
      if (possible === null)
        throw new Error(
          "Solution reconstruction exceeded the time limit. The puzzle was not imported.",
        );
      if (!possible) solution[r][c] = 2;
    }
  return { ...clues, solution };
}
