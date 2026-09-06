/**
 * Venus, l'etoile du soir (06/09, Ouest / Cihuatlampa) : Xolotl est Venus
 * du soir, le jumeau qui guide le soleil dans l'inframonde (cf
 * docs/da/ouest-sources.md). Le site regarde le VRAI ciel : quand Venus
 * est reellement a l'est du soleil (visible apres le coucher), Xolotl passe
 * a coup sur sur la page Contact et l'etoile du soir s'allume apres le
 * coucher ; sinon il ne vient qu'une fois sur trois.
 *
 * Elongation par les elements orbitaux moyens de la Terre et de Venus
 * (J2000, orbites dans l'ecliptique, equation du centre au second ordre) :
 * precision de l'ordre du degre et de quelques jours sur les extremes,
 * largement assez pour dire « soir » ou « matin ». Pur.
 */

const RAD = Math.PI / 180;

type Orbit = { a: number; e: number; L0: number; rate: number; peri: number };
/** Demi-grand axe (ua), excentricite, longitude moyenne a J2000 (deg),
 * mouvement moyen (deg/jour), longitude du perihelie (deg). */
const EARTH: Orbit = { a: 1.00000261, e: 0.01671123, L0: 100.46457166, rate: 0.98564736, peri: 102.93768193 };
const VENUS: Orbit = { a: 0.72333566, e: 0.00677672, L0: 181.97909950, rate: 1.60213034, peri: 131.60246718 };

function wrap(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Position heliocentrique dans l'ecliptique (ua), pour d jours depuis J2000. */
function heliocentric(o: Orbit, d: number): { x: number; y: number } {
  const L = wrap(o.L0 + o.rate * d);
  const M = wrap(L - o.peri) * RAD;
  const nu = M + (2 * o.e - o.e ** 3 / 4) * Math.sin(M) + (5 / 4) * o.e ** 2 * Math.sin(2 * M);
  const r = (o.a * (1 - o.e * o.e)) / (1 + o.e * Math.cos(nu));
  const lon = nu + o.peri * RAD;
  return { x: r * Math.cos(lon), y: r * Math.sin(lon) };
}

/** Elongation de Venus (deg) : positive a l'est du soleil (etoile du
 * soir), negative a l'ouest (etoile du matin). */
export function venusElongation(date: Date): number {
  const d = date.getTime() / 86400000 - 10957.5; // jours depuis J2000.0
  const e = heliocentric(EARTH, d);
  const v = heliocentric(VENUS, d);
  const sunLon = Math.atan2(-e.y, -e.x);
  const venusLon = Math.atan2(v.y - e.y, v.x - e.x);
  const diff = Math.atan2(Math.sin(venusLon - sunLon), Math.cos(venusLon - sunLon));
  return diff / RAD;
}

/** En dessous, Venus se noie dans la lueur du soleil. */
export const VENUS_VISIBLE_ELONGATION = 10;

export function isEveningStar(date: Date = new Date()): boolean {
  return venusElongation(date) > VENUS_VISIBLE_ELONGATION;
}

/** Venus a l'ouest du soleil : visible avant le lever (Tlahuizcalpantecuhtli). */
export function isMorningStar(date: Date = new Date()): boolean {
  return venusElongation(date) < -VENUS_VISIBLE_ELONGATION;
}
