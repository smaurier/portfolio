/**
 * LES CLIQUETS, COTE ESLINT : lire les lignes de base.
 *
 * Deux JSON versionnes sous scripts/, generes par scripts/harnais-baseline.mjs
 * et gardes par tests/harnais/cliquets.test.ts. Ce module ne fait que les
 * lire, pour que eslint/harnais.mjs reste une liste de lois sans E/S.
 */
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ICI = dirname(fileURLToPath(import.meta.url));

/** La racine du depot, pour que les chemins des cliquets soient toujours lus depuis elle. */
export const RACINE = join(ICI, "..");

/** @returns {Record<string, number>} */
const lire = (nom) => JSON.parse(readFileSync(join(RACINE, "scripts", nom), "utf8"));

/** Les fichiers du premier jour, geles a leur compte de violations de la boucle. @type {Record<string, number>} */
export const cliquetBoucle = lire("lint-baseline.json");
/** Les fichiers au-dessus du plafond de lignes, geles a leur taille. @type {Record<string, number>} */
export const cliquetLignes = lire("lines-baseline.json");

/** Un chemin de fichier en cle posix relative a la racine (les JSON, les tests). */
export const cheminPosix = (absolu) => relative(RACINE, absolu).split("\\").join("/");

/**
 * Un chemin de fichier transforme en motif `files` sur pour minimatch :
 * `[locale]` y serait une classe de caracteres et la derogation ne
 * s'appliquerait pas (relecture du 22/09 ; deux chemins de lines-baseline
 * sont dans ce cas). On echappe les metacaracteres.
 */
export const motifFichier = (chemin) => chemin.replace(/[[\]{}()*?!+@]/g, (c) => "\\" + c);
