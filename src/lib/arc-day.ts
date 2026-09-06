import type { DirectionKey } from "@/app/components/stag-scene/direction-colors";
import { getRevealFloor } from "./reveal-arc";
import { remapWestArc } from "./ouest-arc";
import { eastDay } from "./est-arc";

/**
 * Le « jour » d'une page (06/09) : la hauteur du soleil, 0 la nuit .. 1 le
 * zenith, telle que la lisent le ciel, les astres, la lumiere et la camera
 * solaire. Partout c'est le plancher de revelation (l'arc monte avec le
 * scroll) ; a l'Ouest c'est l'arc inverse de Cihuatlampa (lib ouest-arc :
 * le soleil tombe). Une seule fonction pour que personne ne recalcule.
 */
export function dayAtArc(direction: DirectionKey, progress: number): number {
  if (direction === "cendre") return remapWestArc(progress).day;
  if (direction === "dore") return eastDay(progress); // l'Est (06/09) : le ciel ne s'eclaire qu'avec le soleil qui fait eclater le gel
  return getRevealFloor(progress);
}

/** Le soleil de la page est-il a l'ouest ? Toujours a l'Ouest (Cihuatlampa),
 * sinon seulement l'apres-midi de la contemplation (heure de Tenochtitlan). */
export function sunInTheWest(direction: DirectionKey, cinematicAfternoon: boolean): boolean {
  return direction === "cendre" || cinematicAfternoon;
}
