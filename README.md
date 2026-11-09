# TangoMaker

A standalone Tango puzzle generator built with React, TypeScript, and TanStack Start.

- Generate 6×6 puzzles with exactly one solution.
- View the puzzle and complete solution side by side.
- Copy either grid as an image.
- Switch between light and dark themes.

Each row and column contains three orange and three blue symbols, with no three identical consecutive symbols. Cells joined by `=` match; cells joined by `×` differ. The generator removes clues only when its backtracking solver confirms that exactly one solution remains.

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
npm run build
```

## Project structure

- `src/lib/tango.ts`: solution generation, clue removal, and uniqueness checking.
- `src/routes/tango.tsx`: generator page.
- `src/components/TangoGrid.tsx`: puzzle and solution rendering.
- `src/components/CopyImageButton.tsx`: image export.

Adapted from the owner's `nahiphog/puzzle-making-factory` project, originally created with Lovable. This repository contains only Tango; it is not configured with the original project's Lovable connection.
