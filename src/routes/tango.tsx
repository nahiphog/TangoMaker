import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_DIGGING_METHOD,
  GRID_SIZES,
  tallies,
  type DiggingMethod,
  type GridSize,
  type TangoPuzzle,
} from "@/lib/tango";
import type { GenerationRequest, GenerationResult } from "@/lib/tango.worker";
import { TangoGrid } from "@/components/TangoGrid";
import { TangoGame } from "@/components/TangoGame";
import { TangoWalkthrough } from "@/components/TangoWalkthrough";
import { CopyImageButton } from "@/components/CopyImageButton";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/tango")({
  head: () => ({
    meta: [
      { title: "Tango Generator" },
      {
        name: "description",
        content:
          "Generate a 6×6, 8×8, 10×10, or 12×12 Tango puzzle with = and × constraints and a guaranteed unique solution.",
      },
      { property: "og:title", content: "Tango Generator" },
      {
        property: "og:description",
        content:
          "Generate a 6×6, 8×8, 10×10, or 12×12 Tango puzzle with = and × constraints and a guaranteed unique solution.",
      },
    ],
  }),
  component: TangoPage,
});

function TangoPage() {
  const [size, setSize] = useState<GridSize>(6);
  const [method, setMethod] = useState<DiggingMethod>(DEFAULT_DIGGING_METHOD);
  const [state, setState] = useState<TangoPuzzle | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [walking, setWalking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const puzzleRef = useRef<HTMLDivElement>(null);
  const solutionRef = useRef<HTMLDivElement>(null);

  useEffect(
    () => () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    },
    [],
  );

  const cancel = () => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setLoading(false);
  };

  const run = () => {
    cancel();
    setError(null);
    setLoading(true);
    try {
      const worker = new Worker(new URL("../lib/tango.worker.ts", import.meta.url), {
        type: "module",
      });
      workerRef.current = worker;
      const finish = () => {
        worker.terminate();
        workerRef.current = null;
        setLoading(false);
      };
      worker.onmessage = (event: MessageEvent<GenerationResult>) => {
        if (workerRef.current !== worker) return;
        if (event.data.ok) setState(event.data.puzzle);
        else setError(event.data.error);
        finish();
      };
      const fail = () => {
        if (workerRef.current !== worker) return;
        setError("Could not generate a puzzle. Please try again.");
        finish();
      };
      worker.onerror = fail;
      worker.onmessageerror = fail;
      worker.postMessage({ size, method } satisfies GenerationRequest);
    } catch {
      cancel();
      setError(
        "Could not start puzzle generation. Please try again in a browser with Web Worker support.",
      );
    }
  };

  const t = state ? tallies(state) : null;

  if (state && walking)
    return (
      <main className="min-h-[calc(100vh-57px)] bg-background px-6 py-10">
        <TangoWalkthrough puzzle={state} onExit={() => setWalking(false)} />
      </main>
    );

  if (state && playing) {
    return (
      <main className="min-h-[calc(100vh-57px)] bg-background px-6 py-10">
        <TangoGame puzzle={state} onExit={() => setPlaying(false)} />
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-57px)] bg-background px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-5">
        <header className="flex w-full flex-col items-center gap-2 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Puzzle Generator
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Tango
          </h1>
          <p className="max-w-lg text-sm text-muted-foreground">
            {size}×{size} grid of two symbols. No three of the same symbol in a row or column,{" "}
            {size / 2} of each per row and column, and cells joined by{" "}
            <span className="font-semibold">=</span> match while{" "}
            <span className="font-semibold">×</span> must differ.
          </p>
          <div className="mt-2 flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-2">
              <label htmlFor="grid-size" className="text-sm font-medium whitespace-nowrap">
                Grid size
              </label>
              <select
                id="grid-size"
                value={size}
                onChange={(event) => {
                  cancel();
                  setSize(Number(event.target.value) as GridSize);
                  setState(null);
                  setError(null);
                }}
                className="rounded-md border border-input bg-background px-4 py-2 text-foreground"
              >
                {GRID_SIZES.map((value) => (
                  <option key={value} value={value}>
                    {value}×{value}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="digging-method" className="text-sm font-medium whitespace-nowrap">
                Digging method
              </label>
              <select
                id="digging-method"
                aria-describedby="digging-description"
                value={method}
                onChange={(event) => {
                  cancel();
                  setMethod(event.target.value as DiggingMethod);
                  setState(null);
                  setError(null);
                }}
                className="rounded-md border border-input bg-background px-4 py-2 text-foreground"
              >
                <option value="rotational-pairs">Rotational pairs</option>
                <option value="single-clue">Single clue</option>
              </select>
            </div>
            <Button onClick={run} disabled={loading}>
              {loading ? "Generating…" : state ? "Generate new puzzle" : "Generate puzzle"}
            </Button>
            {loading && (
              <Button variant="outline" onClick={cancel}>
                Cancel generation
              </Button>
            )}
          </div>
          <p id="digging-description" className="max-w-lg text-sm text-muted-foreground">
            {method === "rotational-pairs"
              ? "Removes two clues at positions related by a 180° rotation together, keeping a symmetric clue layout. Colors and relation symbols need not match."
              : "Removes one random clue at a time, without requiring a symmetric layout."}
          </p>
          <p role="status" className="text-sm text-muted-foreground">
            {loading
              ? "Generating a uniquely solvable puzzle… You can change settings or cancel anytime."
              : "Every generated puzzle has exactly one solution."}
          </p>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </header>

        {state && t && (
          <section className="flex w-full flex-col items-center gap-4">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button disabled={loading} onClick={() => setPlaying(true)}>
                Play this grid
              </Button>
              <Button variant="outline" disabled={loading} onClick={() => setWalking(true)}>
                Solution walkthrough
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Givens: <span className="font-semibold text-foreground">{t.circles}</span> /{" "}
              {state.grid.length ** 2} · Symbols:{" "}
              <span className="font-semibold text-foreground">{t.symbols}</span> · Total placements:{" "}
              <span className="font-semibold text-foreground">{t.circles + t.symbols}</span>
            </p>
            <div
              className={`grid w-full grid-cols-1 gap-12 ${state.grid.length <= 8 ? "md:grid-cols-2 md:gap-8" : ""}`}
            >
              <div className="flex flex-col items-center gap-3">
                <TangoGrid
                  ref={puzzleRef}
                  grid={state.grid}
                  givens={state.grid}
                  hRel={state.hRel}
                  vRel={state.vRel}
                  label="Puzzle"
                />
                <CopyImageButton
                  targetRef={puzzleRef}
                  filename={`tango-${state.grid.length}x${state.grid.length}-puzzle.png`}
                />
              </div>
              <div className="flex flex-col items-center gap-3">
                <TangoGrid
                  ref={solutionRef}
                  grid={state.solution}
                  givens={state.grid}
                  hRel={state.hRel}
                  vRel={state.vRel}
                  label="Solution"
                />
                <CopyImageButton
                  targetRef={solutionRef}
                  filename={`tango-${state.grid.length}x${state.grid.length}-solution.png`}
                />
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
