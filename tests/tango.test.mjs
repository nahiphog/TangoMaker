import assert from "node:assert/strict";
import { test } from "node:test";
import {
  generateTango,
  createDiggingGroups,
  DEFAULT_DIGGING_METHOD,
  countSolutions,
} from "../src/lib/tango.ts";

import { solveIndependently } from "./tango-oracle.mjs";

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
