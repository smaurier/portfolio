import { defineConfig, devices } from "@playwright/test";

/**
 * LA BARRE DE PERFORMANCE (harnais, pilier 1, tranche B).
 *
 * Une seconde suite, courte, sur la PRODUCTION : on ne melange pas mesurer
 * et verifier (la suite de 24 minutes reste sur le serveur de dev). Elle
 * reconstruit le site a chaque passe (21 s) et REFUSE un serveur qui
 * trainerait sur :3100 : ce serait la mesure d'un autre code.
 *
 * `pnpm run perf` ; obligatoire avant toute poussee sur `main` (hook
 * pre-push). `pnpm run perf:baseline` acquiert les progres.
 *
 * Le `dpr` de mesure vient de PERF_DPR (1 par defaut) et s'ecrit dans la
 * ligne de base : comparer deux dpr n'a pas de sens.
 */
const DPR = Number(process.env.PERF_DPR ?? "1");
const BUREAU = { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 }, deviceScaleFactor: DPR };

export default defineConfig({
  testDir: "./tests/perf",
  testMatch: /.*\.perf\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 600_000,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3100",
    // ANGLE sur d3d11, comme la suite e2e : sans ces drapeaux, Chromium
    // sous Windows rend en logiciel.
    launchOptions: { args: ["--use-angle=d3d11", "--use-gl=angle", "--ignore-gpu-blocklist"] },
  },
  projects: [
    { name: "auto-test", testMatch: /auto-test\.perf\.ts/, use: BUREAU },
    { name: "perf-bureau", dependencies: ["auto-test"], testIgnore: /auto-test\.perf\.ts/, use: BUREAU },
  ],
  webServer: {
    command: "pnpm run build && pnpm exec next start -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 300_000,
  },
});
