import { useEffect, useRef, useState } from "react";
import type { TangoPuzzle } from "@/lib/tango";
import type { WalkthroughEvent, WalkthroughStep } from "@/lib/tango-walkthrough";
import { TangoGrid } from "./TangoGrid";
import { Button } from "./ui/button";

export function TangoWalkthrough({ puzzle, onExit }: { puzzle: TangoPuzzle; onExit: () => void }) {
  const [steps, setSteps] = useState<WalkthroughStep[]>([]);
  const [phase, setPhase] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(2500);
  const [status, setStatus] = useState<"building" | "complete" | "cancelled" | "error">("building");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const workerRef = useRef<Worker | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  useEffect(() => {
    let worker: Worker;
    try {
      worker = new Worker(new URL("../lib/tango-walkthrough.worker.ts", import.meta.url), {
        type: "module",
      });
      workerRef.current = worker;
      worker.onmessage = (event: MessageEvent<WalkthroughEvent>) => {
        if (workerRef.current !== worker) return;
        const message = event.data;
        if (message.kind === "step") setSteps((previous) => [...previous, message.step]);
        else {
          setStatus(message.kind === "complete" ? "complete" : "error");
          if (message.kind === "error") {
            setError(message.message);
            setRunning(false);
          }
          worker.terminate();
          workerRef.current = null;
        }
      };
      worker.onerror = () => {
        if (workerRef.current !== worker) return;
        setError("Could not prepare the walkthrough. Please retry.");
        setStatus("error");
        setRunning(false);
        worker.terminate();
        workerRef.current = null;
      };
      worker.postMessage({ board: puzzle.grid, hRel: puzzle.hRel, vRel: puzzle.vRel });
    } catch {
      setError(
        "Could not start background analysis. Please retry in a browser with worker support.",
      );
      setStatus("error");
    }
    return () => {
      worker?.terminate();
      if (workerRef.current === worker) workerRef.current = null;
    };
  }, [puzzle, attempt]);

  // Each replay position applies one complete move.
  const lastPhase = steps.length;
  const finished = status === "complete" && phase === lastPhase;
  useEffect(() => {
    if (!running || phase >= lastPhase) return;
    const timer = setTimeout(() => {
      setPhase((current) => current + 1);
    }, speed);
    return () => clearTimeout(timer);
  }, [running, phase, lastPhase, speed]);
  const step = phase ? steps[phase - 1] : undefined;
  const board = step ? step.after : puzzle.grid;
  const tally = new Map<string, number>();
  for (const item of steps) tally.set(item.title, (tally.get(item.title) ?? 0) + 1);
  const filled = board.flat().filter(Boolean).length;
  const navigate = (next: number) => {
    setRunning(false);
    setPhase(next);
  };
  const stop = () => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setStatus("cancelled");
    setRunning(false);
  };
  const retry = () => {
    setSteps([]);
    setPhase(0);
    setRunning(false);
    setError("");
    setStatus("building");
    setAttempt((current) => current + 1);
  };

  return (
    <section
      className="mx-auto flex w-full max-w-5xl flex-col gap-5"
      aria-label="Solution walkthrough"
    >
      <div className="grid items-start gap-8 md:grid-cols-2">
        <div className="min-w-0 space-y-3 md:sticky md:top-20">
          <TangoGrid
            grid={board}
            givens={puzzle.grid}
            hRel={puzzle.hRel}
            vRel={puzzle.vRel}
            label={phase === 0 ? "Puzzle" : `Puzzle — step ${phase}`}
            highlights={new Set(step?.cells.map((cell) => cell.join(",")) ?? [])}
            activeCell={step?.target.join(",")}
            describeCells
          />
          <p className="text-center text-sm">
            {filled} / {board.length ** 2} cells filled · outlined cells explain the move; the
            dashed outline marks the newly filled cell.
          </p>
        </div>
        <div className="min-w-0 space-y-4">
          <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold">
            Solution walkthrough
          </h2>
          <div className="min-h-48 space-y-3 rounded-lg border p-4" aria-live="polite">
            {finished ? (
              <h2 className="text-xl font-semibold text-green-600 dark:text-green-400">
                Puzzle solved
              </h2>
            ) : (
              <h2 className="text-xl font-semibold">
                {step ? `Step ${phase}: ${step.title}` : "Start with the clues"}
              </h2>
            )}
            {step ? (
              <>
                {step.search && (
                  <p className="font-semibold text-amber-700 dark:text-amber-300">
                    Computer search used for this step
                  </p>
                )}
                <p className="text-sm font-medium">
                  Row {step.target[0] + 1}, column {step.target[1] + 1}: placed{" "}
                  {step.value === 1 ? "orange" : "blue"}.
                </p>
                <p className="text-sm">{step.explanation}</p>
              </>
            ) : (
              <p className="text-sm">
                Next fills exactly one new cell and explains the deduction. Use Autoplay to watch
                the solution unfold, or pause, rewind, and drag the replay position at any time.
              </p>
            )}
            {finished && (
              <p className="text-sm">
                All cells satisfy the rules. {steps.filter((item) => item.search).length} step(s)
                required search beyond the six teaching techniques.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={phase === 0} onClick={() => navigate(phase - 1)}>
              Previous
            </Button>
            <Button disabled={phase >= lastPhase} onClick={() => navigate(phase + 1)}>
              Next
            </Button>
            <Button
              variant="secondary"
              disabled={finished || (status !== "building" && phase >= lastPhase)}
              onClick={() => setRunning((current) => !current)}
            >
              {running && !finished ? "Pause" : "Autoplay"}
            </Button>
            <Button variant="outline" disabled={phase === 0} onClick={() => navigate(0)}>
              Restart
            </Button>
          </div>
          <div className="space-y-2">
            <label htmlFor="walkthrough-position" className="block text-sm">
              Replay position: {phase} / {lastPhase}
              {status === "building" ? " (preparing more steps…)" : ""}
            </label>
            <input
              id="walkthrough-position"
              className="w-full accent-primary"
              type="range"
              min={0}
              max={Math.max(1, lastPhase)}
              value={phase}
              disabled={!lastPhase}
              onChange={(event) => navigate(Math.min(lastPhase, Number(event.target.value)))}
            />
            <label className="flex items-center gap-2 text-sm">
              Playback speed
              <select
                className="rounded border bg-background p-2"
                value={speed}
                onChange={(event) => setSpeed(Number(event.target.value))}
              >
                <option value={4000}>Slow</option>
                <option value={2500}>Normal</option>
                <option value={1000}>Fast</option>
              </select>
            </label>
          </div>
          <div className="space-y-2 text-sm" role="status">
            {status === "building" && (
              <>
                <p>
                  Preparing the walkthrough in the background. {steps.length} steps ready; you can
                  already replay them.
                </p>
                <Button variant="outline" onClick={stop}>
                  Cancel preparation
                </Button>
              </>
            )}
            {status === "cancelled" && (
              <p>Preparation cancelled. The available steps remain replayable.</p>
            )}
            {error && <p className="text-destructive">{error}</p>}
            {(status === "cancelled" || status === "error") && (
              <Button variant="outline" onClick={retry}>
                Prepare again
              </Button>
            )}
          </div>
          <table className="w-full text-sm">
            <caption className="mb-2 text-left font-semibold">
              Technique tally — {status === "complete" ? "entire walkthrough" : "prepared steps"}
            </caption>
            <thead>
              <tr className="border-b">
                <th scope="col" className="py-2 text-left">
                  Technique name
                </th>
                <th scope="col" className="py-2 text-right">
                  Steps
                </th>
              </tr>
            </thead>
            <tbody>
              {[...tally].map(([name, count]) => (
                <tr key={name} className="border-b">
                  <th scope="row" className="py-2 text-left font-normal">
                    {name}
                  </th>
                  <td className="py-2 text-right tabular-nums">{count}</td>
                </tr>
              ))}
              {!steps.length && (
                <tr>
                  <td colSpan={2} className="py-2 text-muted-foreground">
                    No steps prepared yet.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" className="pt-2 text-left">
                  Total
                </th>
                <td className="pt-2 text-right font-semibold tabular-nums">{steps.length}</td>
              </tr>
            </tfoot>
          </table>
          <p className="text-xs text-muted-foreground">
            Logical techniques come first. If they stall, an explicitly labelled backtracking check
            eliminates a candidate. The stored answer is never used to build this replay.
          </p>
          <Button variant="secondary" onClick={onExit}>
            Close walkthrough
          </Button>
        </div>
      </div>
    </section>
  );
}
