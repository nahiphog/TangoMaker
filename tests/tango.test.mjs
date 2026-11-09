import assert from "node:assert/strict";
import { test } from "node:test";
import { generateTango } from "../src/lib/tango.ts";

// Independent oracle: enumerate complete balanced row patterns, then stack
// compatible rows. Does not use the generator's cell validator or solver.
function solveIndependently(puzzle) {
  const n = puzzle.grid.length;
  const rows = Array.from({ length: 2 ** n }, (_, mask) =>
    Array.from({ length: n }, (_, col) => 1 + ((mask >> col) & 1)),
  ).filter(
    (row) =>
      row.filter((v) => v === 1).length === n / 2 &&
      !row.some((v, c) => c < n - 2 && v === row[c + 1] && v === row[c + 2]),
  );
  const candidates = puzzle.grid.map((givens, r) =>
    rows.filter(
      (row) =>
        row.every((v, c) => !givens[c] || givens[c] === v) &&
        puzzle.hRel[r].every((rel, c) => !rel || (row[c] === row[c + 1]) === (rel === 1)),
    ),
  );
  const board = [];
  const solutions = [];
  function visit(r) {
    if (r === n) {
      solutions.push(board.map((row) => [...row]));
      return;
    }
    for (const row of candidates[r]) {
      if (
        r &&
        puzzle.vRel[r - 1].some((rel, c) => rel && (row[c] === board[r - 1][c]) !== (rel === 1))
      )
        continue;
      if (r > 1 && row.some((v, c) => v === board[r - 1][c] && v === board[r - 2][c])) continue;
      if (
        row.some((v, c) => {
          const ones = board.reduce((sum, previous) => sum + (previous[c] === 1), 0) + (v === 1);
          return ones > n / 2 || r + 1 - ones > n / 2;
        })
      )
        continue;
      board.push(row);
      visit(r + 1);
      board.pop();
      if (solutions.length === 2) return;
    }
  }
  visit(0);
  return solutions;
}

for (const n of [6, 8]) {
  test(`${n}×${n}: 50 seeded puzzles have exactly one independently verified solution`, () => {
    const originalRandom = Math.random;
    try {
      for (let seed = 1; seed <= 50; seed++) {
        let state = seed;
        Math.random = () => {
          state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
          return state / 2 ** 32;
        };
        const puzzle = generateTango(n);
        assert.equal(puzzle.grid.length, n);
        assert.equal(puzzle.solution.length, n);
        assert.ok(
          puzzle.grid.every((row) => row.length === n && row.every((v) => [0, 1, 2].includes(v))),
        );
        assert.ok(
          puzzle.solution.every((row) => row.length === n && row.every((v) => [1, 2].includes(v))),
        );
        assert.equal(puzzle.hRel.length, n);
        assert.equal(puzzle.vRel.length, n - 1);
        assert.ok(puzzle.hRel.every((row) => row.length === n - 1));
        assert.ok(puzzle.vRel.every((row) => row.length === n));
        const solutions = solveIndependently(puzzle);
        assert.equal(solutions.length, 1, `size ${n}, seed ${seed}`);
        assert.deepEqual(solutions[0], puzzle.solution);
      }
    } finally {
      Math.random = originalRandom;
    }
  });
}

test("defaults to 6×6 and rejects unsupported grid sizes", () => {
  assert.equal(generateTango().grid.length, 6);
  for (const size of [0, 5, 7, 10, NaN, "8", null]) {
    assert.throws(() => generateTango(size), /6×6 or 8×8/);
  }
});
