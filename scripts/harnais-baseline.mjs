/**
 * LES CLIQUETS DU HARNAIS : les regenerer.
 *
 * Deux fichiers JSON, versionnes, lus par eslint/cliquets.mjs :
 *   scripts/lint-baseline.json   fichiers qui violaient les regles de la
 *                                boucle d'image le jour de leur arrivee,
 *                                avec leur compte ;
 *   scripts/lines-baseline.json  fichiers au-dessus de PLAFOND_LIGNES,
 *                                geles a leur taille.
 *
 * C'est un CLIQUET, pas un plafond : chaque progres s'acquiert. Un fichier
 * qui a maigri fait tomber tests/harnais/cliquets.test.ts jusqu'a ce qu'on
 * relance ce script, qui inscrit le nouveau meilleur connu ; un fichier qui
 * a grossi fait tomber le meme test, et rien ne l'en sort. Un fichier a
 * zero (ou sous le plafond) sort de la liste.
 *
 * Usage : pnpm run harnais:baseline
 */
import { ESLint } from "eslint";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CONFIG_BOUCLE, PLAFOND_LIGNES, compterBoucle } from "../eslint/harnais.mjs";
import { RACINE, cheminPosix } from "../eslint/cliquets.mjs";
import { compterLignes } from "./compter-lignes.mjs";

const eslint = new ESLint({
  cwd: RACINE,
  // Force la regle en erreur partout : on compte sans les derogations.
  overrideConfig: [CONFIG_BOUCLE],
});
const resultats = await eslint.lintFiles(CONFIG_BOUCLE.files);

const boucle = {};
const lignes = {};
for (const r of resultats) {
  const chemin = cheminPosix(r.filePath);
  const n = compterBoucle(r);
  if (n > 0) boucle[chemin] = n;
  const compte = compterLignes(readFileSync(r.filePath, "utf8"));
  if (compte > PLAFOND_LIGNES) lignes[chemin] = compte;
}

// Tri deterministe, independant de la locale du poste (Sylvain travaille
// sur plusieurs machines : un localeCompare() ferait bouger le JSON).
const trier = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
writeFileSync(join(RACINE, "scripts", "lint-baseline.json"), JSON.stringify(trier(boucle), null, 2) + "\n");
writeFileSync(join(RACINE, "scripts", "lines-baseline.json"), JSON.stringify(trier(lignes), null, 2) + "\n");
console.log(`boucle : ${Object.keys(boucle).length} fichier(s) geles ; lignes : ${Object.keys(lignes).length} fichier(s) au-dessus de ${PLAFOND_LIGNES}`);
