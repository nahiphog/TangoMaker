import { forwardRef } from "react";
import {
  EMPTY,
  ORANGE,
  EQUAL,
  NONE,
  type Cell,
  type Grid,
  type HRel,
  type VRel,
} from "@/lib/tango";

interface Props {
  grid: Grid;
  givens: Grid; // puzzle grid: non-empty means the cell is a given
  hRel: HRel;
  vRel: VRel;
  label: string;
  onCellChange?: (r: number, c: number, value: Cell) => void;
  conflicts?: Set<string>;
  highlights?: Set<string>;
  activeCell?: string;
  describeCells?: boolean;
}

const COLORS = {
  orange: { fill: "#E07E2B", stroke: "#AD5511" },
  blue: { fill: "#3A7DCE", stroke: "#23508C" },
};

export const TangoGrid = forwardRef<HTMLDivElement, Props>(function TangoGrid(
  {
    grid,
    givens,
    hRel,
    vRel,
    label,
    onCellChange,
    conflicts,
    highlights,
    activeCell,
    describeCells,
  },
  ref,
) {
  const N = grid.length;
  return (
    <figure className="flex w-full flex-col items-center gap-3">
      <div
        ref={ref}
        className="relative w-full border-2 border-foreground bg-background p-1"
        style={{ maxWidth: N * 48 + 12 }}
      >
        <div
          className="relative grid"
          style={{ gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))` }}
        >
          {grid.map((row, r) =>
            row.map((val, c) => {
              const isGiven = givens[r][c] !== EMPTY;
              const color = val === ORANGE ? COLORS.orange : COLORS.blue;
              const CellElement = onCellChange ? "button" : "div";
              const invalid = conflicts?.has(`${r},${c}`) ?? false;
              const highlighted = highlights?.has(`${r},${c}`) ?? false;
              return (
                <CellElement
                  key={`${r}-${c}`}
                  type={onCellChange ? "button" : undefined}
                  disabled={onCellChange ? isGiven : undefined}
                  data-row={r}
                  data-col={c}
                  role={describeCells ? "img" : undefined}
                  style={
                    activeCell === `${r},${c}`
                      ? { outline: "3px dashed currentColor", outlineOffset: "-5px" }
                      : undefined
                  }
                  aria-label={
                    onCellChange || describeCells
                      ? `Row ${r + 1}, column ${c + 1}: ${val === 0 ? "blank" : val === 1 ? "orange" : "blue"}${isGiven ? ", given" : ""}${invalid ? ", conflict" : ""}${highlighted ? ", hint" : ""}`
                      : undefined
                  }
                  aria-invalid={onCellChange && invalid ? true : undefined}
                  aria-describedby={onCellChange ? "play-instructions" : undefined}
                  onClick={
                    onCellChange ? () => onCellChange(r, c, ((val + 1) % 3) as Cell) : undefined
                  }
                  onKeyDown={
                    onCellChange
                      ? (event) => {
                          const value =
                            event.key === "1"
                              ? 1
                              : event.key === "2"
                                ? 2
                                : ["0", "Delete", "Backspace"].includes(event.key)
                                  ? 0
                                  : null;
                          if (value !== null) {
                            event.preventDefault();
                            onCellChange(r, c, value);
                          }
                          const directions: Record<string, number[]> = {
                            ArrowLeft: [0, -1],
                            ArrowRight: [0, 1],
                            ArrowUp: [-1, 0],
                            ArrowDown: [1, 0],
                          };
                          const direction = directions[event.key];
                          if (direction) {
                            event.preventDefault();
                            let rr = r + direction[0],
                              cc = c + direction[1];
                            while (rr >= 0 && rr < N && cc >= 0 && cc < N) {
                              const target =
                                event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(
                                  `button[data-row="${rr}"][data-col="${cc}"]`,
                                );
                              if (target && !target.disabled) {
                                target.focus();
                                break;
                              }
                              rr += direction[0];
                              cc += direction[1];
                            }
                          }
                        }
                      : undefined
                  }
                  className={`flex aspect-square w-full items-center justify-center ${onCellChange ? "focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-primary disabled:cursor-default" : ""} ${invalid ? "bg-destructive/10 ring-2 ring-inset ring-destructive" : highlighted ? "bg-primary/10 ring-2 ring-inset ring-primary" : ""} ${
                    c === N - 1 ? "" : "border-r border-r-border"
                  } ${r === N - 1 ? "" : "border-b border-b-border"}`}
                >
                  {val !== EMPTY && (
                    <div
                      className="h-[56%] w-[56%] rounded-full"
                      style={{
                        backgroundColor: color.fill,
                        border: `${isGiven ? 2.5 : 1.5}px ${isGiven ? "solid" : "dashed"} ${color.stroke}`,
                        opacity: isGiven || onCellChange || describeCells ? 1 : 0.45,
                      }}
                    />
                  )}
                </CellElement>
              );
            }),
          )}

          {/* relation symbols */}
          <div className="pointer-events-none absolute inset-0">
            {hRel.map((row, r) =>
              row.map((rel, c) =>
                rel === NONE ? null : (
                  <span
                    key={`h-${r}-${c}`}
                    className="absolute z-10 -translate-x-1/2 -translate-y-1/2 text-xs font-bold leading-none text-foreground"
                    style={{
                      left: `${((c + 1) / N) * 100}%`,
                      top: `${((r + 0.5) / N) * 100}%`,
                    }}
                  >
                    <span className="rounded bg-background px-1 py-0.5">
                      {rel === EQUAL ? "=" : "×"}
                    </span>
                  </span>
                ),
              ),
            )}
            {vRel.map((row, r) =>
              row.map((rel, c) =>
                rel === NONE ? null : (
                  <span
                    key={`v-${r}-${c}`}
                    className="absolute z-10 -translate-x-1/2 -translate-y-1/2 text-xs font-bold leading-none text-foreground"
                    style={{
                      left: `${((c + 0.5) / N) * 100}%`,
                      top: `${((r + 1) / N) * 100}%`,
                    }}
                  >
                    <span className="rounded bg-background px-1 py-0.5">
                      {rel === EQUAL ? "=" : "×"}
                    </span>
                  </span>
                ),
              ),
            )}
          </div>
        </div>
      </div>
      <figcaption className="text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </figcaption>
    </figure>
  );
});
