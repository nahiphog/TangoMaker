import { findHint, type HintInput } from "./tango-hints";

self.onmessage = (event: MessageEvent<HintInput>) => {
  self.postMessage(findHint(event.data));
};
