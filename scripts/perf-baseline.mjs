/**
 * LA BARRE EN MODE ACQUISITION : `pnpm run perf:baseline`.
 *
 * Lance la barre avec PERF_ACQUERIR=1 : chaque moment nouveau ou meilleur
 * que son meilleur connu s'inscrit dans scripts/perf-baseline.json. Un
 * recul ne s'inscrit jamais, et reste rouge. Les autres arguments passent
 * a Playwright (`pnpm run perf:baseline -- --grep voile`).
 */
import { spawnSync } from "node:child_process";

const r = spawnSync("pnpm", ["exec", "playwright", "test", "-c", "playwright.perf.config.ts", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, PERF_ACQUERIR: "1" },
});
process.exit(r.status ?? 1);
