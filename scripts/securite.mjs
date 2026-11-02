/**
 * LE GESTE DE SECURITE (02/11/2026).
 *
 * Pourquoi ce script existe : le 02/11, une poussee de routine a fait
 * remonter 36 avis Dependabot, dont 13 sur les dependances de PRODUCTION
 * et 3 critiques -- une RCE dans `next/og` (que ce site utilise cinq fois)
 * et une RCE non authentifiee dans l'optimisation d'images. Elles etaient
 * la depuis des semaines. Rien ne les regardait : c'est ca le defaut, pas
 * la faille elle-meme.
 *
 * Ce que le script fait : il lance `pnpm audit --prod` et compare le
 * resultat a `securite-admis.json`, la liste des avis explicitement juges
 * inapplicables, chacun avec la raison et la facon dont elle a ete
 * verifiee. Tout avis INCONNU de cette liste fait echouer le script.
 *
 * Pourquoi ce n'est PAS un test du lot unitaire : il lui faut le reseau, il
 * est lent, et il deviendrait rouge a la publication d'un avis en amont --
 * donc a un moment qui n'a rien a voir avec le changement en cours, et il
 * bloquerait une poussee pour une raison que personne n'a causee. Le geste
 * est donc explicite et documente (docs/harnais.md) : AVANT une poussee sur
 * `main`.
 *
 *   pnpm run securite
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ici = dirname(fileURLToPath(import.meta.url));
const admis = JSON.parse(readFileSync(join(ici, "securite-admis.json"), "utf8")).admis;

const r = spawnSync("pnpm", ["audit", "--prod", "--json"], { encoding: "utf8", shell: true });
// `pnpm audit` sort en code non nul des qu'il trouve quelque chose : ce
// n'est pas une erreur d'execution, c'est son resultat. On ne juge donc que
// sur la sortie.
if (!r.stdout) {
  console.error("securite : pnpm audit n'a rien rendu sur stdout.");
  console.error(r.stderr || "(pas de stderr)");
  process.exit(1);
}

let avis;
try {
  avis = JSON.parse(r.stdout).advisories ?? {};
} catch (e) {
  console.error(`securite : sortie de pnpm audit illisible (${e.message}).`);
  process.exit(1);
}

const cle = (a) => (a.url ?? "").replace("https://github.com/advisories/", "") || String(a.id ?? "");
const trouves = Object.values(avis);
const inconnus = trouves.filter((a) => !admis[cle(a)]);
const connus = trouves.filter((a) => admis[cle(a)]);

console.log(`securite : ${trouves.length} avis sur les dependances de production.`);

for (const a of connus) {
  console.log(`  admis   ${cle(a)}  ${a.severity.padEnd(8)} ${(a.title ?? "").slice(0, 60)}`);
}

// Un admis dont la raison n'est plus vraie est pire qu'un inconnu : il dort.
// On reimprime donc le « revoir si » a chaque passage, pour qu'il soit relu.
for (const a of connus) {
  const e = admis[cle(a)];
  if (e.revoir_si) console.log(`          ^ a rouvrir si : ${e.revoir_si}`);
}

if (inconnus.length === 0) {
  console.log("securite : aucun avis inconnu. OK.");
  process.exit(0);
}

console.error(`\nsecurite : ${inconnus.length} avis NON juge(s) :`);
for (const a of inconnus) {
  console.error(`  ${a.severity.toUpperCase().padEnd(9)} ${cle(a)}  ${(a.title ?? "").slice(0, 70)}`);
  console.error(`            corrige par : ${a.patched_versions ?? "?"}  (paquet ${a.module_name})`);
}
console.error("\nChaque avis se traite, il ne se range pas : prendre la version corrigee,");
console.error("ou l'inscrire dans scripts/securite-admis.json avec la raison VERIFIEE de son");
console.error("inapplicabilite et ce qui devrait la rouvrir.");
process.exit(1);
