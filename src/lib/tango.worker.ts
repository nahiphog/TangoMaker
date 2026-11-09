import { generateTango, type DiggingMethod, type GridSize, type TangoPuzzle } from "./tango";

export type GenerationRequest = { size: GridSize; method: DiggingMethod };

export type GenerationResult = { ok: true; puzzle: TangoPuzzle } | { ok: false; error: string };

self.addEventListener("message", (event: MessageEvent<GenerationRequest>) => {
  let result: GenerationResult;
  try {
    result = { ok: true, puzzle: generateTango(event.data.size, event.data.method) };
  } catch (error) {
    result = {
      ok: false,
      error: error instanceof Error ? error.message : "Puzzle generation failed. Please try again.",
    };
  }
  self.postMessage(result);
});
