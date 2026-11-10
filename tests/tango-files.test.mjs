import assert from "node:assert/strict";
import { test } from "node:test";
import { generateTango } from "../src/lib/tango.ts";
import { exportPuzzle, parsePuzzle, importPuzzle } from "../src/lib/tango-files.ts";
import { buildGroupedWalkthrough } from "../src/lib/tango-walkthrough.ts";
for (const size of [6, 8, 10, 12])
  test(`${size}x${size}: export/import preserves clues and grouped steps fill new cells`, () => {
    let seed = 6;
    const original = Math.random;
    let puzzle;
    try {
      Math.random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
      puzzle = generateTango(size, "rotational-pairs");
    } finally {
      Math.random = original;
    }
    const text = exportPuzzle(puzzle);
    assert.equal(JSON.parse(text).solution, undefined);
    const imported = importPuzzle(text);
    assert.deepEqual(imported, puzzle);
    // A bogus answer in an otherwise valid file is ignored and reconstructed.
    assert.deepEqual(
      importPuzzle(JSON.stringify({ ...JSON.parse(text), solution: "wrong" })),
      puzzle,
    );
    const groups = [];
    buildGroupedWalkthrough(
      { board: imported.grid, hRel: imported.hRel, vRel: imported.vRel },
      (s) => groups.push(s),
    );
    let previous = imported.grid,
      count = 0;
    for (const [i, step] of groups.entries()) {
      assert.deepEqual(step.before, previous);
      assert.ok(step.placements.length >= 1);
      const changed = [];
      for (let r = 0; r < size; r++)
        for (let c = 0; c < size; c++)
          if (step.after[r][c] !== step.before[r][c]) {
            assert.equal(step.before[r][c], 0);
            assert.equal(step.after[r][c], puzzle.solution[r][c]);
            changed.push(`${r},${c}`);
          }
      assert.equal(changed.length, step.placements.length);
      assert.deepEqual(new Set(changed), new Set(step.placements.map((p) => p.target.join(","))));
      assert.ok(step.placements.every((p) => p.explanation.length > 0));
      if (i && !step.search)
        assert.notEqual(
          groups[i - 1].title,
          step.title,
          "Consecutive matching techniques should be combined",
        );
      count += changed.length;
      previous = step.after;
    }
    assert.equal(count, puzzle.grid.flat().filter((v) => !v).length);
    assert.deepEqual(previous, puzzle.solution);
    if (size === 6)
      assert.ok(
        groups.some((g) => g.placements.length > 1),
        "Multi-cell steps are exercised",
      );
  });
test("rejects malformed, oversized, conflicting, ambiguous, and unverified files", () => {
  const grid = Array.from({ length: 6 }, () => Array(6).fill(0));
  const data = {
    format: "TangoMaker",
    version: 1,
    size: 6,
    grid,
    hRel: Array.from({ length: 6 }, () => Array(5).fill(0)),
    vRel: Array.from({ length: 5 }, () => Array(6).fill(0)),
  };
  assert.throws(() => parsePuzzle("{"), /JSON/);
  assert.throws(() => parsePuzzle(" ".repeat(65537)), /64 KB/);
  for (const edit of [{ version: 2 }, { size: 7 }, { grid: [[0]] }, { hRel: [] }, { vRel: "bad" }])
    assert.throws(() => parsePuzzle(JSON.stringify({ ...data, ...edit })));
  assert.throws(() => importPuzzle(JSON.stringify(data)), /more than one/);
  grid[0][0] = grid[0][1] = grid[0][2] = 1;
  assert.throws(() => importPuzzle(JSON.stringify(data)), /no solution/);
  grid[0][0] = 3;
  assert.throws(() => parsePuzzle(JSON.stringify(data)), /Invalid grid/);
  grid[0][0] = "1";
  assert.throws(() => parsePuzzle(JSON.stringify(data)), /Invalid grid/);
  grid[0][0] = grid[0][1] = grid[0][2] = 0;
  assert.throws(() => importPuzzle(JSON.stringify(data), -1), /time limit/);
});
