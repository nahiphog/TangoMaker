import assert from "node:assert/strict";
import { test } from "node:test";
import {
  generateTango,
  createDiggingGroups,
  DEFAULT_DIGGING_METHOD,
  countSolutions,
} from "../src/lib/tango.ts";

// Independent oracle: enumerate valid complete line patterns, then enforce
// row/column agreement and branch on whole lines. No generator validators used.
function solveIndependently(puzzle) {
  const n = puzzle.grid.length;
  const bit = (mask, c) => 1 + ((mask >> c) & 1);
  const patterns = Array.from({ length: 2 ** n }, (_, mask) => mask).filter((mask) => {
    const row = Array.from({ length: n }, (_, c) => bit(mask, c));
    return (
      row.filter((v) => v === 1).length === n / 2 &&
      !row.some((v, c) => c < n - 2 && v === row[c + 1] && v === row[c + 2])
    );
  });
  const rows = puzzle.grid.map((givens, r) =>
    patterns.filter(
      (mask) =>
        givens.every((v, c) => !v || bit(mask, c) === v) &&
        puzzle.hRel[r].every(
          (rel, c) => !rel || (bit(mask, c) === bit(mask, c + 1)) === (rel === 1),
        ),
    ),
  );
  const cols = Array.from({ length: n }, (_, c) =>
    patterns.filter(
      (mask) =>
        puzzle.grid.every((row, r) => !row[c] || bit(mask, r) === row[c]) &&
        puzzle.vRel.every(
          (row, r) => !row[c] || (bit(mask, r) === bit(mask, r + 1)) === (row[c] === 1),
        ),
    ),
  );
  const solutions = [];
  function visit(domains) {
    let changed = true;
    while (changed) {
      changed = false;
      if (domains.some((d) => d.length === 0)) return;
      for (let r = 0; r < n; r++)
        for (let c = 0; c < n; c++) {
          const support = (domain, pos) =>
            domain.reduce((mask, v) => mask | (1 << ((v >> pos) & 1)), 0);
          const allowed = support(domains[r], c) & support(domains[n + c], r);
          if (!allowed) return;
          const rr = domains[r].filter((mask) => allowed & (1 << ((mask >> c) & 1)));
          const cc = domains[n + c].filter((mask) => allowed & (1 << ((mask >> r) & 1)));
          if (rr.length !== domains[r].length || cc.length !== domains[n + c].length)
            changed = true;
          domains[r] = rr;
          domains[n + c] = cc;
        }
    }
    let choice = -1;
    for (let i = 0; i < domains.length; i++)
      if (domains[i].length > 1 && (choice < 0 || domains[i].length < domains[choice].length))
        choice = i;
    if (choice < 0) {
      solutions.push(
        domains.slice(0, n).map((d) => Array.from({ length: n }, (_, c) => bit(d[0], c))),
      );
      return;
    }
    for (const mask of domains[choice]) {
      const next = domains.map((d) => [...d]);
      next[choice] = [mask];
      visit(next);
      if (solutions.length >= 2) return;
    }
  }
  visit([...rows, ...cols]);
  return solutions;
}

for (const method of ["rotational-pairs", "single-clue"]) {
  for (const n of [6, 8, 10, 12]) {
    const sampleCount = n <= 8 ? 50 : 5;
    test(`${method} ${n}×${n}: ${sampleCount} seeded puzzles have exactly one independently verified solution`, () => {
      const originalRandom = Math.random;
      try {
        for (let seed = 1; seed <= sampleCount; seed++) {
          let state = seed;
          Math.random = () => {
            state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
            return state / 2 ** 32;
          };
          const puzzle = generateTango(n, method);
          assert.equal(puzzle.grid.length, n);
          assert.equal(puzzle.solution.length, n);
          assert.ok(
            puzzle.grid.every((row) => row.length === n && row.every((v) => [0, 1, 2].includes(v))),
          );
          assert.ok(
            puzzle.solution.every(
              (row) => row.length === n && row.every((v) => [1, 2].includes(v)),
            ),
          );
          assert.equal(puzzle.hRel.length, n);
          assert.equal(puzzle.vRel.length, n - 1);
          assert.ok(puzzle.hRel.every((row) => row.length === n - 1));
          assert.ok(puzzle.vRel.every((row) => row.length === n));
          const solutions = solveIndependently(puzzle);
          assert.equal(solutions.length, 1, `size ${n}, seed ${seed}`);
          assert.deepEqual(solutions[0], puzzle.solution);
          if (method === "rotational-pairs") {
            for (const matrix of [puzzle.grid, puzzle.hRel, puzzle.vRel]) {
              matrix.forEach((row, r) =>
                row.forEach((v, c) => {
                  assert.equal(v !== 0, matrix[matrix.length - 1 - r][row.length - 1 - c] !== 0);
                }),
              );
            }
          }
          // Trying every retained group on two seeds checks that rejected removals
          // were restored and no removable group was skipped. Uses the independent oracle.
          if (n <= 8 && seed <= 2) {
            const matrices = { cell: puzzle.grid, h: puzzle.hRel, v: puzzle.vRel };
            for (const group of createDiggingGroups(n, method)) {
              const saved = group.map(([type, r, c]) => matrices[type][r][c]);
              if (saved.every((v) => v === 0)) continue;
              for (const [type, r, c] of group) matrices[type][r][c] = 0;
              assert.equal(solveIndependently(puzzle).length, 2);
              group.forEach(([type, r, c], i) => {
                matrices[type][r][c] = saved[i];
              });
            }
          }
        }
      } finally {
        Math.random = originalRandom;
      }
    });
  }
}

