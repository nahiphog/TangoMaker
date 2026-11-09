import { generateTango, type GridSize, type TangoPuzzle } from "./tango";

export type GenerationResult = { ok: true; puzzle: TangoPuzzle } | { ok: false; error: string };

self.addEventListener("message", (event: MessageEvent<GridSize>) => {
  let result: GenerationResult;
  try {
    result = { ok: true, puzzle: generateTango(event.data) };
  } catch (error) {
    result = {
      ok: false,
      error: error instanceof Error ? error.message : "Puzzle generation failed. Please try again.",
    };
  }
  self.postMessage(result);
});
