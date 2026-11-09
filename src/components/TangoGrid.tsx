import { forwardRef } from "react";
import { EMPTY, ORANGE, EQUAL, NONE, type Grid, type HRel, type VRel } from "@/lib/tango";

interface Props {
  grid: Grid;
  givens: Grid; // puzzle grid: non-empty means the cell is a given
  hRel: HRel;
  vRel: VRel;
  label: string;
}

const COLORS = {
  orange: { fill: "#E07E2B", stroke: "#AD5511" },
  blue: { fill: "#3A7DCE", stroke: "#23508C" },
};

export const TangoGrid = forwardRef<HTMLDivElement, Props>(function TangoGrid(
  { grid, givens, hRel, vRel, label },
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
              return (
                <div
                  key={`${r}-${c}`}
                  className={`flex aspect-square w-full items-center justify-center ${
                    c === N - 1 ? "" : "border-r border-r-border"
                  } ${r === N - 1 ? "" : "border-b border-b-border"}`}
                >
                  {val !== EMPTY && (
                    <div
                      className="h-[56%] w-[56%] rounded-full"
                      style={{
                        backgroundColor: color.fill,
                        border: `${isGiven ? 2.5 : 1.5}px ${isGiven ? "solid" : "dashed"} ${color.stroke}`,
                        opacity: isGiven ? 1 : 0.45,
                      }}
                    />
                  )}
                </div>
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
