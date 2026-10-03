/**
 * LA BARRE EN MODE ACQUISITION.
 *
 *   pnpm run perf:baseline  [-- args playwright]   PERF_ACQUERIR=1, un jugement :
 *       chaque moment nouveau ou meilleur que son meilleur connu s'inscrit
 *       dans scripts/perf-baseline.json ; un recul ne s'inscrit jamais et
 *       reste rouge.
 *   pnpm run perf:enveloppe [-- args playwright]   PERF_ACQUERIR=enveloppe, K jugements :
 *       chaque jugement elargit l'enveloppe (meilleur, maximum, et le
 *       plafond = maximum + ecart) de chaque moment ; c'est l'acte du point
 *       zero et de chaque changement voulu, a dire dans le message du commit
 *       qui porte le JSON (03/10, voir tests/perf/aides/cliquet.ts). Pour
 *       repartir de zero sur un moment, supprimer sa ligne du JSON avant.
 *
 * Les autres arguments passent a Playwright (`-- --grep voile`). Chaque
 * jugement reconstruit la production (le serveur refuse de reutiliser un
 * serveur qui traine) : cinq jugements, c'est cinq builds (~6 min).
 */
import { spawnSync } from "node:child_process";

/** Cinq : trois laissaient 4 jugements sur 9 hors de l'enveloppe le 03/10. */
const JUGEMENTS_ENVELOPPE = 5;
const args = process.argv.slice(2);
const enveloppe = args[0] === "enveloppe";
const reste = enveloppe ? args.slice(1) : args;
const K = enveloppe ? JUGEMENTS_ENVELOPPE : 1;

for (let i = 1; i <= K; i++) {
  // Les arguments sont imprimes : le 03/10, `--grep defilement` a laisse tourner le voile sans qu'on sache pourquoi (`--list` filtre bien).
  if (enveloppe) console.log(`\n=== enveloppe : jugement ${i} sur ${K} (playwright ${reste.join(" ") || "sans argument"})`);
  const r = spawnSync("pnpm", ["exec", "playwright", "test", "-c", "playwright.perf.config.ts", ...reste], {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, PERF_ACQUERIR: enveloppe ? "enveloppe" : "1" },
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
