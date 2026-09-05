/**
 * Le gyroscope (05/09, controles de scene). Au doigt, la parallaxe souris
 * n'existe pas ; incliner le telephone la remplace. DeviceOrientation
 * donne beta (avant/arriere, -180..180) et gamma (gauche/droite, -90..90) ;
 * on mesure l'ecart a une REFERENCE prise au premier releve (la facon dont
 * le visiteur tient son telephone, pas l'horizontale absolue), avec une
 * zone morte au centre et une plage bornee. Pur.
 */

export type Orientation = { beta: number | null; gamma: number | null };

export const TILT = {
  /** Inclinaison (deg) qui donne la pleine parallaxe. */
  rangeDeg: 18,
  /** Zone morte (deg) autour de la reference : le telephone ne tremble pas. */
  deadDeg: 2,
};

function axis(delta: number): number {
  const a = Math.abs(delta);
  if (a <= TILT.deadDeg) return 0;
  const v = (a - TILT.deadDeg) / (TILT.rangeDeg - TILT.deadDeg);
  const c = v > 1 ? 1 : v;
  return delta < 0 ? -c : c;
}

export function tiltToParallax(now: Orientation, ref: { beta: number; gamma: number }): { x: number; y: number } {
  if (now.beta === null || now.gamma === null) return { x: 0, y: 0 };
  return { x: axis(now.gamma - ref.gamma), y: axis(now.beta - ref.beta) };
}
