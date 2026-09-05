/**
 * La camera du Sud MONTE AVEC LE SOLEIL (05/09, go de Sylvain : « donner un
 * sens a certaines proprietes de camera », comme la plongee du Nord).
 * Le Nord descend au Mictlan ; le Sud est le zenith. La nuit, la camera
 * est basse, presque au ras de l'herbe, regard leve vers les etoiles
 * (contre-plongee). A mesure que le soleil monte elle prend de la hauteur
 * et finit en plongee douce sur la Piedra a midi, quand l'anneau
 * s'embrase : la pierre du soleil vue d'en haut. La focale s'ouvre un peu
 * avec le jour (le ciel s'elargit), et la frappe donne un coup de focale.
 *
 * Pur : `sudCamera(day, fire)` rend les trois nombres, la camera les
 * applique ponderes par son fondu Sud.
 */

export type SudCameraSpec = {
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

export const SUD_CAMERA: SudCameraSpec = {
  heightNight: -0.2, // l'ancien SOUTH_CAMERA_DROP
  heightNoon: 1.7,
  targetLiftNight: 1.0, // l'ancien SOUTH_TARGET_LIFT
  targetLiftNoon: 0.45,
  fovNight: 42,
  fovNoon: 50,
  fovStrikeKick: 6,
};

export type SudCameraState = { height: number; targetLift: number; fov: number };

function smooth(u: number): number {
  const c = u < 0 ? 0 : u > 1 ? 1 : u;
  return c * c * (3 - 2 * c);
}

/** day : 0 la nuit, 1 au zenith (getRevealFloor) ; fire : 0..1, le feu de
 * la frappe (strike-sequence). */
export function sudCamera(day: number, fire: number, spec: SudCameraSpec = SUD_CAMERA): SudCameraState {
  const t = smooth(day);
  const kick = fire < 0 ? 0 : fire > 1 ? 1 : fire;
  return {
    height: spec.heightNight + (spec.heightNoon - spec.heightNight) * t,
    targetLift: spec.targetLiftNight + (spec.targetLiftNoon - spec.targetLiftNight) * t,
    fov: spec.fovNight + (spec.fovNoon - spec.fovNight) * t + spec.fovStrikeKick * kick,
  };
}
