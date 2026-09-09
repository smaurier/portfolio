/**
 * LA CLOCHE DU CLIMAX (08/09). Les accords cardinaux existent depuis le
 * 28/08 (`CHIME_FREQ` dans sound-design.tsx) mais ne sonnent qu'au CLIC sur
 * un lien cardinal. C'est de l'habillage : le son ne raconte rien du
 * parcours. L'ecart releve face aux laureats Awwwards est justement la
 * (cf docs/da/etat-de-l-art.md, septieme constante : le son comme couche
 * narrative). En faisant sonner l'accord de la direction au moment ou l'arc
 * atteint son climax, la meme brique repond au SCROLL, sur les cinq pages,
 * sans une seule dependance nouvelle.
 *
 * Tout le risque etant dans le declenchement, il est isole ici, pur et
 * teste, avant d'etre branche sur Web Audio :
 *  - une cloche qui sonne deux fois est un bug qu'on entend ;
 *  - une cloche qui sonne a l'ouverture de la page, parce qu'on arrive
 *    deja au-dela du seuil (lien profond, position restauree), est un coup
 *    sorti de nulle part ;
 *  - une cloche qui re-sonne a chaque hesitation de la molette autour du
 *    climax est insupportable, d'ou l'hysteresis.
 */

import { armLatch, stepLatch, type LatchState } from "./threshold-latch";

export const CLIMAX_CHIME = {
  /** L'emphase de nav a laquelle l'accord sonne, en montant. */
  fireAt: 0.45,
  /** Il faut etre redescendu sous cette valeur pour reservir. */
  rearmAt: 0.1,
} as const;

export type ChimeState = LatchState;

/**
 * Etat de depart, decide par la position d'arrivee : si l'on arrive deja
 * au-dela du seuil, la cloche part DESARMEE et il faudra redescendre.
 *
 * Le mecanisme lui-meme vit dans `lib/threshold-latch` depuis le 09/09 :
 * l'atterrissage des Cihuateteo avait exactement le meme besoin, et deux
 * copies d'une regle a hysteresis, c'est deux fois l'occasion de se tromper.
 */
export function armChime(emphasisAtArrival: number): ChimeState {
  return armLatch(emphasisAtArrival, CLIMAX_CHIME);
}

export function stepChime(state: ChimeState, emphasis: number): { state: ChimeState; fire: boolean } {
  return stepLatch(state, emphasis, CLIMAX_CHIME);
}
