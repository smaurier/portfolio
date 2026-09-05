/**
 * Le regard du cerf vers le soleil (05/09, echo de scroll du Sud). Au
 * climax de midi, le cerf leve la tete vers le zenith. Sylvain : « tu
 * dois bloquer les articulations du cou du cerf sinon on aura quelque
 * chose de deforme » : meme doctrine que les pattes de Xolotl
 * (two-bone-ik, DOG_LEG_LIMITS). Le cabre demande est REPARTI sur la
 * chaine Neck1 -> Neck2 -> Neck3 -> Head au prorata des butees de chaque
 * articulation, et chacune s'arrete a sa butee : on ne tord jamais un os
 * au-dela de ce qu'un cou de cerf fait.
 *
 * Butees (radians) : un cerf qui regarde le ciel cabre l'encolure d'une
 * quinzaine de degres par vertebre cervicale basse, plus vers la tete.
 * Total ~64 deg : assez pour viser haut, pas pour se casser la nuque.
 */

export type JointLimit = { name: string; maxPitch: number };

const DEG = Math.PI / 180;

export const STAG_NECK_LIMITS: readonly JointLimit[] = [
  { name: "Neck1", maxPitch: 12 * DEG },
  { name: "Neck2", maxPitch: 14 * DEG },
  { name: "Neck3", maxPitch: 16 * DEG },
  { name: "Head", maxPitch: 22 * DEG },
];

export function totalLimit(limits: readonly JointLimit[]): number {
  return limits.reduce((a, j) => a + j.maxPitch, 0);
}

/** Repartit un cabre total (rad, positif = vers le haut) sur la chaine :
 * proportionnel aux butees, puis chaque articulation borne a la sienne.
 * Le resultat somme au cabre demande tant qu'il est atteignable. */
export function distributePitch(pitch: number, limits: readonly JointLimit[]): number[] {
  const total = totalLimit(limits);
  if (total <= 0) return limits.map(() => 0);
  const sign = pitch < 0 ? -1 : 1;
  const wanted = Math.min(Math.abs(pitch), total);
  return limits.map((j) => sign * Math.min(j.maxPitch, (wanted * j.maxPitch) / total));
}
