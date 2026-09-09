/**
 * LE VERROU DE SEUIL (09/09) : declencher UNE FOIS quand un signal franchit
 * un seuil en montant, et ne se rearmer qu'apres etre vraiment redescendu.
 *
 * Ecrit d'abord pour la cloche du climax, il s'est avere etre le meme besoin
 * que l'atterrissage des Cihuateteo : leur descente est un fondu continu
 * (`descentBlend`), et un geste d'impact demande une DATE, pas une rampe.
 * Plutot que d'en avoir deux copies, la regle vit ici avec sa preuve.
 *
 * Trois pieges, tous appris a l'usage et tous testes :
 *  - declencher deux fois s'entend et se voit ;
 *  - declencher a l'ouverture, parce qu'on arrive deja au-dela du seuil
 *    (lien profond, position de scroll restauree), est un coup sorti de
 *    nulle part : le verrou part donc DESARME dans ce cas ;
 *  - se rearmer au moindre recul rend le geste insupportable autour du
 *    seuil, d'ou l'hysteresis : il faut redescendre franchement.
 */

export type LatchSpec = {
  /** Valeur a franchir, en montant, pour declencher. */
  fireAt: number;
  /** Il faut redescendre sous cette valeur pour reservir. */
  rearmAt: number;
};

export type LatchState = {
  /** Pret a declencher : le seuil n'a pas ete franchi depuis le bas. */
  readonly armed: boolean;
};

function check(spec: LatchSpec): void {
  if (!(spec.rearmAt < spec.fireAt)) {
    throw new Error(
      `threshold-latch : rearmAt (${spec.rearmAt}) doit etre STRICTEMENT sous fireAt (${spec.fireAt}), sinon le verrou vibre.`,
    );
  }
}

/**
 * Etat de depart, decide par la valeur d'arrivee : au-dela du seuil, on part
 * desarme et il faudra redescendre.
 */
export function armLatch(valueAtArrival: number, spec: LatchSpec): LatchState {
  check(spec);
  const v = Number.isFinite(valueAtArrival) ? valueAtArrival : 0;
  return { armed: v < spec.fireAt };
}

export function stepLatch(
  state: LatchState,
  value: number,
  spec: LatchSpec,
): { state: LatchState; fire: boolean } {
  if (!Number.isFinite(value)) return { state, fire: false };
  if (state.armed && value >= spec.fireAt) return { state: { armed: false }, fire: true };
  if (!state.armed && value <= spec.rearmAt) return { state: { armed: true }, fire: false };
  return { state, fire: false };
}
