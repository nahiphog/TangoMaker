import { countSolutions, type Cell, type Grid } from "./tango.ts";
import { findHint, type HintInput, type Position } from "./tango-hints.ts";

export type WalkthroughStep = {
  before: Grid;
  after: Grid;
  title: string;
  explanation: string;
  cells: Position[];
  target: Position;
  value: Cell;
  search: boolean;
};
export type WalkthroughEvent =
  | { kind: "step"; step: GroupedWalkthroughStep }
  | { kind: "complete" }
  | { kind: "error"; message: string };

export type GroupedWalkthroughStep = WalkthroughStep & {
  placements: { target: Position; value: Cell; explanation: string }[];
};

// Merge consecutive deductions of the same technique, retaining every reason.
// A published group is immutable so replay never changes under the user's feet.
export function buildGroupedWalkthrough(
  input: HintInput,
  emit: (step: GroupedWalkthroughStep) => void,
) {
  let pending: GroupedWalkthroughStep | undefined;
  buildWalkthrough(input, (step) => {
    const placement = { target: step.target, value: step.value, explanation: step.explanation };
    if (pending && pending.title === step.title && !step.search) {
      pending.after = step.after;
      pending.placements.push(placement);
      const cells = new Map(
        [...pending.cells, ...step.cells].map((cell) => [cell.join(","), cell]),
      );
      pending.cells = [...cells.values()];
    } else {
      if (pending) emit(pending);
      pending = { ...step, placements: [placement] };
    }
  });
  if (pending) emit(pending);
}

// Streams a replay from original clues. The answer is deliberately not an input.
// Search is a clearly labelled fallback, never disguised as a human deduction.
export function buildWalkthrough(input: HintInput, emit: (step: WalkthroughStep) => void) {
  let board = input.board.map((row) => [...row]);
  for (let index = 0; index < board.length ** 2; index++) {
    const hint = findHint({ ...input, board });
    if (hint.kind === "conflict") throw new Error(hint.explanation);
    if (board.every((row) => row.every(Boolean))) return;
    let target: Position, value: Cell, title: string, explanation: string, cells: Position[];
    let search = false;
    if (hint.kind === "move") {
      ({ target, value, explanation, cells } = hint);
      title = hint.technique;
    } else {
      search = true;
      const r = board.findIndex((row) => row.includes(0));
      const c = board[r].indexOf(0);
      target = [r, c];
      cells = [target];
      const results = ([1, 2] as Cell[]).map((candidate) => {
        const trial = board.map((row) => [...row]);
        trial[r][c] = candidate;
        return countSolutions(trial, input.hRel, input.vRel, 1);
      });
      if (results[0] === 0 && results[1] === 1) value = 2;
      else if (results[1] === 0 && results[0] === 1) value = 1;
      else
        throw new Error(
          results.every((result) => result === 0)
            ? "These clues have no solution."
            : "Both colors can lead to a solution. This walkthrough requires a uniquely solvable puzzle.",
        );
      title = "Search-based elimination";
      const rejected = value === 1 ? "blue" : "orange";
      explanation = `The six teaching techniques have stalled. An exhaustive backtracking check found no valid completion with ${rejected} at row ${r + 1}, column ${c + 1}, and found a completion with ${value === 1 ? "orange" : "blue"}. This is a computer search proof, not a simple human deduction. The internal search branches are not shown.`;
    }
    const before = board;
    board = board.map((row) => [...row]);
    board[target[0]][target[1]] = value;
    emit({ before, after: board, title, explanation, target, value, cells, search });
  }
  const final = findHint({ ...input, board });
  if (final.kind === "conflict" || !board.every((row) => row.every(Boolean))) {
    throw new Error("The walkthrough did not reach a valid completed board.");
  }
}
