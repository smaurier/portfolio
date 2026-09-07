import type { Dir3 } from "./direction-light";
import { FROST } from "./frost";

/**
 * L'arc de l'Est (06/09, Tlahuizcalpan, page Services) : la nuit gelee,
 * puis le soleil qui se leve FACE AU REGARD a l'instant ou tout eclate
 * (FROST.shatterAt), rouge puis or, et monte jusqu'a la fin de la page.
 * Venus du matin se tient au-dessus du lever avant lui. Partie pure ;
 * le regard de la camera a p = 0,55 est a l'azimut 18 deg (camera-path).
 */
export const EST_ARC = {
  /** Azimut du lever (deg, convention x = sin, z = cos) : le regard a p 0,55. */
  sunAzimuthDeg: 18,
  /** Elevation sous l'horizon avant le lever (deg). */
  elevationNight: -6,
  /** Elevation en fin de page (deg). */
  elevationDay: 48,
  /** Le soleil commence a monter un peu avant d'apparaitre. */
  riseStart: 0.42,
  /** Venus du matin : azimut et hauteur (deg). */
  venusAzimuthDeg: 4,
  venusElevationDeg: 5,
};

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function fromAngles(azDeg: number, elDeg: number): Dir3 {
  const az = (azDeg * Math.PI) / 180, el = (elDeg * Math.PI) / 180;
  return { x: Math.sin(az) * Math.cos(el), y: Math.sin(el), z: Math.cos(az) * Math.cos(el) };
}

/** Direction du soleil de l'Est pour un progres 0..1. Elevation lineaire
 * par morceaux : nuit → 0 deg exactement a shatterAt → jour. */
export function eastSunDirection(p: number): Dir3 {
  const { elevationNight, elevationDay, riseStart } = EST_ARC;
  const at = FROST.shatterAt;
  let el: number;
  if (p <= riseStart) el = elevationNight;
  else if (p <= at) el = elevationNight * (1 - (p - riseStart) / (at - riseStart));
  else {
    const u = clamp01((p - at) / (1 - at));
    el = elevationDay * u * (2 - u); // vite au debut, s'apaise en montant
  }
  return fromAngles(EST_ARC.sunAzimuthDeg, el);
}

/** La bande rouge de l'aube : monte avec le soleil sous l'horizon, pleine
 * quand il parait, s'efface quand il est haut. */
export function dawnAtArc(p: number): number {
  const at = FROST.shatterAt;
  const up = clamp01((p - EST_ARC.riseStart) / (at - EST_ARC.riseStart));
  const down = clamp01((p - at) / 0.35);
  return up * up * (1 - down * down * (3 - 2 * down) * 0.85);
}

/** Le « jour » de l'Est : rien tant que le monde est gele, le ciel
 * s'eclaire avec le soleil (0,3 quand il parait), plein a la fin. */
export function eastDay(p: number): number {
  const at = FROST.shatterAt;
  if (p <= EST_ARC.riseStart) return 0;
  if (p <= at) return 0.3 * clamp01((p - EST_ARC.riseStart) / (at - EST_ARC.riseStart)) ** 2;
  const u = clamp01((p - at) / (1 - at));
  return 0.3 + 0.7 * u * (2 - u);
}

/** L'axe du puits de lumiere sur le cerf (sun-beam) : vers l'azimut du
 * soleil, raide (62 deg : licence de cinema). La lance du soleil part du
 * sommet de cet axe (Sylvain, 07/09 : « du meme point d'ou vient le rayon »). */
export const BEAM_ELEVATION_DEG = 62;
export const BEAM_HEIGHT = 18;
export function beamAxis(p: number): Dir3 {
  const sun = eastSunDirection(Math.max(0.6, p));
  const az = (Math.atan2(sun.x, sun.z) * 180) / Math.PI;
  return fromAngles(az, BEAM_ELEVATION_DEG);
}

export function morningStarDirection(): Dir3 {
  return fromAngles(EST_ARC.venusAzimuthDeg, EST_ARC.venusElevationDeg);
}

export type Rgb = { r: number; g: number; b: number };
/** Brume de l'Est : bleu de nuit gelee -> rouge de l'aube -> or du matin. */
export const EAST_FOG = {
  night: { r: 0.05, g: 0.08, b: 0.16 },
  dawn: { r: 0.62, g: 0.28, b: 0.2 },
  day: { r: 0.72, g: 0.6, b: 0.42 },
};
function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
}
export function eastFogTint(p: number): Rgb {
  const dawn = dawnAtArc(p);
  const day = clamp01((p - FROST.shatterAt) / 0.4);
  return mixRgb(mixRgb(EAST_FOG.night, EAST_FOG.day, day * day), EAST_FOG.dawn, dawn * (1 - 0.5 * day));
}
