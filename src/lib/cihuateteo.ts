import type { Dir3 } from "./direction-light";

/**
 * Les Cihuateteo (06/09, Ouest / Cihuatlampa, cf docs/da/ouest-sources.md) :
 * les femmes mortes en couches, divinisees, qui recoivent le soleil au
 * zenith et « le portent dans une litiere de plumes de quetzal » (Codex de
 * Florence, livre VI) jusqu'au couchant ; puis, la nuit venue, elles
 * descendent aux carrefours, ou on les craint et ou on leur laisse des
 * papiers et des offrandes. Sylvain (06/09) : fantomatiques, brumeuses,
 * flottantes, cheveux qui ondulent chacune a sa maniere, et qu'on voie les
 * quatre.
 *
 * Partie pure : ou elles sont (en eventail du cote du soleil tant qu'il est
 * la, puis en arc face au regard de fin de page, toutes dans le champ), ou
 * est la litiere, comment elles respirent, combien elles se montrent, et
 * la chevelure de chacune (tiree d'une graine : jamais deux pareilles).
 */

export const CIHUATETEO = {
  count: 4,
  /** Distance du cerf a laquelle elles portent le soleil (u). */
  escortRadius: 12,
  /** Ecart lateral entre deux porteuses dans l'eventail (u). */
  escortSpread: 2.2,
  /** Elles flottent un peu au-dessus de la ligne du soleil (u). */
  escortLift: 1.2,
  /** Le carrefour : un arc face au regard de fin de page (azimut monde du
   * regard a p = 1 : 135 deg), assez loin pour que les quatre tiennent
   * dans le cadre. */
  crossroadsRadius: 7.2,
  crossroadsAzimuthDeg: 135,
  crossroadsSpreadDeg: 22,
  /** Hauteur de flottement au carrefour (u, pieds au-dessus du sol). */
  hoverHeight: 0.35,
  bobAmplitude: 0.12,
  bobHz: 0.18,
  /** Fenetre du crepuscule (0..1, cf ouest-arc dusk) sur laquelle elles descendent. */
  descendStart: 0.25,
  descendEnd: 0.85,
  opacityEscort: 0.45,
  opacityCrossroads: 0.8,
  /** Papillons qui s'echappent, par porteuse et par seconde. */
  wispsEscort: 3,
  wispsCrossroads: 10,
};

export type BearerPose = { x: number; y: number; z: number; yaw: number };

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
/** Interpolation d'angle par le plus court chemin. */
function lerpAngle(a: number, b: number, t: number): number {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + d * t;
}

/** 0 tant qu'elles portent le soleil, 1 posees au carrefour. */
export function descentBlend(dusk: number, c = CIHUATETEO): number {
  return smoothstep(c.descendStart, c.descendEnd, dusk);
}

function escortPose(index: number, count: number, sun: Dir3, bob: number, c = CIHUATETEO): BearerPose {
  // L'eventail du cote du soleil : le long de la perpendiculaire horizontale
  // a sa direction, centre sur lui, un peu au-dessus de sa ligne.
  const hl = Math.hypot(sun.x, sun.z) || 1;
  const px = sun.z / hl;
  const pz = -sun.x / hl;
  const lateral = (index - (count - 1) / 2) * c.escortSpread;
  const x = sun.x * c.escortRadius + px * lateral;
  const y = Math.max(1.5, sun.y * c.escortRadius + c.escortLift) + bob;
  const z = sun.z * c.escortRadius + pz * lateral;
  return { x, y, z, yaw: Math.atan2(-x, -z) };
}

function crossroadsPose(index: number, count: number, bob: number, c = CIHUATETEO): BearerPose {
  const angle = ((c.crossroadsAzimuthDeg + (index - (count - 1) / 2) * c.crossroadsSpreadDeg) * Math.PI) / 180;
  const x = Math.sin(angle) * c.crossroadsRadius;
  const z = Math.cos(angle) * c.crossroadsRadius;
  return { x, y: c.hoverHeight + bob, z, yaw: Math.atan2(-x, -z) };
}

export function bearerPose(index: number, count: number, dusk: number, sun: Dir3, time: number, c = CIHUATETEO): BearerPose {
  const bob = Math.sin(time * c.bobHz * Math.PI * 2 + index * 1.7) * c.bobAmplitude;
  const e = escortPose(index, count, sun, bob, c);
  const k = crossroadsPose(index, count, bob, c);
  const t = descentBlend(dusk, c);
  return { x: lerp(e.x, k.x, t), y: lerp(e.y, k.y, t), z: lerp(e.z, k.z, t), yaw: lerpAngle(e.yaw, k.yaw, t) };
}

/** La litiere de plumes de quetzal : au milieu des porteuses, a hauteur
 * des mains tant qu'elles la portent, posee au sol au carrefour, orientee
 * comme elles. `sunGlow` : le soleil qu'elle porte, eteint une fois entre
 * dans la terre. */
export function litterPose(count: number, dusk: number, sun: Dir3, time: number, c = CIHUATETEO): BearerPose & { sunGlow: number } {
  let x = 0, y = 0, z = 0, sy = 0, cy = 0;
  for (let i = 0; i < count; i++) {
    const p = bearerPose(i, count, dusk, sun, time, c);
    x += p.x; y += p.y; z += p.z;
    sy += Math.sin(p.yaw); cy += Math.cos(p.yaw);
  }
  const t = descentBlend(dusk, c);
  return {
    x: x / count,
    y: lerp(y / count + 0.75, 0.08, t),
    z: z / count,
    yaw: Math.atan2(sy, cy),
    sunGlow: (1 - t) * clamp01(sun.y * 6 + 0.4),
  };
}

export function bearerOpacity(dusk: number, c = CIHUATETEO): number {
  return lerp(c.opacityEscort, c.opacityCrossroads, descentBlend(dusk, c));
}

export function wispRate(dusk: number, c = CIHUATETEO): number {
  return lerp(c.wispsEscort, c.wispsCrossroads, descentBlend(dusk, c));
}

/** Une chevelure : nombre de meches, longueurs, souplesse et souffle
 * propres, tires d'une graine. Deux porteuses n'ont jamais la meme. */
export type HairStrand = { length: number; damping: number; windResponse: number; phase: number; speed: number; side: number };

function hash(i: number, k: number): number {
  const v = Math.sin(i * 12.9898 + k * 78.233 + 4.2) * 43758.5453;
  return v - Math.floor(v);
}

export function bearerHair(seed: number): HairStrand[] {
  const count = 6 + Math.floor(hash(seed, 1) * 4); // 6..9 meches
  return Array.from({ length: count }, (_, i) => {
    const k = seed * 31 + i;
    return {
      length: 0.5 + 0.45 * hash(k, 2),
      damping: 0.955 + 0.03 * hash(k, 3),
      windResponse: 0.8 + 1.2 * hash(k, 4),
      phase: hash(k, 5) * Math.PI * 2,
      speed: 0.6 + 1.4 * hash(k, 6),
      side: (i / Math.max(1, count - 1)) * 2 - 1,
    };
  });
}
