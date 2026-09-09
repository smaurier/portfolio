/**
 * L'HORLOGE DES GESTES (09/09). Une enveloppe narrative ne doit jamais
 * pouvoir etre enjambee par une saccade.
 *
 * Nee sur la frappe du xiuhcoatl, ou la mesure a ete sans appel : au moment
 * du declenchement, l'anneau s'embrase et son shader se compile, et
 * l'horloge de la scene a saute de **3,9 s en une seule image**. La frappe
 * etait pilotee par `elapsedTime - debut`, une difference de temps reel non
 * bornee : son enveloppe de 3,1 s a ete consommee d'un coup. Impact pose
 * immediatement, feu au pic de 0,03 sur 1, raidissement jamais vu. Le geste
 * le plus spectaculaire du site n'existait pas, et personne ne pouvait le
 * savoir en lisant le code.
 *
 * **L'instant du declenchement est precisement celui ou la saccade est la
 * plus probable**, puisque c'est la que les nouveaux shaders se compilent.
 * D'ou cette regle, et non un rustine locale.
 *
 * Consequence assumee : sur une machine qui saccade, le geste joue plus
 * LENTEMENT que le temps reel au lieu de disparaitre. Un ralenti se
 * regarde ; une image sautee ne se voit pas.
 *
 * Le depot avait deja la moitie de l'idee ailleurs, pour d'autres raisons :
 * le vol errant du serpent borne son pas contre les quaternions NaN
 * (`Math.max(1e-3, Math.min(delta, 1 / 30))`), et la sequence de gel avance
 * par pas de 1/20 s. Ce module leur donne un nom commun.
 */

/**
 * Pas maximum par defaut. Choisi plus petit que la plus courte fenetre des
 * sequences du projet (la montee du feu de la frappe, `fireUp` = 0,05 s) :
 * en dessous, aucun temps fort ne peut etre saute.
 */
export const ENVELOPE_MAX_STEP = 1 / 30;

/**
 * Avance une horloge de geste d'une image, en bornant le pas.
 *
 * @param since horloge courante, en secondes depuis le debut du geste
 * @param delta le `delta` de l'image, tel que le donne useFrame
 * @param maxStep pas maximum ; par defaut `ENVELOPE_MAX_STEP`
 */
export function advanceEnvelope(since: number, delta: number, maxStep = ENVELOPE_MAX_STEP): number {
  if (!Number.isFinite(since)) return 0;
  // NaN veut dire « on ne sait pas de combien » : geler est la seule reponse
  // honnete. L'infini, lui, est une saccade comme une autre, en pire, et
  // doit donc avancer d'exactement un pas comme les 3,9 s mesurees.
  if (Number.isNaN(delta)) return since;
  if (delta <= 0) return since;
  return since + Math.min(delta, maxStep);
}
