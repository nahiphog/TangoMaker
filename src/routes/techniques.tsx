import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Technique } from "@/lib/tango-hints";

export const Route = createFileRoute("/techniques")({
  head: () => ({
    meta: [
      { title: "Tango solving techniques" },
      {
        name: "description",
        content:
          "Learn all six logical techniques used by TangoMaker, with interactive examples and an explanation of its search fallback.",
      },
    ],
  }),
  component: TechniquesPage,
});

const techniques: {
  name: Technique;
  rule: string;
  before: number[];
  relations?: number[];
  target: number;
  value: number;
  reason: string;
}[] = [
  {
    name: "Avoid three consecutive colors",
    rule: "Two adjacent cells of the same color force the next cell on either side to be the other color.",
    before: [1, 1, 0],
    target: 2,
    value: 2,
    reason: "The third cell must be blue: orange would create three consecutive orange cells.",
  },
  {
    name: "Fill the gap",
    rule: "When two cells of the same color have one empty cell between them, fill that gap with the opposite color.",
    before: [2, 0, 2],
    target: 1,
    value: 1,
    reason: "The middle cell must be orange to prevent three consecutive blue cells.",
  },
  {
    name: "Complete the balance",
    rule: "Each row and column contains equal numbers of orange and blue cells. Once one color reaches its quota, all remaining cells take the other color.",
    before: [0, 2, 1, 2, 1, 2],
    target: 0,
    value: 1,
    reason:
      "This six-cell row already has three blue cells. The empty cell must be orange. The quotas are 3, 4, 5, and 6 per color on 6×6, 8×8, 10×10, and 12×12 grids.",
  },
  {
    name: "Follow a relation",
    rule: "An = joins cells of the same color. A × joins cells of opposite colors. A known cell determines its neighbor.",
    before: [1, 0],
    relations: [1],
    target: 1,
    value: 1,
    reason:
      "The = requires the empty cell to match its orange neighbor. With × instead, it would be blue.",
  },
  {
    name: "Follow a relation chain",
    rule: "Trace connected relations from a known cell. Every = keeps the color; every × flips it. Chains may turn between rows and columns.",
    before: [1, 0, 0],
    relations: [2, 1],
    target: 2,
    value: 2,
    reason:
      "Start with orange, flip across × to blue, then keep blue across =. The endpoint must be blue. An even number of × signs preserves the starting color; an odd number reverses it. Only the endpoint is filled in this step.",
  },
  {
    name: "Eliminate line patterns",
    rule: "Consider every arrangement of a row or column consistent with its clues, relations, balance, and no-three rule. If all remaining arrangements agree on an empty cell, its color is forced.",
    before: [0, 0, 0, 0, 2, 0],
    relations: [2, 0, 2, 0, 0],
    target: 5,
    value: 1,
    reason:
      "The first two cells must differ, as must cells three and four. Each pair contributes one of each color. Cell five is blue, so cell six must be orange. Four valid full-row arrangements remain, and all agree on that final orange cell. The engine enumerates one line, not the whole puzzle.",
  },
];

function TechniqueCard({
  technique,
  index,
}: {
  technique: (typeof techniques)[number];
  index: number;
}) {
  const [shown, setShown] = useState(false);
  return (
    <article
      id={`technique-${index + 1}`}
      className="scroll-mt-24 space-y-4 rounded-xl border bg-card p-5"
    >
      <h2 className="text-xl font-semibold">
        {index + 1}. {technique.name}
      </h2>
      <p className="text-sm leading-relaxed text-muted-foreground">{technique.rule}</p>
      <div
        className="flex items-center justify-center gap-0.5 py-3 sm:gap-1"
        aria-label="Example cells, left to right"
      >
        {technique.before.map((original, i) => {
          const value = shown && i === technique.target ? technique.value : original;
          return (
            <div key={i} className="flex items-center gap-0.5 sm:gap-1">
              <span
                role="img"
                aria-label={`Cell ${i + 1}: ${value === 1 ? "orange" : value === 2 ? "blue" : "empty"}${shown && i === technique.target ? ", newly filled" : ""}`}
                className={`flex h-7 w-7 items-center justify-center rounded border sm:h-9 sm:w-9 ${shown && i === technique.target ? "outline outline-2 outline-offset-2 outline-primary" : ""}`}
              >
                {value ? (
                  <span
                    className={`h-5 w-5 rounded-full ${value === 1 ? "bg-[#E07E2B]" : "bg-[#3A7DCE]"}`}
                  />
                ) : (
                  <span aria-hidden="true" className="text-muted-foreground">
                    ·
                  </span>
                )}
              </span>
              {i < technique.before.length - 1 && (
                <span
                  className="w-2 text-center font-semibold sm:w-3"
                  aria-label={
                    technique.relations?.[i] === 1
                      ? "equals"
                      : technique.relations?.[i] === 2
                        ? "differs"
                        : "no relation"
                  }
                >
                  {technique.relations?.[i] === 1 ? "=" : technique.relations?.[i] === 2 ? "×" : ""}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <Button
        variant="outline"
        aria-expanded={shown}
        aria-controls={`explanation-${index}`}
        onClick={() => setShown((current) => !current)}
      >
        {shown ? "Reset example" : "Show deduction"}
      </Button>
      <div id={`explanation-${index}`} aria-live="polite">
        {shown && <p className="text-sm leading-relaxed">{technique.reason}</p>}
      </div>
    </article>
  );
}

function TechniquesPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Learn Tango</p>
        <h1 className="text-3xl font-semibold sm:text-4xl">Solving techniques</h1>
        <p className="max-w-3xl text-muted-foreground">
          These are all six logical techniques currently used by TangoMaker’s walkthrough, followed
          by its computer-search fallback. Try each example to see one cell filled and the reason
          behind it.
        </p>
        <p className="text-sm text-muted-foreground">
          Examples show row segments, except balance and line patterns, which show complete six-cell
          rows. The same rules work vertically, with either color, and on every supported grid size.
          Dots are empty cells; an outline marks the newly filled cell.
        </p>
      </header>
      <nav aria-label="Technique index" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {techniques.map((technique, index) => (
          <a
            key={technique.name}
            href={`#technique-${index + 1}`}
            className="underline underline-offset-4"
          >
            {technique.name}
          </a>
        ))}
        <a href="#search" className="underline underline-offset-4">
          Search-based elimination
        </a>
      </nav>
      <div className="grid gap-5 md:grid-cols-2">
        {techniques.map((technique, index) => (
          <TechniqueCard key={technique.name} technique={technique} index={index} />
        ))}
      </div>
      <section id="search" className="scroll-mt-24 space-y-3 rounded-xl border p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Computer-search fallback
        </p>
        <h2 className="text-xl font-semibold">Search-based elimination</h2>
        <p className="text-sm leading-relaxed">
          When the six logical techniques find no move, the walkthrough tries each color in an empty
          cell and checks for a valid completion using backtracking. If one color has no possible
          completion and the other has one, the latter is forced.
        </p>
        <p className="text-sm leading-relaxed">
          For example: assuming orange leads to no valid complete board, while blue admits a
          completion. The cell must be blue. This is an exhaustive computer-search proof; the
          walkthrough labels it explicitly and does not display its internal search branches. It
          does not consult the stored solution.
        </p>
        <p className="text-sm text-muted-foreground">
          A stalled logical solver does not imply multiple solutions. Conversely, if both colors
          admit a completion, the walkthrough rejects the puzzle as non-unique instead of choosing a
          color.
        </p>
      </section>
    </main>
  );
}
