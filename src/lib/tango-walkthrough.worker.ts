import { buildGroupedWalkthrough, type WalkthroughEvent } from "./tango-walkthrough";
import type { HintInput } from "./tango-hints";

self.onmessage = (event: MessageEvent<HintInput>) => {
  const send = (message: WalkthroughEvent) => self.postMessage(message);
  try {
    buildGroupedWalkthrough(event.data, (step) => send({ kind: "step", step }));
    send({ kind: "complete" });
  } catch (error) {
    send({
      kind: "error",
      message: error instanceof Error ? error.message : "Walkthrough analysis failed.",
    });
  }
};
