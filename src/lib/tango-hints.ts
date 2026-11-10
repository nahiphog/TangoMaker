import type { Cell, Grid, HRel, VRel } from "./tango";
import { checkRules } from "./tango-play.ts";

export type Position = [number, number];
export type HintInput = { board: Grid; hRel: HRel; vRel: VRel };
export type Technique =
  | "Avoid three consecutive colors"
  | "Fill the gap"
  | "Complete the balance"
  | "Follow a relation"
  | "Follow a relation chain"
  | "Eliminate line patterns";
export type HintResult =
  | {
      kind: "move";
      technique: Technique;
      cells: Position[];
      target: Position;
      value: Cell;
      explanation: string;
    }
  | { kind: "conflict"; cells: Position[]; explanation: string }
  | { kind: "stalled"; explanation: string };

const opposite = (value: Cell) => (3 - value) as Cell;
const color = (value: Cell) => (value === 1 ? "orange" : "blue");
const where = ([r, c]: Position) => `row ${r + 1}, column ${c + 1}`;

// Enumerate a single line only. No full-board search or hidden solution is used.
// A walkthrough analyzes many boards of the same size in one worker. Reuse
// the rule-valid universe; entries and relations are still filtered each time.
const patternCache = new Map<number, Cell[][]>();
function linePatterns(values: Cell[], relations: number[]) {
  const n = values.length;
  let patterns = patternCache.get(n);
  if (!patterns) {
    patterns = [];
    for (let mask = 0; mask < 2 ** n; mask++) {
      const row = Array.from({ length: n }, (_, i) => (1 + ((mask >> i) & 1)) as Cell);
      if (row.filter((v) => v === 1).length !== n / 2) continue;
      if (row.some((v, i) => i > 1 && v === row[i - 1] && v === row[i - 2])) continue;
      patterns.push(row);
    }
    patternCache.set(n, patterns);
  }
  return patterns.filter(
    (row) =>
      !row.some((v, i) => values[i] && values[i] !== v) &&
      !relations.some((rel, i) => rel && (row[i] === row[i + 1]) !== (rel === 1)),
  );
}

