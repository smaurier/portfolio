/**
 * LA LIGNE DE BASE DE LA BARRE : `scripts/perf-baseline.json`, versionne.
 *
 *   { "<projet>": { "<machine>": Projet } }
 *
 * Chaque projet porte une entree PAR MACHINE (01/11, cf machine.ts) : la
 * cle `MACHINE_PARTAGEE` est l'historique d'avant ce changement, gardee en
 * repli de lecture pour un poste qui n'a pas encore la sienne. Le `dpr` de
 * mesure est ecrit dans chaque entree : comparer deux dpr n'a pas de sens.
 * Tri deterministe (projet, puis machine), independant de la locale du
 * poste (comme les autres cliquets du depot). Seule E/S du cliquet.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Ligne } from "./cliquet";
import { MACHINE_PARTAGEE } from "./machine";

export type Projet = { dpr: number; moments: Record<string, Ligne> };
export type LigneDeBase = Record<string, Record<string, Projet>>;

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
  for (const [projet, parMachine] of Object.entries(trier(base))) {
    const parMachineTriee: Record<string, Projet> = {};
    for (const [machine, p] of Object.entries(trier(parMachine))) parMachineTriee[machine] = { dpr: p.dpr, moments: trier(p.moments) };
    propre[projet] = parMachineTriee;
  }
  writeFileSync(chemin, JSON.stringify(propre, null, 2) + "\n");
}

/** L'entree d'un projet pour UNE machine : la sienne si elle existe, sinon
 * le repli partage (retrocompatibilite, cf MACHINE_PARTAGEE). */
export function entreeMachine(base: LigneDeBase, projet: string, machine: string): Projet | undefined {
  const parMachine = base[projet];
  if (!parMachine) return undefined;
  return parMachine[machine] ?? parMachine[MACHINE_PARTAGEE];
}

/** Ecrit l'entree d'UNE machine pour un projet, sans toucher aux autres
 * machines deja presentes sur ce meme projet (ni au repli partage). */
export function ecrireEntreeMachine(base: LigneDeBase, projet: string, entree: Projet, machine: string): LigneDeBase {
  return { ...base, [projet]: { ...(base[projet] ?? {}), [machine]: entree } };
}
