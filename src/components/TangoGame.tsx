import { useEffect, useRef, useState } from "react";
import type { Cell, Grid, TangoPuzzle } from "@/lib/tango";
import { checkProgress, checkRules, placeCell } from "@/lib/tango-play";
import { TangoGrid } from "./TangoGrid";
import { Button } from "./ui/button";
import { TangoHints, TangoTechniques } from "./TangoHints";
import type { Position } from "@/lib/tango-hints";

export function TangoGame({ puzzle, onExit }: { puzzle: TangoPuzzle; onExit: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  const [history, setHistory] = useState<Grid[]>([puzzle.grid.map((row) => [...row])]);
  const [checked, setChecked] = useState(false);
  const [highlight, setHighlight] = useState<{ board: Grid; cells: Position[] } | null>(null);
  const board = history[history.length - 1];
  const rules = checkRules(board, puzzle);
  const progress = checkProgress(board, puzzle.solution);
  const size = board.length;
  const change = (r: number, c: number, value: Cell) => {
    setHighlight(null);
    setHistory((previous) => {
      const current = previous[previous.length - 1];
      const next = placeCell(current, puzzle.grid, r, c, value);
      return next === current ? previous : [...previous, next];
    });
    setChecked(false);
  };
  const status = progress.solved
    ? "Puzzle solved! Every cell is correct."
    : checked
      ? progress.mistakes.size
        ? `${progress.mistakes.size} incorrect cell${progress.mistakes.size === 1 ? "" : "s"} marked. Try again.`
        : `All filled cells are correct. ${progress.empty} cells left.`
      : `${size * size - progress.empty} of ${size * size} cells filled.`;

  return (
    <section
      className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5"
      aria-label="Play Tango"
    >
      <h1 className="text-3xl font-semibold" tabIndex={-1} ref={headingRef}>
        Play {size}×{size} Tango
      </h1>
      <p id="play-instructions" className="max-w-xl text-center text-sm text-muted-foreground">
        Click or tap to cycle blank → orange → blue → blank. Original clues are locked. Use Tab or
        arrow keys to move, Enter or Space to cycle, 1 for orange, 2 for blue, and Delete or
        Backspace to clear. Red outlines indicate conflicts.
      </p>
      <p className="text-center text-sm text-muted-foreground">
        Place {size / 2} of each color in every row and column, with no three consecutive matches.
        Follow the = and × clues.
      </p>
      <TangoGrid
        grid={board}
        givens={puzzle.grid}
        hRel={puzzle.hRel}
        vRel={puzzle.vRel}
        label="Your puzzle"
        onCellChange={change}
        conflicts={new Set([...rules.conflicts, ...(checked ? progress.mistakes : [])])}
        highlights={
          new Set(highlight?.board === board ? highlight.cells.map((cell) => cell.join(",")) : [])
        }
      />
      <p
        role="status"
        className={`text-center font-medium ${progress.solved ? "text-green-600 dark:text-green-400" : ""}`}
      >
        {status}
      </p>
      {rules.messages.length > 0 && (
        <ul className="text-sm text-destructive" aria-label="Rule conflicts">
          {rules.messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={() => setChecked(true)}>Check progress</Button>
        <Button
          variant="outline"
          disabled={history.length === 1}
          onClick={() => {
            setHistory((previous) => previous.slice(0, -1));
            setChecked(false);
            setHighlight(null);
          }}
        >
          Undo
        </Button>
        <Button
          variant="outline"
          disabled={history.length === 1}
          onClick={() => {
            setHistory([puzzle.grid.map((row) => [...row])]);
            setChecked(false);
            setHighlight(null);
          }}
        >
          Reset puzzle
        </Button>
        <Button variant="secondary" onClick={onExit}>
          Back to generator
        </Button>
      </div>
      <TangoHints
        key={JSON.stringify(board)}
        input={{ board, hRel: puzzle.hRel, vRel: puzzle.vRel }}
        onHighlight={(cells) => setHighlight({ board, cells })}
        onApply={change}
      />
      <TangoTechniques size={size} />
      <p className="text-xs text-muted-foreground">
        Leaving play mode clears your entries. The generator shows the solution.
      </p>
    </section>
  );
}