export function findHint({ board, hRel, vRel }: HintInput): HintResult {
  const n = board.length;
  const violations = checkRules(board, { hRel, vRel });
  if (violations.conflicts.size)
    return {
      kind: "conflict",
      cells: [...violations.conflicts].map((key) => key.split(",").map(Number) as Position),
      explanation: violations.messages.join(" "),
    };
  const move = (
    technique: Technique,
    cells: Position[],
    target: Position,
    value: Cell,
    reason: string,
  ): HintResult => ({
    kind: "move",
    technique,
    cells,
    target,
    value,
    explanation: `${reason} Therefore ${where(target)} must be ${color(value)}.`,
  });
  const lines = Array.from({ length: 2 * n }, (_, index) => {
    const vertical = index >= n,
      i = index % n;
    const cells: Position[] = Array.from({ length: n }, (_, j) => (vertical ? [j, i] : [i, j]));
    const values = cells.map(([r, c]) => board[r][c]);
    const relations = vertical ? vRel.map((row) => row[i]) : hRel[i];
    return {
      cells,
      values,
      patterns: linePatterns(values, relations),
      name: `${vertical ? "Column" : "Row"} ${i + 1}`,
    };
  });
  for (const line of lines)
    if (!line.patterns.length)
      return {
        kind: "conflict",
        cells: line.cells,
        explanation: `${line.name} has no arrangement satisfying its entries, relations, balance, and no-three rule. Review your entries.`,
      };

  // Check entire relation components before suggesting a move, including odd cycles
  // and known endpoints separated by blank cells.
  const neighbors = ([r, c]: Position): { cell: Position; rel: number }[] => {
    const result: { cell: Position; rel: number }[] = [];
    if (c > 0) result.push({ cell: [r, c - 1], rel: hRel[r][c - 1] });
    if (c < n - 1) result.push({ cell: [r, c + 1], rel: hRel[r][c] });
    if (r > 0) result.push({ cell: [r - 1, c], rel: vRel[r - 1][c] });
    if (r < n - 1) result.push({ cell: [r + 1, c], rel: vRel[r][c] });
    return result.filter((edge) => edge.rel);
  };
  const seen = new Set<string>();
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      if (seen.has(`${r},${c}`)) continue;
      const queue: Position[] = [[r, c]];
      const parity = new Map<string, number>([[`${r},${c}`, 0]]);
      let anchor: number | undefined;
      let inconsistent = false;
      for (let i = 0; i < queue.length; i++) {
        const cell = queue[i],
          key = cell.join(","),
          p = parity.get(key)!;
        seen.add(key);
        const value = board[cell[0]][cell[1]];
        if (value) {
          const implied = (value - 1) ^ p;
          if (anchor !== undefined && anchor !== implied) inconsistent = true;
          anchor = implied;
        }
        for (const edge of neighbors(cell)) {
          const nextKey = edge.cell.join(","),
            nextParity = p ^ (edge.rel === 2 ? 1 : 0);
          if (parity.has(nextKey)) {
            if (parity.get(nextKey) !== nextParity) inconsistent = true;
          } else {
            parity.set(nextKey, nextParity);
            queue.push(edge.cell);
          }
        }
      }
      if (inconsistent)
        return {
          kind: "conflict",
          cells: queue,
          explanation:
            "This relation chain contradicts itself or its filled endpoints. Review the highlighted entries.",
        };
    }

  for (const line of lines) {
    for (let start = 0; start < n - 2; start++) {
      const values = line.values.slice(start, start + 3);
      const empty = values.indexOf(0);
      const filled = values.filter((v) => v !== 0);
      if (filled.length === 2 && filled[0] === filled[1]) {
        return move(
          empty === 1 ? "Fill the gap" : "Avoid three consecutive colors",
          line.cells.slice(start, start + 3),
          line.cells[start + empty],
          opposite(filled[0]),
          "Three consecutive cells cannot all have the same color.",
        );
      }
    }
  }
  for (const line of lines)
    for (const value of [1, 2] as Cell[]) {
      const empty = line.values.indexOf(0);
      if (empty >= 0 && line.values.filter((v) => v === value).length === n / 2) {
        return move(
          "Complete the balance",
          line.cells,
          line.cells[empty],
          opposite(value),
          `${line.name} already contains its quota of ${n / 2} ${color(value)} cells.`,
        );
      }
    }
  // Prefer a chain's distant endpoint to demonstrate how multiple relations combine.
  let direct: HintResult | undefined;
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      if (!board[r][c]) continue;
      const queue: { cell: Position; value: Cell; path: Position[] }[] = [
        { cell: [r, c], value: board[r][c], path: [[r, c]] },
      ];
      const visited = new Set([`${r},${c}`]);
      for (let i = 0; i < queue.length; i++)
        for (const edge of neighbors(queue[i].cell)) {
          const key = edge.cell.join(",");
          if (visited.has(key)) continue;
          visited.add(key);
          const value = edge.rel === 1 ? queue[i].value : opposite(queue[i].value);
          const path = [...queue[i].path, edge.cell];
          queue.push({ cell: edge.cell, value, path });
          if (board[edge.cell[0]][edge.cell[1]]) continue;
          const explanation = path
            .slice(1)
            .map((cell, j) => {
              const a = path[j];
              const rel =
                a[0] === cell[0]
                  ? hRel[a[0]][Math.min(a[1], cell[1])]
                  : vRel[Math.min(a[0], cell[0])][a[1]];
              return `${where(a)} ${rel === 1 ? "=" : "×"} ${where(cell)}`;
            })
            .join("; ");
          const hint = move(
            path.length > 2 ? "Follow a relation chain" : "Follow a relation",
            path,
            edge.cell,
            value,
            `Start with ${color(board[r][c])} at ${where([r, c])}. Each = keeps the color; each × flips it. Path: ${explanation}.`,
          );
          if (path.length > 2) return hint;
          direct ??= hint;
        }
    }
  if (direct) return direct;
  for (const line of lines)
    for (let i = 0; i < n; i++) {
      const value = line.patterns[0][i];
      if (!line.values[i] && line.patterns.every((pattern) => pattern[i] === value)) {
        return move(
          "Eliminate line patterns",
          line.cells,
          line.cells[i],
          value,
          `${line.name} has ${line.patterns.length} valid arrangement(s) after applying its entries, relations, balance, and no-three rule. Every arrangement agrees on this cell.`,
        );
      }
    }
  return {
    kind: "stalled",
    explanation: board.every((row) => row.every(Boolean))
      ? "The board is complete and satisfies the visible rules."
      : "These techniques found no forced move. This does not mean the puzzle is ambiguous or impossible; a more advanced deduction or search may be needed.",
  };
}
