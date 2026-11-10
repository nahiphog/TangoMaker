import assert from "node:assert/strict";
import { test } from "node:test";
import { generateTango } from "../src/lib/tango.ts";
import { buildWalkthrough } from "../src/lib/tango-walkthrough.ts";
import { checkRules } from "../src/lib/tango-play.ts";
import { solveIndependently } from "./tango-oracle.mjs";

for (const n of [6, 8, 10, 12])
  for (const method of ["rotational-pairs", "single-clue"]) {
    test(`${n}x${n} ${method}: walkthrough goes from clues to solution without reading the answer`, () => {
      const originalRandom = Math.random;
      let seed = 6;
      let puzzle;
      try {
        Math.random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
        puzzle = generateTango(n, method);
      } finally {
        Math.random = originalRandom;
      }
      const original = structuredClone(puzzle.grid);
      const input = { board: puzzle.grid, hRel: puzzle.hRel, vRel: puzzle.vRel };
      Object.defineProperty(input, "solution", {
        get() {
          throw Error("Answer accessed");
        },
      });
      const steps = [];
      buildWalkthrough(input, (step) => steps.push(step));
      assert.equal(steps.length, original.flat().filter((v) => !v).length);
      let previous = original;
      for (const step of steps) {
        assert.deepEqual(step.before, previous);
        const [r, c] = step.target;
        assert.equal(step.before[r][c], 0);
        assert.equal(step.after[r][c], puzzle.solution[r][c]);
        const diffs = step.after.flat().filter((v, i) => v !== step.before.flat()[i]);
        assert.equal(diffs.length, 1);
        assert.equal(checkRules(step.after, puzzle).conflicts.size, 0);
        assert.equal(step.search, step.title === "Search-based elimination");
        if (step.search) {
          assert.match(step.explanation, /backtracking/);
          const wrong = structuredClone(step.before);
          wrong[r][c] = 3 - step.value;
          assert.equal(solveIndependently({ ...puzzle, grid: wrong }).length, 0);
        }
        previous = step.after;
      }
      assert.deepEqual(previous, puzzle.solution);
      assert.deepEqual(input.board, original);
      // Stored snapshots are immutable: stepping backwards recovers the original states.
      for (let i = steps.length - 1; i > 0; i--)
        assert.deepEqual(steps[i].before, steps[i - 1].after);
      if (n === 6 && method === "rotational-pairs")
        assert.ok(
          steps.some((step) => step.search),
          "Exercise search fallback",
        );
    });
  }
test("walkthrough rejects conflicting and ambiguous boards rather than inventing steps", () => {
  const board = Array.from({ length: 6 }, () => Array(6).fill(0));
  const input = {
    board,
    hRel: Array.from({ length: 6 }, () => Array(5).fill(0)),
    vRel: Array.from({ length: 5 }, () => Array(6).fill(0)),
  };
  assert.throws(() => buildWalkthrough(input, () => {}), /uniquely solvable/);
  board[0][0] = board[0][1] = board[0][2] = 1;
  assert.throws(() => buildWalkthrough(input, () => {}), /three consecutive/);
});
