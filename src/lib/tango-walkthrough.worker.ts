import { buildWalkthrough, type WalkthroughEvent } from "./tango-walkthrough";
import type { HintInput } from "./tango-hints";

self.onmessage = (event: MessageEvent<HintInput>) => {
  const send = (message: WalkthroughEvent) => self.postMessage(message);
  try {
    buildWalkthrough(event.data, (step) => send({ kind: "step", step }));
    send({ kind: "complete" });
  } catch (error) {
    send({
      kind: "error",
      message: error instanceof Error ? error.message : "Walkthrough analysis failed.",
    });
  }
};
