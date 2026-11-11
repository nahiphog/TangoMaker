import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { exportPuzzle, MAX_PUZZLE_FILE_BYTES } from "@/lib/tango-files";
import { createShareLink, readSharedGrid } from "@/lib/tango-share";

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
  const [importing, setImporting] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [gridString, setGridString] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const importRequest = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [walking, setWalking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const puzzleRef = useRef<HTMLDivElement>(null);
  const solutionRef = useRef<HTMLDivElement>(null);

  useEffect(
    () => () => {
      importRequest.current++;
      workerRef.current?.terminate();
      workerRef.current = null;
    },
    [],
  );

  const cancel = useCallback(() => {
    importRequest.current++;
    workerRef.current?.terminate();
    workerRef.current = null;
    setLoading(false);
    setImporting(false);
  }, []);

  const loadFile = useCallback(
    async (file: File | string) => {
      cancel();
      setError(null);
      if ((typeof file === "string" ? file.length : file.size) > MAX_PUZZLE_FILE_BYTES) {
        setError("Puzzle files must be smaller than 64 KB.");
        return;
      }
      const request = importRequest.current;
      setLoading(true);
      setImporting(true);
      try {
        const text = typeof file === "string" ? file : await file.text();
        if (request !== importRequest.current) return;
        const worker = new Worker(new URL("../lib/tango-import.worker.ts", import.meta.url), {
          type: "module",
        });
        workerRef.current = worker;
        worker.onmessage = (event: MessageEvent<GenerationResult>) => {
          if (workerRef.current !== worker || request !== importRequest.current) return;
          if (event.data.ok) {
            setState(event.data.puzzle);
            setSize(event.data.puzzle.grid.length as GridSize);
            setGridString(exportPuzzle(event.data.puzzle));
            setCopyStatus("Grid imported successfully.");
            setShareLink("");
            setShareStatus("");
            window.history.replaceState(
              window.history.state,
              "",
              createShareLink(window.location.href, event.data.puzzle),
            );
          } else setError(event.data.error);
          cancel();
        };
        worker.onerror = worker.onmessageerror = () => {
          if (workerRef.current !== worker) return;
          setError("Could not validate this puzzle file. Please try again.");
          cancel();
        };
        worker.postMessage(text);
      } catch {
        if (request !== importRequest.current) return;
        setError("Could not read the puzzle file or start validation.");
        cancel();
      }
    },
    [cancel],
  );

  useEffect(() => {
    const loadFromLink = () => {
      try {
        const grid = readSharedGrid(window.location.hash);
        if (grid !== null) {
          setPlaying(false);
          void loadFile(grid);
        }
      } catch (error) {
        cancel();
        setError(error instanceof Error ? error.message : "Invalid share link.");
      }
    };
    loadFromLink();
    window.addEventListener("hashchange", loadFromLink);
    return () => window.removeEventListener("hashchange", loadFromLink);
  }, [loadFile, cancel]);

  const copyShareLink = async () => {
    if (!state) return;
    const link = createShareLink(window.location.href, state);
    setShareLink(link);
    try {
      await navigator.clipboard.writeText(link);
      setShareStatus("Share link copied.");
    } catch {
      setShareStatus("Select and copy the link below.");
    }
  };

  const saveFile = () => {
    if (!state) return;
    const url = URL.createObjectURL(new Blob([exportPuzzle(state)], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `tango-${state.grid.length}x${state.grid.length}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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
        if (event.data.ok) {
          setState(event.data.puzzle);
          setShareLink("");
          setShareStatus("");
          window.history.replaceState(
            window.history.state,
            "",
            createShareLink(window.location.href, event.data.puzzle),
          );
        } else setError(event.data.error);
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
                  setShareLink("");
                  window.history.replaceState(window.history.state, "", window.location.pathname);
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
                  setShareLink("");
                  window.history.replaceState(window.history.state, "", window.location.pathname);
                  setError(null);
                }}
                className="rounded-md border border-input bg-background px-4 py-2 text-foreground"
              >
                <option value="rotational-pairs">Rotational pairs</option>
                <option value="single-clue">Single clue</option>
              </select>
            </div>
            <Button onClick={run} disabled={loading}>
              {loading && !importing
                ? "Generating…"
                : state
                  ? "Generate new puzzle"
                  : "Generate puzzle"}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.json,text/plain,application/json"
              className="hidden"
              aria-label="Import puzzle file"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void loadFile(file);
              }}
            />
            <Button
              variant="outline"
              disabled={loading}
              onClick={() => {
                setShowTransfer(true);
                setCopyStatus("");
              }}
            >
              Import grid
            </Button>
            {state && (
              <Button
                variant="outline"
                disabled={loading}
                onClick={() => {
                  setGridString(exportPuzzle(state));
                  setShowTransfer(true);
                  setCopyStatus("");
                }}
              >
                Export grid
              </Button>
            )}
            {loading && (
              <Button variant="outline" onClick={cancel}>
                {importing ? "Cancel import" : "Cancel generation"}
              </Button>
            )}
            {state && (
              <Button variant="outline" disabled={loading} onClick={copyShareLink}>
                Copy share link
              </Button>
            )}
          </div>
          {state && shareLink && (
            <div className="w-full max-w-2xl text-left">
              <label htmlFor="share-link" className="text-sm font-medium">
                Share link
              </label>
              <input
                id="share-link"
                readOnly
                value={shareLink}
                onFocus={(event) => event.currentTarget.select()}
                className="w-full rounded border bg-background p-2 text-xs"
              />
              <p role="status" className="text-xs">
                {shareStatus}
              </p>
            </div>
          )}
          {showTransfer && (
            <section
              className="w-full max-w-2xl space-y-2 rounded-lg border p-3 text-left"
              aria-label="Import and export grid"
            >
              <label htmlFor="grid-string" className="text-sm font-medium">
                Grid string
              </label>
              <textarea
                id="grid-string"
                className="w-full rounded border bg-background p-2 font-mono text-xs break-all"
                rows={4}
                spellCheck={false}
                value={gridString}
                maxLength={MAX_PUZZLE_FILE_BYTES}
                onChange={(event) => {
                  setGridString(event.target.value);
                  setCopyStatus("");
                }}
              />
              <p className="text-xs text-muted-foreground">
                Order: horizontal borders, vertical borders, then cells — each row from left to
                right, top to bottom. Borders: 0 none, 1 =, 2 ×. Cells: 0 empty, 1 orange, 2 blue.
                No separators; size is detected from length.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={loading || !gridString.trim()}
                  onClick={() => void loadFile(gridString)}
                >
                  Import string
                </Button>
                <Button
                  variant="outline"
                  disabled={!gridString.trim()}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(gridString.trim());
                      setCopyStatus("String copied.");
                    } catch {
                      setCopyStatus("Select the string above and copy it manually.");
                    }
                  }}
                >
                  Copy string
                </Button>
                <Button
                  variant="outline"
                  disabled={loading}
                  onClick={() => fileRef.current?.click()}
                >
                  Choose file
                </Button>
                {state && (
                  <Button variant="outline" disabled={loading} onClick={saveFile}>
                    Download current grid
                  </Button>
                )}
                <Button variant="ghost" onClick={() => setShowTransfer(false)}>
                  Close
                </Button>
              </div>
              <p role="status" className="text-xs">
                {copyStatus}
              </p>
            </section>
          )}
          <p id="digging-description" className="max-w-lg text-sm text-muted-foreground">
            {method === "rotational-pairs"
              ? "Removes two clues at positions related by a 180° rotation together, keeping a symmetric clue layout. Colors and relation symbols need not match."
              : "Removes one random clue at a time, without requiring a symmetric layout."}
          </p>
          <p role="status" className="text-sm text-muted-foreground">
            {importing
              ? "Checking imported clues and verifying a unique solution…"
              : loading
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
              <Button
                variant="outline"
                disabled={loading}
                aria-expanded={walking}
                onClick={() => setWalking((current) => !current)}
              >
                {walking ? "Hide walkthrough" : "Solution walkthrough"}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Givens: <span className="font-semibold text-foreground">{t.circles}</span> /{" "}
              {state.grid.length ** 2} · Symbols:{" "}
              <span className="font-semibold text-foreground">{t.symbols}</span> · Total placements:{" "}
              <span className="font-semibold text-foreground">{t.circles + t.symbols}</span>
            </p>
            {walking ? (
              <TangoWalkthrough
                key={exportPuzzle(state)}
                puzzle={state}
                onExit={() => setWalking(false)}
              />
            ) : (
              <div
                className={`grid w-full grid-cols-1 items-start gap-12 ${state.grid.length <= 8 ? "md:grid-cols-2 md:gap-8" : ""}`}
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
            )}
          </section>
        )}
      </div>
    </main>
  );
}
