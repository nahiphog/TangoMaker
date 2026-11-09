import assert from "node:assert/strict";
import { test } from "node:test";
import { generateTango, createDiggingGroups, DEFAULT_DIGGING_METHOD } from "../src/lib/tango.ts";

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

for (const method of ["rotational-pairs", "single-clue"]) {
  for (const n of [6, 8]) {
    test(`${method} ${n}×${n}: 50 seeded puzzles have exactly one independently verified solution`, () => {
      const originalRandom = Math.random;
      try {
        for (let seed = 1; seed <= 50; seed++) {
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
          if (seed <= 2) {
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
  for (const size of [0, 5, 7, 10, NaN, "8", null]) {
    assert.throws(() => generateTango(size), /6×6 or 8×8/);
  }
});

for (const n of [6, 8]) {
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
