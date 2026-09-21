/**
 * LES CLIQUETS, COTE ESLINT : lire les lignes de base.
 *
 * Deux JSON versionnes sous scripts/, generes par scripts/harnais-baseline.mjs
 * et gardes par tests/harnais/cliquets.test.ts. Ce module ne fait que les
 * lire, pour que eslint/harnais.mjs reste une liste de lois sans E/S.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ICI = dirname(fileURLToPath(import.meta.url));
const lire = (nom) => JSON.parse(readFileSync(join(ICI, "..", "scripts", nom), "utf8"));

/** Les fichiers du premier jour, geles a leur compte de violations de la boucle. */
export const cliquetBoucle = lire("lint-baseline.json");
/** Les fichiers au-dessus du plafond de lignes, geles a leur taille. */
export const cliquetLignes = lire("lines-baseline.json");
