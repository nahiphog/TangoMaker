import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { generateTango, tallies, type TangoPuzzle } from "@/lib/tango";
import { TangoGrid } from "@/components/TangoGrid";
import { CopyImageButton } from "@/components/CopyImageButton";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/tango")({
  head: () => ({
    meta: [
      { title: "Tango Generator" },
      {
        name: "description",
        content:
          "Generate a 6×6 Tango puzzle with = and × constraints and a guaranteed unique solution.",
      },
      { property: "og:title", content: "Tango Generator" },
      {
        property: "og:description",
        content:
          "Generate a 6×6 Tango puzzle with = and × constraints and a guaranteed unique solution.",
      },
    ],
  }),
  component: TangoPage,
});

function TangoPage() {
  const [state, setState] = useState<TangoPuzzle | null>(null);
  const [loading, setLoading] = useState(false);
  const puzzleRef = useRef<HTMLDivElement>(null);
  const solutionRef = useRef<HTMLDivElement>(null);

  const run = () => {
    setLoading(true);
    setTimeout(() => {
      setState(generateTango());
      setLoading(false);
    }, 10);
  };

  const t = state ? tallies(state) : null;

  return (
    <main className="min-h-[calc(100vh-57px)] bg-background px-6 py-16">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-10">
        <header className="flex flex-col items-center gap-3 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Puzzle Generator
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Tango
          </h1>
          <p className="max-w-lg text-sm text-muted-foreground">
            6×6 grid of two symbols. No three of the same symbol in a row or column, three of each
            per row and column, and cells joined by <span className="font-semibold">=</span> match
            while <span className="font-semibold">×</span> must differ.
          </p>
          <Button size="lg" onClick={run} disabled={loading} className="mt-2">
            {loading ? "Generating…" : state ? "Generate new puzzle" : "Generate puzzle"}
          </Button>
        </header>

        {state && t && (
          <section className="flex w-full flex-col items-center gap-6">
            <p className="text-sm text-muted-foreground">
              Givens: <span className="font-semibold text-foreground">{t.circles}</span> / 36 ·
              Symbols: <span className="font-semibold text-foreground">{t.symbols}</span> · Total
              placements:{" "}
              <span className="font-semibold text-foreground">{t.circles + t.symbols}</span>
            </p>
            <div className="grid w-full grid-cols-1 gap-12 md:grid-cols-2 md:gap-8">
              <div className="flex flex-col items-center gap-3">
                <TangoGrid
                  ref={puzzleRef}
                  grid={state.grid}
                  givens={state.grid}
                  hRel={state.hRel}
                  vRel={state.vRel}
                  label="Puzzle"
                />
                <CopyImageButton targetRef={puzzleRef} filename="tango-puzzle.png" />
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
                <CopyImageButton targetRef={solutionRef} filename="tango-solution.png" />
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
