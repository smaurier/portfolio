/**
 * Le vol errant du xiuhcoatl (04/09, Sylvain : « ne pourrait-il pas etre la
 * pendant toute la scene a voler de maniere aleatoire dans le ciel, tout en
 * evitant les montagnes »). Remplace le passage chronometre : quand il est
 * present (tirage 1/3 par visite, cote composant), le serpent vit dans le
 * ciel du Sud en continu, sur un chemin errant lisse, borne a la bande de
 * ciel que la camera voit entre la crete des montagnes et le bandeau.
 *
 * Pur et deterministe : un etat (position, cap, temps) et une fonction de
 * pas. Le bruit est une somme de sinus a frequences incommensurables,
 * dephasee par la graine : lisse, sans allocation, reproductible.
 */

export type Vec3 = { x: number; y: number; z: number };

export type WanderSpec = {
  /** Boite horizontale du ciel (unites monde). En x, la demi-largeur
   * VISIBLE depend de la profondeur (perspective) : xHalf(z) =
   * min(xMax, xHalfPerDist * (camZ - z)), pour que le serpent reste dans le
   * champ meme quand il passe pres. */
  xMin: number;
  xMax: number;
  xHalfPerDist: number;
  zMin: number;
  zMax: number;
  /** Camera de tete de page (avec le regard leve du Sud), pour la bande
   * d'elevation : la crete culmine vers 3 deg, le bandeau coupe vers 16. */
  camY: number;
  camZ: number;
  minElevDeg: number;
  maxElevDeg: number;
  /** Vitesse (unites/s), taux de virage max (rad/s), marge de braquage. */
  speed: number;
  turnRate: number;
  margin: number;
};

export type WanderState = {
  x: number;
  y: number;
  z: number;
  /** Cap dans le plan xz, 0 = +x, croissant vers +z. */
  heading: number;
  /** Pente du dernier pas (pour orienter le corps). */
  pitch: number;
  t: number;
  seed: number;
};

// Camera de tete de page au Sud (orbit-camera, blend Huitztlampa) : rayon
// 9.5, hauteur 2.4, regard vers (0, 2.1, 0). Bande d'elevation mesuree aux
// captures du 04/09 : sous 6.5 deg le ventre frole la crete, au-dessus de
// 12 deg la crete de flammes passe sous le bandeau de navigation.
export const XIUHCOATL_WANDER: WanderSpec = {
  xMin: -16,
  xMax: 16,
  xHalfPerDist: 0.5,
  zMin: -22,
  zMax: -8,
  camY: 2.4,
  camZ: 9.5,
  minElevDeg: 6.5,
  maxElevDeg: 12,
  speed: 2.2,
  turnRate: 0.9,
  margin: 4,
};

const RAD = Math.PI / 180;

/** Demi-largeur de la boite a la profondeur z (bornee par xMax). */
export function xHalf(z: number, spec: WanderSpec = XIUHCOATL_WANDER): number {
  return Math.min(spec.xMax, spec.xHalfPerDist * (spec.camZ - z));
}

/** Plancher et plafond du ciel a la profondeur z. */
export function skyBand(z: number, spec: WanderSpec = XIUHCOATL_WANDER): { yMin: number; yMax: number } {
  const dist = spec.camZ - z;
  return {
    yMin: spec.camY + dist * Math.tan(spec.minElevDeg * RAD),
    yMax: spec.camY + dist * Math.tan(spec.maxElevDeg * RAD),
  };
}

/** Bruit lisse dans [-1, 1], deterministe par graine et canal. */
function noise(t: number, seed: number, channel: number): number {
  const p = seed * 12.9898 + channel * 78.233;
  return (
    0.55 * Math.sin(0.23 * t + p) +
    0.3 * Math.sin(0.61 * t + p * 1.7) +
    0.15 * Math.sin(1.37 * t + p * 2.3)
  );
}

function wrapAngle(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function initialWander(seed: number, spec: WanderSpec = XIUHCOATL_WANDER): WanderState {
  const u = (Math.sin(seed * 7.13) + 1) / 2;
  const v = (Math.sin(seed * 3.71 + 1) + 1) / 2;
  const z = spec.zMin + (spec.zMax - spec.zMin) * (0.25 + 0.5 * v);
  const xh = xHalf(z, spec);
  const x = -xh + 2 * xh * (0.25 + 0.5 * u);
  const band = skyBand(z, spec);
  return { x, y: (band.yMin + band.yMax) / 2, z, heading: u < 0.5 ? 0 : Math.PI, pitch: 0, t: 0, seed };
}

/** Un pas de vol : le cap derive avec le bruit, se rabat vers le centre
 * quand il approche des bords, l'altitude suit une cible bruitee dans la
 * bande de ciel. La position est toujours ramenee dans la boite. */
export function stepWander(s: WanderState, dt: number, spec: WanderSpec = XIUHCOATL_WANDER): WanderState {
  const t = s.t + dt;
  // Cap : derive libre...
  let heading = s.heading + noise(t, s.seed, 0) * spec.turnRate * dt;
  // ...plus braquage vers le centre proportionnel a la penetration dans la marge.
  const cx = 0, cz = (spec.zMin + spec.zMax) / 2;
  const xh0 = xHalf(s.z, spec);
  const over = Math.max(
    (-xh0 + spec.margin - s.x) / spec.margin,
    (s.x - (xh0 - spec.margin)) / spec.margin,
    (spec.zMin + spec.margin - s.z) / spec.margin,
    (s.z - (spec.zMax - spec.margin)) / spec.margin,
    0
  );
  if (over > 0) {
    const desired = Math.atan2(cz - s.z, cx - s.x);
    const delta = wrapAngle(desired - heading);
    const maxTurn = spec.turnRate * dt;
    heading += clamp(delta, -maxTurn, maxTurn) * Math.min(1, over);
  }
  heading = wrapAngle(heading);

  const step = spec.speed * dt;
  const z = clamp(s.z + Math.sin(heading) * step, spec.zMin, spec.zMax);
  const xh = xHalf(z, spec);
  const x = clamp(s.x + Math.cos(heading) * step, -xh, xh);
  const band = skyBand(z, spec);
  const yTarget = band.yMin + (band.yMax - band.yMin) * (0.5 + 0.42 * noise(t, s.seed, 1));
  const y = clamp(s.y + (yTarget - s.y) * Math.min(1, dt * 0.6), band.yMin, band.yMax);
  const pitch = Math.atan2(y - s.y, step || 1e-9);
  return { x, y, z, heading, pitch, t, seed: s.seed };
}

/** Tangente unitaire du vol (cap + pente). */
export function wanderTangent(s: WanderState): Vec3 {
  const c = Math.cos(s.pitch);
  return { x: Math.cos(s.heading) * c, y: Math.sin(s.pitch), z: Math.sin(s.heading) * c };
}
