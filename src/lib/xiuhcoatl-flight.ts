/**
 * Le vol du xiuhcoatl au Sud (04/09). Sur la Piedra del Sol, les deux
 * serpents de feu PORTENT le soleil a travers le ciel, du lever au coucher.
 * Ici, une fois par visite, un xiuhcoatl traverse le ciel du Sud au-dessus
 * du cerf, d'est en ouest, en un arc lent : le passage rare de ce monde,
 * comme Xolotl traverse le bassin du Nord.
 *
 * Pur et deterministe : position, tangente et roulis pour un temps
 * normalise t dans [0, 1]. Le composant pose le modele dessus.
 */

export type Vec3 = { x: number; y: number; z: number };

export type FlightSpec = {
  /** Abscisse de depart (hors champ, cote est) et d'arrivee (cote ouest). */
  fromX: number;
  toX: number;
  /** Profondeur (derriere le cerf). */
  z: number;
  /** Altitude aux bornes et au sommet de l'arc. */
  baseY: number;
  peakY: number;
  /** Ondulation laterale du vol (amplitude, nombre de vagues). */
  swayAmp: number;
  swayWaves: number;
};

// Reglage 04/09 (trace console, projection ecran, captures) : la camera de
// tete de page est a (0, 2.6, 7) et regarde le cerf vers le bas ; a z = -8,
// y = 3 tombe deja sous le bandeau de navigation. Le vol passe donc dans la
// bande de ciel entre la pointe des bois et le bandeau (y 2 -> 2.8), loin
// derriere le cerf (z = -8) : la silhouette du cerf se decoupe sur le feu.
export const XIUHCOATL_FLIGHT: FlightSpec = {
  fromX: -15,
  toX: 15,
  z: -8,
  baseY: 2.0,
  peakY: 2.8,
  swayAmp: 0.6,
  swayWaves: 2,
};

function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/** Position au temps t. L'arc est une demi-sinusoide : bas aux deux bouts,
 * haut au milieu ; le vol ondule doucement en profondeur. */
export function flightPosition(t: number, spec: FlightSpec = XIUHCOATL_FLIGHT): Vec3 {
  const u = clamp01(t);
  return {
    x: spec.fromX + (spec.toX - spec.fromX) * u,
    y: spec.baseY + (spec.peakY - spec.baseY) * Math.sin(u * Math.PI),
    z: spec.z + spec.swayAmp * Math.sin(u * Math.PI * 2 * spec.swayWaves),
  };
}

/** Tangente unitaire au temps t (derivee analytique). */
export function flightTangent(t: number, spec: FlightSpec = XIUHCOATL_FLIGHT): Vec3 {
  const u = clamp01(t);
  const dx = spec.toX - spec.fromX;
  const dy = (spec.peakY - spec.baseY) * Math.PI * Math.cos(u * Math.PI);
  const dz = spec.swayAmp * Math.PI * 2 * spec.swayWaves * Math.cos(u * Math.PI * 2 * spec.swayWaves);
  const l = Math.hypot(dx, dy, dz) || 1;
  return { x: dx / l, y: dy / l, z: dz / l };
}

/** Roulis (radians) : le corps s'incline dans les virages de l'ondulation,
 * proportionnel a la courbure laterale. */
export function flightRoll(t: number, spec: FlightSpec = XIUHCOATL_FLIGHT): number {
  const u = clamp01(t);
  const k = spec.swayWaves * 2 * Math.PI;
  const ddz = -spec.swayAmp * k * k * Math.sin(u * k);
  return Math.max(-0.35, Math.min(0.35, ddz * 0.004));
}

/** Combien de braises emettre sur cette frame : un jet continu le long du
 * corps, plus dense au sommet de l'arc (le feu monte avec le soleil). */
export function emberBudget(t: number, dt: number, perSecond = 26): number {
  const u = clamp01(t);
  const heat = 0.6 + 0.4 * Math.sin(u * Math.PI);
  return perSecond * heat * dt;
}
