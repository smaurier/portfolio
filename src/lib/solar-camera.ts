/**
 * La camera solaire (05/09 pour le Sud, partagee avec l'Ouest le 06/09) :
 * la camera MONTE AVEC LE SOLEIL. Basse et regard leve la nuit (contre-
 * plongee : le ciel ou nait le soleil), haute et plongeante a midi, focale
 * qui s'ouvre avec le jour. Au Sud le jour monte avec le scroll ; a l'Ouest
 * il descend (ouest-arc) : la meme fonction fait descendre la camera avec
 * le soleil. Le coup de focale de la frappe n'existe qu'au Sud.
 */

export type SolarCameraSpec = {
  /** Decalage vertical de la camera (u) la nuit et a midi. */
  heightNight: number;
  heightNoon: number;
  /** Elevation de la cible du regard (u) la nuit et a midi. */
  targetLiftNight: number;
  targetLiftNoon: number;
  /** Focale (degres) la nuit et a midi ; coup de focale a la frappe. */
  fovNight: number;
  fovNoon: number;
  fovStrikeKick: number;
};

export const SOLAR_CAMERA: SolarCameraSpec = {
  heightNight: -0.2, // l'ancien SOUTH_CAMERA_DROP
  heightNoon: 1.7,
  targetLiftNight: 1.0, // l'ancien SOUTH_TARGET_LIFT
  targetLiftNoon: 0.45,
  fovNight: 42,
  fovNoon: 50,
  fovStrikeKick: 6,
};

export type SolarCameraState = { height: number; targetLift: number; fov: number };

function smooth(u: number): number {
  const c = u < 0 ? 0 : u > 1 ? 1 : u;
  return c * c * (3 - 2 * c);
}

/** day : 0 la nuit, 1 au zenith (getRevealFloor) ; fire : 0..1, le feu de
 * la frappe (strike-sequence). */
export function solarCamera(day: number, fire: number, spec: SolarCameraSpec = SOLAR_CAMERA): SolarCameraState {
  const t = smooth(day);
  const kick = fire < 0 ? 0 : fire > 1 ? 1 : fire;
  return {
    height: spec.heightNight + (spec.heightNoon - spec.heightNight) * t,
    targetLift: spec.targetLiftNight + (spec.targetLiftNoon - spec.targetLiftNight) * t,
    fov: spec.fovNight + (spec.fovNoon - spec.fovNight) * t + spec.fovStrikeKick * kick,
  };
}