test("defaults to 6×6 and rejects unsupported grid sizes", () => {
  assert.equal(generateTango().grid.length, 6);
  for (const size of [0, 5, 7, 9, 11, 14, NaN, "8", null]) {
    assert.throws(() => generateTango(size), /6×6, 8×8, 10×10, or 12×12/);
  }
});

for (const n of [6, 8, 10, 12]) {
  test(n + "×" + n + ": rotational groups cover every clue exactly once", () => {
    const groups = createDiggingGroups(n, "rotational-pairs");
    const seen = new Set();
    for (const [first, second] of groups) {
      const [type, r, c] = first;
      const expected =
        type === "cell"
          ? [type, n - 1 - r, n - 1 - c]
          : type === "h"
            ? [type, n - 1 - r, n - 2 - c]
            : [type, n - 2 - r, n - 1 - c];
      assert.deepEqual(second, expected);
      assert.notDeepEqual(first, second);
      for (const position of [first, second]) {
        assert.ok(!seen.has(position.join(",")));
        seen.add(position.join(","));
      }
    }
    assert.equal(seen.size, n * n + 2 * n * (n - 1));
    const singles = createDiggingGroups(n, "single-clue");
    assert.ok(singles.every((group) => group.length === 1));
    assert.deepEqual(new Set(singles.flat().map((position) => position.join(","))), seen);
  });
}

test("rotational pairs are the default; invalid methods are rejected", () => {
  assert.equal(DEFAULT_DIGGING_METHOD, "rotational-pairs");
  const random = Math.random;
  try {
    Math.random = () => 0.42;
    assert.deepEqual(generateTango(), generateTango(6, "rotational-pairs"));
  } finally {
    Math.random = random;
  }
  for (const method of ["pairs", "", null, 1])
    assert.throws(() => generateTango(6, method), /rotational pairs or single-clue/);
});

test("an interrupted uniqueness check returns unknown and restores the grid", () => {
  const puzzle = generateTango(6);
  const grid = puzzle.solution.map((row) => [...row]);
  grid[0][0] = 0;
  const before = structuredClone(grid);
  assert.equal(countSolutions(grid, puzzle.hRel, puzzle.vRel, 2, 1), null);
  assert.deepEqual(grid, before);
  assert.equal(countSolutions(grid, puzzle.hRel, puzzle.vRel, 2, Infinity, 0), null);
  assert.deepEqual(grid, before);
  assert.equal(countSolutions(grid, puzzle.hRel, puzzle.vRel), 1);
  assert.deepEqual(grid, before);
});

test("independent oracle distinguishes impossible, unique, and ambiguous boards", () => {
  const blank = {
    grid: Array.from({ length: 6 }, () => Array(6).fill(0)),
    hRel: Array.from({ length: 6 }, () => Array(5).fill(0)),
    vRel: Array.from({ length: 5 }, () => Array(6).fill(0)),
  };
  assert.equal(solveIndependently(blank).length, 2);
  const p = generateTango(6);
  assert.equal(solveIndependently({ ...p, grid: p.solution }).length, 1);
  blank.grid[0] = [1, 1, 1, 0, 0, 0];
  assert.equal(solveIndependently(blank).length, 0);
});
