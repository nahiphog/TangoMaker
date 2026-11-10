import { useEffect, useRef, useState } from "react";
import type { Cell } from "@/lib/tango";
import type { HintInput, HintResult, Position } from "@/lib/tango-hints";
import { Button } from "./ui/button";

export function TangoHints({
  input,
  onHighlight,
  onApply,
}: {
  input: HintInput;
  onHighlight: (cells: Position[]) => void;
  onApply: (r: number, c: number, value: Cell) => void;
}) {
  const workerRef = useRef<Worker | null>(null);
  const [result, setResult] = useState<HintResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [explained, setExplained] = useState(false);
  const [error, setError] = useState("");
  // The parent keys this component by board contents. Edits, undo, reset, and
  // leaving play unmount it, terminate analysis, and invalidate its result.
  useEffect(
    () => () => {
      if (workerRef.current) {
        workerRef.current.onmessage = null;
        workerRef.current.terminate();
        workerRef.current = null;
      }
    },
    [],
  );
  const cancel = () => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setBusy(false);
  };
  const request = () => {
    cancel();
    setResult(null);
    setExplained(false);
    setError("");
    onHighlight([]);
    setBusy(true);
    try {
      const worker = new Worker(new URL("../lib/tango-hints.worker.ts", import.meta.url), {
        type: "module",
      });
      workerRef.current = worker;
      worker.onmessage = (event: MessageEvent<HintResult>) => {
        if (workerRef.current !== worker) return;
        setResult(event.data);
        onHighlight(event.data.kind === "stalled" ? [] : event.data.cells);
        cancel();
      };
      worker.onerror = () => {
        if (workerRef.current !== worker) return;
        setError("Hint analysis could not finish. Please try again.");
        cancel();
      };
      worker.postMessage(input);
    } catch {
      cancel();
      setError("Hints require browser worker support. Please try again in a supported browser.");
    }
  };
  return (
    <section className="w-full rounded-lg border p-4" aria-label="Puzzle hints">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={request} disabled={busy}>
          Show a hint
        </Button>
        {busy && (
          <Button variant="outline" onClick={cancel}>
            Cancel hint
          </Button>
        )}
        <p className="text-xs text-muted-foreground">
          Hints assume your existing entries are correct. They never consult the solution.
        </p>
      </div>
      <div role="status" className="mt-3 space-y-3 text-sm">
        {busy && <p>Looking for a logical move…</p>}
        {error && <p>{error}</p>}
        {result?.kind === "move" && (
          <>
            <p>
              <strong>{result.technique}</strong> — look at the outlined cells.
            </p>
            {!explained ? (
              <Button variant="outline" onClick={() => setExplained(true)}>
                Explain
              </Button>
            ) : (
              <>
                <p>{result.explanation}</p>
                <Button onClick={() => onApply(...result.target, result.value)}>Apply move</Button>
              </>
            )}
          </>
        )}
        {result?.kind === "conflict" && (
          <p>
            <strong>Review these cells first.</strong> {result.explanation}
          </p>
        )}
        {result?.kind === "stalled" && <p>{result.explanation}</p>}
      </div>
    </section>
  );
}

export function TangoTechniques({ size }: { size: number }) {
  const balanceBefore = Array.from({ length: size }, (_, i) => (i % 2 === 0 ? "🟠" : "□")).join(
    " ",
  );
  const balanceAfter = Array.from({ length: size }, (_, i) => (i % 2 === 0 ? "🟠" : "🔵")).join(
    " ",
  );
  const techniques = [
    {
      title: "Avoid three consecutive colors",
      explanation:
        "Two adjacent matching colors force their immediate neighbors to the other color.",
      before: "🟠 🟠 □",
      after: "🟠 🟠 🔵",
      accessible: "Orange, orange, blank becomes orange, orange, blue.",
    },
    {
      title: "Fill the gap",
      explanation:
        "Two matching colors separated by one space force that space to the other color.",
      before: "🟠 □ 🟠",
      after: "🟠 🔵 🟠",
      accessible: "Orange, blank, orange becomes orange, blue, orange.",
    },
    {
      title: "Complete the balance",
      explanation: `Every row and column needs ${size / 2} of each color. Once one color reaches that quota, fill every remaining space with the other color.`,
      before: balanceBefore,
      after: balanceAfter,
      accessible: `${size / 2} orange cells alternating with blanks; all blanks become blue.`,
    },
    {
      title: "Follow a relation",
      explanation:
        "An equals sign keeps the color; a cross switches it. You can follow either direction.",
      before: "🟠 = □",
      after: "🟠 = 🟠",
      accessible: "Orange equals blank becomes orange equals orange.",
    },
    {
      title: "Follow a relation chain",
      explanation:
        "Start at a known color and follow connected clues. Each cross flips the color; each equals sign preserves it.",
      before: "🟠 × □ = □",
      after: "🟠 × 🔵 = 🔵",
      accessible: "Orange, cross, blank, equals, blank becomes orange, cross, blue, equals, blue.",
    },
    {
      title: "Eliminate line patterns",
      explanation:
        "Keep only whole-line arrangements that fit the entries, relations, balance, and no-three rule. Fill cells where all survivors agree. For example, if only these two six-cell patterns survive, four positions are settled. This does not guess a full board.",
      before: "🟠 🔵 🟠 🔵 🔵 🟠 / 🟠 🔵 🔵 🟠 🔵 🟠",
      after: "🟠 🔵 □ □ 🔵 🟠",
      accessible:
        "Two surviving six-cell patterns agree on orange at positions one and six, and blue at positions two and five. Positions three and four remain unsettled.",
    },
  ];
  return (
    <details className="w-full rounded-lg border p-4">
      <summary className="cursor-pointer font-semibold">Solving techniques</summary>
      <p className="mt-3 text-sm text-muted-foreground">
        These rules work horizontally and vertically, and with either color. Some puzzles need
        techniques beyond this library.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {techniques.map((technique) => (
          <article key={technique.title} className="min-w-0 rounded-md bg-muted/40 p-3">
            <h3 className="font-medium">{technique.title}</h3>
            <p className="my-2 text-sm">{technique.explanation}</p>
            <div className="overflow-x-auto text-sm" role="img" aria-label={technique.accessible}>
              <div aria-hidden="true" className="whitespace-nowrap">
                {technique.before}
              </div>
              <div aria-hidden="true" className="my-1">
                ↓
              </div>
              <div aria-hidden="true" className="whitespace-nowrap">
                {technique.after}
              </div>
            </div>
          </article>
        ))}
      </div>
    </details>
  );
}
