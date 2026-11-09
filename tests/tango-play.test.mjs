import assert from "node:assert/strict";
import { test } from "node:test";
import { placeCell, checkRules, checkProgress } from "../src/lib/tango-play.ts";

for (const size of [6, 8, 10, 12]) {
  const solution = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => ((r + c) % 2) + 1),
  );
  const empty = () => Array.from({ length: size }, () => Array(size).fill(0));
  const puzzle = {
    hRel: Array.from({ length: size }, () => Array(size - 1).fill(2)),
    vRel: Array.from({ length: size - 1 }, () => Array(size).fill(2)),
  };
  test(`${size}×${size} locks clues, copies edits, and recognizes completion`, () => {
    const givens = empty();
    givens[0][0] = 1;
    const board = structuredClone(givens);
    assert.equal(placeCell(board, givens, 0, 0, 2), board);
    const edited = placeCell(board, givens, 0, 1, 2);
    assert.equal(edited[0][1], 2);
    assert.equal(board[0][1], 0);
    assert.equal(givens[0][1], 0);
    assert.equal(placeCell(edited, givens, 0, 1, 0)[0][1], 0);
    assert.equal(checkProgress(edited, solution).solved, false);
    assert.equal(checkProgress(edited, solution).mistakes.size, 0);
    assert.equal(checkProgress(solution, solution).solved, true);
    assert.equal(checkRules(solution, puzzle).conflicts.size, 0);
    const wrong = structuredClone(solution);
    wrong[0][1] = 1;
    assert.equal(checkProgress(wrong, solution).solved, false);
    assert.deepEqual([...checkProgress(wrong, solution).mistakes], ["0,1"]);
  });
  test(`${size}×${size} detects row/column triples, balance, and relations`, () => {
    const board = empty();
    assert.equal(checkRules(board, puzzle).conflicts.size, 0);
    board[0][0] = board[0][1] = board[0][2] = 1;
    board[1][0] = board[2][0] = 1;
    const result = checkRules(board, puzzle);
    for (const key of ["0,0", "0,1", "0,2", "1,0", "2,0"]) assert.ok(result.conflicts.has(key));
    const balanced = empty();
    for (let i = 0; i <= size / 2; i++) balanced[0][i] = 2;
    assert.ok(checkRules(balanced, puzzle).messages.some((message) => message.includes("only")));
    const relationOnly = empty();
    relationOnly[0][0] = 1;
    relationOnly[0][1] = 2;
    const equals = structuredClone(puzzle);
    equals.hRel[0][0] = 1;
    assert.ok(checkRules(relationOnly, equals).conflicts.has("0,1"));
    relationOnly[0][1] = 0;
    assert.equal(checkRules(relationOnly, equals).conflicts.size, 0);
  });
}
