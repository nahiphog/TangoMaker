import { spawnSync } from "node:child_process";
import { access, writeFile } from "node:fs/promises";

const build = spawnSync(process.execPath, ["node_modules/vite/bin/vite.js", "build"], {
  stdio: "inherit",
  env: { ...process.env, TANGO_PAGES: "true" },
});
if (build.status !== 0) process.exit(build.status ?? 1);

// A real HTML entry at /tango/ supports direct visits and refreshes on Pages.
await access("dist/client/tango/index.html");
await access("dist/client/techniques/index.html");
await writeFile(
  "dist/client/index.html",
  `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tango Generator</title><meta http-equiv="refresh" content="0;url=./tango/">
</head><body><a href="./tango/">Open Tango Generator</a></body></html>`,
);
await writeFile("dist/client/.nojekyll", "");
