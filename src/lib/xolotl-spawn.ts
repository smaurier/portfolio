import type { DirectionKey } from "@/app/components/stag-scene/direction-colors";
import { isEveningStar } from "./venus";

/**
 * Le passage de Xolotl (06/09, partie pure de xolotl-companion) :
 *  - jamais au Centre, a l'Est ni au Sud (Sylvain, 04/09 : le Sud a son
 *    propre passage, le xiuhcoatl) ;
 *  - toujours au Nord (03/09 : le Mictlan est son royaume) ;
 *  - a l'Ouest (Sylvain, 06/09) : toujours quand Venus est reellement
 *    l'etoile du soir, sinon une fois sur trois (Xolotl EST Venus du soir).
 */
export const XOLOTL_WEST_PROBABILITY = 1 / 3;

export function xolotlSpawnProbability(direction: DirectionKey, date: Date = new Date()): number {
  switch (direction) {
    case "obsidienne":
      return 1;
    case "cendre":
      return isEveningStar(date) ? 1 : XOLOTL_WEST_PROBABILITY;
    default:
      return 0;
  }
}

/** Un tirage par session et par direction (sessionStorage). Une
 * probabilite nulle ou pleine ignore le cache : la regle prime sur un
 * tirage fait sous une regle precedente. */
export function decideSpawn(probability: number, cached: string | null, random: () => number = Math.random): boolean {
  if (probability <= 0) return false;
  if (probability >= 1) return true;
  if (cached !== null) return cached === "1";
  return random() < probability;
}

/** v3 (06/09) : l'Ouest passe de 0 a 1/3 ou 1, on invalide les « non » caches. */
export function xolotlSpawnKey(direction: DirectionKey): string {
  return `nahual-xolotl-spawn-v3-${direction}`;
}

/** Le tirage de la session, tel que xolotl-companion l'a ecrit (pour que
 * l'etoile du soir s'allume avec le chien). */
export function readXolotlSpawn(direction: DirectionKey): boolean {
  try {
    return sessionStorage.getItem(xolotlSpawnKey(direction)) === "1";
  } catch {
    return false;
  }
}
