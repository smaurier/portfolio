/**
 * Xolotl et la margelle du bassin (03/09, retour Sylvain "l'entree et la
 * sortie sont catastrophiques, le chien traverse toute la margelle, il n'y
 * a pas d'impact physique"). Il ne traverse plus la pierre : il
 * l'ENJAMBE (petit arc au-dessus du dessus de la margelle), et l'eau
 * reagit quand il y entre et quand il en sort (eclaboussure).
 *
 * Pur et testable, le composant ne fait que lire.
 */

export type RimSpec = {
  /** Rayon interieur de la pierre (bord de l'eau). */
  inner: number;
  /** Rayon exterieur de la pierre. */
  outer: number;
  /** Hauteur monde du dessus de la margelle. */
  top: number;
  /** Distance avant/apres la pierre ou le saut commence et finit. */
  reach: number;
  /** Hauteur du saut au-dessus du dessus de la pierre. */
  hop: number;
};

/** Hauteur minimale des pattes a la distance `radius` du centre, connaissant
 * la hauteur du sol `groundY` : hors de la bande, le sol ; dans la bande,
 * un arc qui passe au-dessus de la pierre, raccorde en douceur au sol. */
export function rimHop(radius: number, groundY: number, rim: RimSpec): number {
  const start = rim.inner - rim.reach;
  const end = rim.outer + rim.reach;
  if (radius <= start || radius >= end) return 0;
  const t = (radius - start) / (end - start); // 0..1 a travers la bande
  const arc = Math.sin(t * Math.PI); // 0 aux bords, 1 au milieu
  const target = rim.top + rim.hop * arc;
  // Au milieu de la bande on est au moins a top + hop ; aux bords on
  // rejoint le sol : la surelevation est la difference, lissee par l'arc.
  const lift = Math.max(0, target - groundY) * Math.min(1, arc * 3);
  return lift;
}

/** Franchissement du bord de l'eau entre deux frames. */
export function rimCrossing(prevRadius: number, radius: number, rim: RimSpec): "enter" | "exit" | null {
  const wasIn = prevRadius < rim.inner;
  const isIn = radius < rim.inner;
  if (!wasIn && isIn) return "enter";
  if (wasIn && !isIn) return "exit";
  return null;
}

/** Cap du corps pendant l'enjambement (03/09, retour Sylvain "il tombe
 * mais garde exactement la meme posture droite et rigide") : le corps
 * suit sa trajectoire, museau haut a la montee, museau bas a la
 * descente. Radians, positif = museau haut. */
export function bodyPitch(dx: number, dy: number, maxRad = 0.45): number {
  if (dy === 0) return 0;
  const run = Math.max(Math.abs(dx), 1e-6);
  const raw = Math.atan2(dy, run);
  return Math.max(-maxRad, Math.min(maxRad, raw));
}

/** Amortissement des pattes a l'atterrissage : facteur d'echelle
 * verticale, 1 = pose normale, < 1 = tasse. Ressort amorti : le choc
 * comprime, puis deux rebonds de moins en moins marques. */
export function landingSquash(elapsed: number, depth = 0.2): number {
  if (elapsed < 0) return 1;
  const s = 1 - depth * Math.exp(-elapsed / 0.12) * Math.cos(elapsed * 18);
  return s;
}
