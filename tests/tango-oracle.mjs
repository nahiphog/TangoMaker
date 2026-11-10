// Independent oracle: enumerate valid complete line patterns, then enforce
// row/column agreement and branch on whole lines. No generator validators used.
export function solveIndependently(puzzle) {
  const n = puzzle.grid.length;
  const bit = (mask, c) => 1 + ((mask >> c) & 1);
  const patterns = Array.from({ length: 2 ** n }, (_, mask) => mask).filter((mask) => {
    const row = Array.from({ length: n }, (_, c) => bit(mask, c));
    return (
      row.filter((v) => v === 1).length === n / 2 &&
      !row.some((v, c) => c < n - 2 && v === row[c + 1] && v === row[c + 2])
    );
  });
  const rows = puzzle.grid.map((givens, r) =>
    patterns.filter(
      (mask) =>
        givens.every((v, c) => !v || bit(mask, c) === v) &&
        puzzle.hRel[r].every(
          (rel, c) => !rel || (bit(mask, c) === bit(mask, c + 1)) === (rel === 1),
        ),
    ),
  );
  const cols = Array.from({ length: n }, (_, c) =>
    patterns.filter(
      (mask) =>
        puzzle.grid.every((row, r) => !row[c] || bit(mask, r) === row[c]) &&
        puzzle.vRel.every(
          (row, r) => !row[c] || (bit(mask, r) === bit(mask, r + 1)) === (row[c] === 1),
        ),
    ),
  );
  const solutions = [];
  function visit(domains) {
    let changed = true;
    while (changed) {
      changed = false;
      if (domains.some((d) => d.length === 0)) return;
      for (let r = 0; r < n; r++)
        for (let c = 0; c < n; c++) {
          const support = (domain, pos) =>
            domain.reduce((mask, v) => mask | (1 << ((v >> pos) & 1)), 0);
          const allowed = support(domains[r], c) & support(domains[n + c], r);
          if (!allowed) return;
          const rr = domains[r].filter((mask) => allowed & (1 << ((mask >> c) & 1)));
          const cc = domains[n + c].filter((mask) => allowed & (1 << ((mask >> r) & 1)));
          if (rr.length !== domains[r].length || cc.length !== domains[n + c].length)
            changed = true;
          domains[r] = rr;
          domains[n + c] = cc;
        }
    }
    let choice = -1;
    for (let i = 0; i < domains.length; i++)
      if (domains[i].length > 1 && (choice < 0 || domains[i].length < domains[choice].length))
        choice = i;
    if (choice < 0) {
      solutions.push(
        domains.slice(0, n).map((d) => Array.from({ length: n }, (_, c) => bit(d[0], c))),
      );
      return;
    }
    for (const mask of domains[choice]) {
      const next = domains.map((d) => [...d]);
      next[choice] = [mask];
      visit(next);
      if (solutions.length >= 2) return;
    }
  }
  visit([...rows, ...cols]);
  return solutions;
}
