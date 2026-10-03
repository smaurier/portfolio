/**
 * LA LIGNE DE BASE DE LA BARRE : `scripts/perf-baseline.json`, versionne.
 *
 *   { "<projet>": { "dpr": 1, "moments": { "<moment>": Ligne } } }
 *
 * Le `dpr` de mesure est ecrit : comparer deux dpr n'a pas de sens. Tri
 * deterministe, independant de la locale du poste (comme les autres
 * cliquets du depot). Seule E/S du cliquet.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Ligne } from "./cliquet";

export type Projet = { dpr: number; moments: Record<string, Ligne> };
export type LigneDeBase = Record<string, Projet>;

export const CHEMIN_LIGNE_DE_BASE = join(process.cwd(), "scripts", "perf-baseline.json");

/** Absente, la ligne de base est vide ; illisible (elle s'edite a la main), l'erreur nomme le fichier. */
export function lireLigneDeBase(chemin = CHEMIN_LIGNE_DE_BASE): LigneDeBase {
  if (!existsSync(chemin)) return {};
  try {
    return JSON.parse(readFileSync(chemin, "utf8")) as LigneDeBase;
  } catch (e) {
    throw new Error(`${chemin} ne se lit pas : ${e instanceof Error ? e.message : String(e)}`);
  }
}

const trier = <T>(o: Record<string, T>): Record<string, T> =>
  Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));

export function ecrireLigneDeBase(base: LigneDeBase, chemin = CHEMIN_LIGNE_DE_BASE): void {
  const propre: LigneDeBase = {};
  for (const [projet, p] of Object.entries(trier(base))) propre[projet] = { dpr: p.dpr, moments: trier(p.moments) };
  writeFileSync(chemin, JSON.stringify(propre, null, 2) + "\n");
}
