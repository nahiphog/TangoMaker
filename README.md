# TangoMaker

A standalone Tango puzzle generator built with React, TypeScript, and TanStack Start.

**Live app:** https://nahiphog.github.io/TangoMaker/

- Generate 6×6 or 8×8 puzzles with exactly one solution.
- Choose rotational-pair digging (default) for a 180° symmetric clue layout, or single-clue digging.
- View the puzzle and complete solution side by side.
- Copy either grid as an image.
- Switch between light and dark themes.
- Generate in a background Web Worker, with cancellation and safe grid-size switching.

Each row and column contains equal numbers of orange and blue symbols (three each for 6×6, four each for 8×8), with no three identical consecutive symbols. Cells joined by `=` match; cells joined by `×` differ. The generator removes clues only when its backtracking solver confirms that exactly one solution remains. In rotational-pair mode, both symmetric clues are removed before testing and both are restored if uniqueness is lost. Symmetry applies to clue positions, not their colors or relation values.

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

The tests use Node.js 24 and independently solve 50 reproducible puzzles for each combination of size and digging method, checking uniqueness and agreement with the generated answer.

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
