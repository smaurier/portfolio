/**
 * LES CLIQUETS DU HARNAIS : les regenerer.
 *
 * Deux fichiers JSON, versionnes, lus par eslint/cliquets.mjs :
 *   scripts/lint-baseline.json   fichiers qui violaient les regles de la
 *                                boucle d'image le jour de leur arrivee,
 *                                avec leur compte ;
 *   scripts/lines-baseline.json  fichiers au-dessus de 400 lignes, geles
 *                                a leur taille.
 *
 * Un cliquet ne redescend jamais : ce script ne s'execute que pour
 * CONSTATER qu'un fichier a maigri (il sort de la liste ou son compte
 * baisse). tests/harnais/cliquets.test.ts refuse tout le reste.
 *
 * Usage : pnpm run harnais:baseline
 */
import { ESLint } from "eslint";
import { readFileSync, writeFileSync } from "node:fs";
import { relative } from "node:path";
import { REGLES_BOUCLE } from "../eslint/harnais.mjs";

const PLAFOND_LIGNES = 400;

const eslint = new ESLint({
  cwd: process.cwd(),
  // On force la regle en erreur partout pour compter sans les derogations.
  overrideConfig: [{ files: ["src/**/*.{ts,tsx}"], rules: { "no-restricted-syntax": ["error", ...REGLES_BOUCLE] } }],
});
const resultats = await eslint.lintFiles(["src/**/*.{ts,tsx}"]);

const boucle = {};
const lignes = {};
for (const r of resultats) {
  const chemin = relative(process.cwd(), r.filePath).split("\\").join("/");
  const n = r.messages.filter((m) => m.ruleId === "no-restricted-syntax").length;
  if (n > 0) boucle[chemin] = n;
  const compte = readFileSync(r.filePath, "utf8").split("\n").length;
  if (compte > PLAFOND_LIGNES) lignes[chemin] = compte;
}

const trier = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync("scripts/lint-baseline.json", JSON.stringify(trier(boucle), null, 2) + "\n");
writeFileSync("scripts/lines-baseline.json", JSON.stringify(trier(lignes), null, 2) + "\n");
console.log(`boucle : ${Object.keys(boucle).length} fichier(s) geles ; lignes : ${Object.keys(lignes).length} fichier(s) au-dessus de ${PLAFOND_LIGNES}`);
