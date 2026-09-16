import type { DirectionKey } from "./direction-colors";
import { dayAtArc, lightPAtArc } from "@/lib/arc-day";

/**
 * L'ARC DU MONDE, LU UNE FOIS PAR IMAGE (16/09).
 *
 * `RevealLighting` fait traverser l'arc d'une direction a l'autre pendant
 * un passage cardinal (lib/arc-fondu) et depose ici le resultat, comme
 * `refletStore` le fait pour la face du monde. Les autres machineries le
 * lisent au lieu de recalculer `lightPAtArc(direction, ...)` de leur cote.
 *
 * POURQUOI UN DEPOT ET PAS TROIS CALCULS. Mesure du 16/09, passage Sud
 * vers Ouest : apres avoir fait traverser la lumiere, il restait une
 * marche de 17,8 sur 50,1 exactement au commit de la route, alors que le
 * nombre d'objets visibles ne bougeait pas et que la somme des intensites
 * lumineuses BAISSAIT. Ce n'etait donc ni un montage ni le rig : c'etait
 * le plancher de revelation au curseur, qui relisait l'arc brut pour son
 * compte et sautait tout seul. Trois lecteurs, trois verites : une seule
 * suffit.
 *
 * LE RETARD D'UNE IMAGE assume : r3f appelle les `useFrame` dans l'ordre
 * de montage, donc un lecteur monte avant `RevealLighting` lit la valeur
 * de l'image precedente. A soixante images par seconde c'est seize
 * millisecondes sur une courbe continue, invisible, et c'est le meme
 * marche que `refletStore` passe depuis le 13/09.
 *
 * `pret` reste faux tant que personne n'a ecrit : un lecteur monte sans
 * `RevealLighting` retombe sur le calcul direct plutot que sur un zero.
 */
export const arcStore = {
  /** Le progres des courbes de lumiere, fondu pendant un passage. */
  p: 0,
  /** La hauteur du soleil, fondue de meme. */
  jour: 0,
  pret: false,
};

export function poserArc(p: number, jour: number): void {
  arcStore.p = p;
  arcStore.jour = jour;
  arcStore.pret = true;
}

/** Le progres de lumiere, fondu s'il a ete pose, direct sinon. */
export function lireArcP(direction: DirectionKey, progress: number): number {
  return arcStore.pret ? arcStore.p : lightPAtArc(direction, progress);
}

/** La hauteur du soleil, fondue si elle a ete posee, directe sinon. */
export function lireArcJour(direction: DirectionKey, progress: number): number {
  return arcStore.pret ? arcStore.jour : dayAtArc(direction, progress);
}
