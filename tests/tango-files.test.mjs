import assert from "node:assert/strict";
import { test } from "node:test";
import { generateTango } from "../src/lib/tango.ts";
import { exportPuzzle, parsePuzzle, importPuzzle } from "../src/lib/tango-files.ts";
import { buildWalkthrough } from "../src/lib/tango-walkthrough.ts";
for (const size of [6, 8, 10, 12])
  test(`${size}x${size}: export/import preserves clues and steps fill exactly one new cell`, () => {
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
    assert.match(text, /^[012]+$/);
    assert.equal(text.length, 3 * size * size - 2 * size);
    assert.deepEqual(parsePuzzle(text), {
      grid: puzzle.grid,
      hRel: puzzle.hRel,
      vRel: puzzle.vRel,
    });
    const imported = importPuzzle(text);
    assert.deepEqual(imported, puzzle);
    // A bogus answer in an otherwise valid file is ignored and reconstructed.
    assert.deepEqual(
      importPuzzle(
        JSON.stringify({ format: "TangoMaker", version: 1, size, ...puzzle, solution: "wrong" }),
      ),
      puzzle,
    );
    const groups = [];
    buildWalkthrough({ board: imported.grid, hRel: imported.hRel, vRel: imported.vRel }, (s) =>
      groups.push(s),
    );
    let previous = imported.grid,
      count = 0;
    for (const step of groups) {
      assert.deepEqual(step.before, previous);

      const changed = [];
      for (let r = 0; r < size; r++)
        for (let c = 0; c < size; c++)
          if (step.after[r][c] !== step.before[r][c]) {
            assert.equal(step.before[r][c], 0);
            assert.equal(step.after[r][c], puzzle.solution[r][c]);
            changed.push(`${r},${c}`);
          }
      assert.equal(changed.length, 1);
      assert.equal(changed[0], step.target.join(","));
      assert.ok(step.explanation.length > 0);
      count += changed.length;
      previous = step.after;
    }
    assert.equal(count, puzzle.grid.flat().filter((v) => !v).length);
    assert.deepEqual(previous, puzzle.solution);
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

test("string format fixes border order and rejects bad digits or length", () => {
  const n = 6,
    hRel = Array.from({ length: n }, () => Array(n - 1).fill(0)),
    vRel = Array.from({ length: n - 1 }, () => Array(n).fill(0)),
    grid = Array.from({ length: n }, () => Array(n).fill(0));
  hRel[0][0] = 1;
  hRel[5][4] = 2;
  vRel[0][0] = 2;
  vRel[4][5] = 1;
  grid[0][0] = 1;
  grid[5][5] = 2;
  const text = exportPuzzle({ hRel, vRel, grid });
  assert.equal(text[0], "1");
  assert.equal(text[29], "2");
  assert.equal(text[30], "2");
  assert.equal(text[59], "1");
  assert.equal(text[60], "1");
  assert.equal(text[95], "2");
  assert.deepEqual(parsePuzzle("  " + text + "\n"), { hRel, vRel, grid });
  assert.throws(() => parsePuzzle("0".repeat(95)), /length/);
  assert.throws(() => parsePuzzle("3" + "0".repeat(95)), /only/);
  assert.throws(() => parsePuzzle("0".repeat(48) + " " + "0".repeat(48)), /only/);
});
