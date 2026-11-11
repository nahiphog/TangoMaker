import assert from "node:assert/strict";
import { test } from "node:test";
import { createShareLink, readSharedGrid } from "../src/lib/tango-share.ts";
import { exportPuzzle, importPuzzle } from "../src/lib/tango-files.ts";

for (const n of [6, 8, 10, 12]) {
  test(`share link preserves ${n}x${n} puzzle and validates on import`, () => {
    const grid = Array.from({ length: n }, (_, r) =>
      Array.from({ length: n }, (_, c) => 1 + ((r + c) % 2)),
    );
    const puzzle = {
      grid,
      solution: grid,
      hRel: Array.from({ length: n }, () => Array(n - 1).fill(2)),
      vRel: Array.from({ length: n - 1 }, () => Array(n).fill(2)),
    };
    const link = new URL(
      createShareLink("https://nahiphog.github.io/TangoMaker/tango/?old=1#old", puzzle),
    );
    assert.equal(link.pathname, "/TangoMaker/tango/");
    assert.equal(link.search, "");
    assert.equal(readSharedGrid(link.hash), exportPuzzle(puzzle));
    assert.deepEqual(importPuzzle(readSharedGrid(link.hash)), puzzle);
  });
}
test("share links ignore unrelated anchors and reject malformed grid payloads", () => {
  for (const hash of ["", "#", "#instructions"]) assert.equal(readSharedGrid(hash), null);
  for (const value of ["", "012", "3".repeat(96), "0".repeat(96) + "&grid=1", "%30".repeat(96)]) {
    assert.throws(() => readSharedGrid(`#grid=${value}`), /invalid grid string/);
  }
  assert.throws(
    () => importPuzzle(readSharedGrid(`#grid=${"0".repeat(96)}`)),
    /more than one solution/i,
  );
});
