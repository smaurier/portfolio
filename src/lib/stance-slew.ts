/**
 * BORNER LA VITESSE DE L'ASSIETTE (09/09).
 *
 * Retour de Sylvain sur Xolotl : « ce qui n'allait pas c'etait surtout
 * comment il entrait et sortait du bassin ». En exposant l'assiette
 * calculee par image, la mesure a donne la cause exacte, au franchissement
 * de la margelle de 34 cm :
 *
 *   tangage  33,5 -> 34,3 -> 4,4 -> -18,0 -> -30,9 degres
 *   roulis   19,8 ->  8,8 -> 18,8 ->  20,0 ->  20,1 degres
 *
 * Le tangage bute a MAX_PITCH (34,4 deg), change de SIGNE -- l'avant est
 * sur la pierre, puis dans l'eau pendant que l'arriere y est encore -- et
 * saute de 29,9 degres en 200 ms. Le roulis, lui, reste colle a son
 * maximum tout du long : la marche d'un quadrupede est diagonale, donc au
 * bord d'une marche une patte avant est sur la pierre quand l'autre est
 * encore en dessous, et le plan d'appui ajuste sur les quatre coussinets
 * traduit cet ecart en vrille du corps.
 *
 * Le lissage exponentiel qui existait deja (12 par seconde) ne pouvait
 * rien : il converge a 91 % en 200 ms, donc il SUIT fidelement une cible
 * qui s'inverse. Ce qu'il fallait est une borne sur la VITESSE et non sur
 * l'ecart. Aucune articulation d'animal ne tourne a 150 degres par seconde
 * en marchant ; un vrai chien qui descend une bordure stabilise son tronc.
 *
 * Pur, donc testable sans scene ni navigateur.
 */

/**
 * Vitesse maximale d'assiette, en radians par seconde. 70 deg/s : une
 * inversion complete de la margelle (de +34 a -34) prend alors un peu
 * moins d'une seconde, ce qui est le temps qu'un corps met a basculer.
 */
export const STANCE_SLEW = (70 * Math.PI) / 180;

/**
 * Rapproche `courant` de `cible` sans depasser `maxParSeconde`. Ne
 * franchit jamais la cible : un depassement ferait osciller le corps.
 */
export function slewLimit(courant: number, cible: number, dt: number, maxParSeconde: number): number {
  if (!Number.isFinite(courant)) return Number.isFinite(cible) ? cible : 0;
  if (!Number.isFinite(cible) || !Number.isFinite(dt) || dt <= 0) return courant;
  const pas = Math.abs(maxParSeconde) * dt;
  const ecart = cible - courant;
  if (Math.abs(ecart) <= pas) return cible;
  return courant + Math.sign(ecart) * pas;
}
