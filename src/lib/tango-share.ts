import { GRID_SIZES, type TangoPuzzle } from "./tango.ts";
import { exportPuzzle } from "./tango-files.ts";

export function createShareLink(pageUrl: string, puzzle: TangoPuzzle): string {
  const url = new URL(pageUrl);
  url.search = "";
  url.hash = `grid=${exportPuzzle(puzzle)}`;
  return url.href;
}

export function readSharedGrid(hash: string): string | null {
  const fragment = hash.replace(/^#/, "");
  if (!fragment.startsWith("grid=")) return null;
  const grid = fragment.slice(5);
  if (!/^[012]+$/.test(grid) || !GRID_SIZES.some((n) => grid.length === 3 * n * n - 2 * n)) {
    throw new Error("This share link contains an invalid grid string.");
  }
  return grid;
}
