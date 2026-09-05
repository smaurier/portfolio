import { CENTZON_COUNT } from "@/lib/centzon-stars";

/**
 * Etat partage des 400 etoiles (05/09, le geste du mythe). Les colibris
 * (huitzilin-birds) CHASSENT : chaque fleche vise une etoile vivante et
 * l'eteint a l'arrivee ; ils ecrivent ici l'instant de la mise a mort, le
 * champ d'etoiles (centzon-stars) la lit et fait tomber l'etoile a ce
 * moment-la, quel que soit le scroll. Mutations 60 fps, hors React.
 */
export const centzonStore = {
  /** Par etoile : instant (secondes d'horloge de scene) de sa mise a mort
   * par un colibri, ou -1 si aucun colibri ne l'a prise. */
  killedAt: new Float64Array(CENTZON_COUNT).fill(-1),
  /** Remis a -1 partout quand on arrive au Sud (nouvelle nuit). */
  reset(): void {
    this.killedAt.fill(-1);
  },
};
