# TangoMaker

A standalone Tango puzzle generator built with React, TypeScript, and TanStack Start.

**Live app:** https://nahiphog.github.io/TangoMaker/

- Generate 6×6, 8×8, 10×10, or 12×12 puzzles with exactly one solution.
- Choose rotational-pair digging (default) for a 180° symmetric clue layout, or single-clue digging.
- View the puzzle and complete solution side by side.
- Choose **Play this grid** to solve it interactively with locked clues, keyboard/touch input, live rule feedback, undo, reset, and progress checking. The answer is hidden during play; leaving play clears your entries.
- Open **Solving techniques** for illustrated examples, or use **Show a hint → Explain → Apply move** for an undoable deduction. Hints use only visible clues and current entries, never the stored answer. Analysis runs in a cancellable worker and is discarded when the board changes.
- Choose **Solution walkthrough** from the generator or play screen for a separate interactive replay from the original clues to completion. Each move highlights its evidence before filling its target; use Next/Previous, autoplay with speed control, Restart, or the replay slider. You can also choose the target color yourself. Play entries are preserved. Preparation streams in a cancellable worker. When the six teaching techniques stall, the replay explicitly labels a search-based elimination (internal backtracking branches are not shown), rather than silently reading the stored answer.
- Copy either grid as an image.
- Switch between light and dark themes.
- Generate in a background Web Worker, with cancellation and safe grid-size switching.

Each row and column contains equal numbers of orange and blue symbols (half the grid size each), with no three identical consecutive symbols. Cells joined by `=` match; cells joined by `×` differ. The generator removes clues only when its backtracking solver confirms that exactly one solution remains. In rotational-pair mode, both symmetric clues are removed before testing and both are restored if uniqueness is lost. Symmetry applies to clue positions, not their colors or relation values. For 10×10 and 12×12, difficult uniqueness checks are conservatively rejected and digging has an eight-second budget. These puzzles may retain extra clues; incomplete searches are never accepted as proof of uniqueness. All generation runs in a cancellable Web Worker.

Hints cover avoiding triples, filling gaps, completing color quotas, following relations and relation chains, and eliminating whole-line patterns. They assume the player's current entries are correct, report detected contradictions first, and explicitly stop when these techniques find no move. Line-pattern analysis enumerates valid rows and columns without full-board backtracking; it does not guarantee that every generated puzzle can be completed with these techniques alone.

## Run locally

Use Node.js 22.12 or newer (tested with Node.js 24) and npm.

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Open http://127.0.0.1:5173/tango. The home page also redirects to Tango.

On Windows, run `./Start-Tango.ps1` in PowerShell. It installs dependencies if needed and starts the server. Stop it with Ctrl+C.

## Checks

```sh
npx tsc --noEmit
npm test
npm run build
```

The tests use Node.js 24 and independently solve 50 reproducible puzzles per method at 6×6 and 8×8, plus five per method at 10×10 and 12×12, checking uniqueness and agreement with the generated answer.

## GitHub Pages

Pushes to `main` run the type check, uniqueness tests, and static build before deploying through GitHub Actions. Pages must use **GitHub Actions** as its publishing source.

```sh
npm run build:pages
```

This prerenders the Tango page into `dist/client/tango/index.html`, generates a root redirect, and builds assets and the background worker for `/TangoMaker/`. Only `dist/client` is published; no server runtime is required.

## Project structure

- `src/lib/tango.ts`: solution generation, clue removal, and uniqueness checking.
- `src/lib/tango.worker.ts`: background generation and error reporting.
- `src/lib/tango-hints.ts` and `tango-hints.worker.ts`: answer-independent deductions and background analysis.
- `src/components/TangoHints.tsx`: progressive hints and the illustrated technique library.
- `src/routes/tango.tsx`: size selection, worker lifecycle, and generator page.
- `src/components/TangoGrid.tsx`: puzzle and solution rendering.
- `src/components/CopyImageButton.tsx`: image export.

Adapted from the owner's `nahiphog/puzzle-making-factory` project, originally created with Lovable. This repository contains only Tango; it is not configured with the original project's Lovable connection.
