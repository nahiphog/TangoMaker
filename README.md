# TangoMaker

A standalone Tango puzzle generator built with React, TypeScript, and TanStack Start.

**Live app:** https://nahiphog.github.io/TangoMaker/

- Generate 6×6, 8×8, 10×10, or 12×12 puzzles with exactly one solution.
- Choose rotational-pair digging (default) for a 180° symmetric clue layout, or single-clue digging.
- View the puzzle and complete solution side by side.
- Choose **Play this grid** to solve it interactively with locked clues, keyboard/touch input, live rule feedback, undo, reset, and progress checking. The answer is hidden during play; leaving play clears your entries.
- Use **Export grid** to copy a single grid string or download it as `.txt`. Use **Import grid** to paste a string or choose a file (legacy JSON is also accepted). Original clues are preserved, not play progress or a stored answer; uniqueness is verified in a cancellable worker.
- Copy either grid as an image.
- Light mode is the default; an explicitly saved light/dark preference is respected.
- Generate in a background Web Worker, with cancellation and safe grid-size switching.

Each row and column contains equal numbers of orange and blue symbols (half the grid size each), with no three identical consecutive symbols. Cells joined by `=` match; cells joined by `×` differ. The generator removes clues only when its backtracking solver confirms that exactly one solution remains. In rotational-pair mode, both symmetric clues are removed before testing and both are restored if uniqueness is lost. Symmetry applies to clue positions, not their colors or relation values. For 10×10 and 12×12, difficult uniqueness checks are conservatively rejected and digging has an eight-second budget. These puzzles may retain extra clues; incomplete searches are never accepted as proof of uniqueness. All generation runs in a cancellable Web Worker.


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
- `src/routes/tango.tsx`: size selection, worker lifecycle, and generator page.
- `src/components/TangoGrid.tsx`: puzzle and solution rendering.
- `src/components/CopyImageButton.tsx`: image export.

Adapted from the owner's `nahiphog/puzzle-making-factory` project, originally created with Lovable. This repository contains only Tango; it is not configured with the original project's Lovable connection.

## Puzzle files

The compact format is a single string of digits: horizontal border relations, then vertical border relations, then cells. Each matrix is flattened row by row, left to right and top to bottom. Borders use 0 (none), 1 (=), 2 (×); cells use 0 (blank), 1 (orange), 2 (blue). There are no separators or size prefix. The length determines the size: 96 digits for 6×6, 176 for 8×8, 280 for 10×10, and 408 for 12×12. Leading/trailing whitespace is ignored.

Legacy TangoMaker version 1 JSON files remain importable. Input is limited to 64 KB. Uniqueness and solution reconstruction have a 15-second search budget and a node cap; incomplete searches are rejected rather than assumed unique.
`Copy share link` creates a URL ending in `#grid=<grid string>`. Opening it automatically validates and loads the exact clues in a background worker, including the grid size. Only the clues are shared, not the solution or play progress. Invalid or non-unique puzzles are rejected. The URL also tracks the current generated or imported puzzle so refreshing preserves it.
