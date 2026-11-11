import assert from "node:assert/strict";
import { test } from "node:test";
import { findHint } from "../src/lib/tango-hints.ts";
import { solveIndependently } from "./tango-oracle.mjs";

const empty = (n) => ({
  board: Array.from({ length: n }, () => Array(n).fill(0)),
  hRel: Array.from({ length: n }, () => Array(n - 1).fill(0)),
  vRel: Array.from({ length: n - 1 }, () => Array(n).fill(0)),
});
const advanced = {
  6: [
    [0, 0, 0, 0, 2, 0],
    [2, 0, 2, 0, 0],
  ],
  8: [
    [0, 0, 0, 0, 0, 2, 0, 0],
    [0, 2, 0, 2, 0, 0, 2],
  ],
  10: [
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    [1, 2, 0, 0, 0, 1, 0, 2, 2],
  ],
  12: [
    [0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0],
    [2, 0, 0, 0, 0, 1, 0, 0, 0, 0, 2],
  ],
};
const transpose = (input) => {
  const n = input.board.length,
    out = empty(n);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) out.board[c][r] = input.board[r][c];
  for (let r = 0; r < n; r++) for (let c = 0; c < n - 1; c++) out.vRel[c][r] = input.hRel[r][c];
  for (let r = 0; r < n - 1; r++) for (let c = 0; c < n; c++) out.hRel[c][r] = input.vRel[r][c];
  return out;
};
for (const n of [6, 8, 10, 12]) {
  const fixtures = [
    [
      "Avoid three consecutive colors",
      (x) => {
        x.board[0][0] = x.board[0][1] = 1;
      },
    ],
    [
      "Fill the gap",
      (x) => {
        x.board[0][0] = x.board[0][2] = 1;
      },
    ],
    [
      "Complete the balance",
      (x) => {
        x.board[0] = Array.from({ length: n }, (_, c) => (c ? 1 + (c % 2) : 0));
      },
    ],
    [
      "Follow a relation",
      (x) => {
        x.board[0][0] = 1;
        x.hRel[0][0] = 1;
      },
    ],
    [
      "Follow a relation chain",
      (x) => {
        x.board[0][0] = 1;
        x.hRel[0][0] = 2;
        x.hRel[0][1] = 1;
      },
    ],
    [
      "Eliminate line patterns",
      (x) => {
        x.board[0] = [...advanced[n][0]];
        x.hRel[0] = [...advanced[n][1]];
      },
    ],
  ];
  for (const [technique, setup] of fixtures)
    test(`${n}x${n}: ${technique} is forced, across orientations and colors`, () => {
      for (const vertical of [false, true])
        for (const flip of [false, true]) {
          let input = empty(n);
          setup(input);
          if (vertical) input = transpose(input);
          if (flip) input.board = input.board.map((row) => row.map((v) => (v ? 3 - v : 0)));
          const before = JSON.stringify(input);
          // A throwing solution property proves the engine never consults an answer.
          Object.defineProperty(input, "solution", {
            get() {
              throw Error("Hidden solution accessed");
            },
          });
          const hint = findHint(input);
          assert.equal(JSON.stringify(input), before, "Analysis must not mutate the board");
          assert.equal(hint.kind, "move");
          assert.equal(hint.technique, technique);
          const [r, c] = hint.target;
          assert.equal(input.board[r][c], 0);
          const puzzle = { grid: input.board, hRel: input.hRel, vRel: input.vRel };
          assert.ok(solveIndependently(puzzle).length > 0, "Premises must be satisfiable");
          const wrong = structuredClone(input.board);
          wrong[r][c] = 3 - hint.value;
          assert.equal(
            solveIndependently({ ...puzzle, grid: wrong }).length,
            0,
            "Opposite move must be impossible",
          );
        }
    });
  test(`${n}x${n}: detects contradictions before hints and reports stalled boards`, () => {
    let input = empty(n);
    assert.equal(findHint(input).kind, "stalled");
    input.board[0][0] = input.board[0][1] = input.board[0][2] = 1;
    assert.equal(findHint(input).kind, "conflict");
    input = empty(n);
    input.hRel[0][0] = input.hRel[0][1] = 1;
    assert.equal(findHint(input).kind, "conflict", "No valid line pattern");
    input = empty(n);
    input.board[0][0] = 1;
    input.board[1][1] = 2;
    input.hRel[0][0] = 1;
    input.vRel[0][1] = 1;
    assert.equal(findHint(input).kind, "conflict", "Chain endpoints disagree");
    input = empty(n);
    input.hRel[0][0] = input.hRel[1][0] = input.vRel[0][0] = 1;
    input.vRel[0][1] = 2;
    assert.equal(findHint(input).kind, "conflict", "Odd relation cycle");
    input = empty(n);
    input.board = input.board.map((row, r) => row.map((_, c) => 1 + ((r + c) % 2)));
    assert.equal(findHint(input).kind, "stalled");
    assert.match(findHint(input).explanation, /complete/);
  });
}
