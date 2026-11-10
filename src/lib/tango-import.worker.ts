import { importPuzzle } from "./tango-files";
import type { GenerationResult } from "./tango.worker";

self.onmessage = (event: MessageEvent<string>) => {
  let result: GenerationResult;
  try {
    result = { ok: true, puzzle: importPuzzle(event.data) };
  } catch (error) {
    result = {
      ok: false,
      error: error instanceof Error ? error.message : "Could not import this puzzle.",
    };
  }
  self.postMessage(result);
};
