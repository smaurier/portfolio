import type { Dir3 } from "./direction-light";

/**
 * Les Cihuateteo (06/09, Ouest / Cihuatlampa, cf docs/da/ouest-sources.md) :
 * les femmes mortes en couches, divinisees, qui recoivent le soleil au
 * zenith et le portent jusqu'au couchant ; puis, la nuit venue, elles
 * descendent aux carrefours, ou on les craint et ou on leur laisse des
 * offrandes. Sylvain (06/09) : des silhouettes fantomatiques, flottantes,
 * dont s'echappent des particules.
 *
 * Partie pure : ou elles sont (en eventail du cote du soleil tant qu'il est
 * la, aux quatre coins de la Piedra, le carrefour, quand il est entre dans
 * la terre), comment elles respirent, combien elles se montrent. Le
 * composant (cihuateteo.tsx) pose les silhouettes la-dessus.
 */

export const CIHUATETEO = {
  count: 4,
  /** Distance du cerf a laquelle elles portent le soleil (u). */
  escortRadius: 12,
  /** Ecart lateral entre deux porteuses dans l'eventail (u). */
  escortSpread: 2.2,
  /** Elles flottent un peu au-dessus de la ligne du soleil (u). */
  escortLift: 1.2,
  /** Le carrefour : les quatre coins, hors de l'orbite de la camera (u du centre). */
  crossroadsRadius: 6.2,
  /** Hauteur de flottement au carrefour (u, pieds au-dessus du sol). */
  hoverHeight: 0.35,
  bobAmplitude: 0.12,
  bobHz: 0.18,
  /** Fenetre du crepuscule (0..1, cf ouest-arc dusk) sur laquelle elles descendent. */
  descendStart: 0.25,
  descendEnd: 0.85,
  opacityEscort: 0.2,
  opacityCrossroads: 0.5,
  /** Particules qui s'echappent, par porteuse et par seconde. */
  wispsEscort: 4,
  wispsCrossroads: 16,
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

export function bearerPose(index: number, count: number, dusk: number, sun: Dir3, time: number, c = CIHUATETEO): BearerPose {
  const bob = Math.sin(time * c.bobHz * Math.PI * 2 + index * 1.7) * c.bobAmplitude;
  // L'eventail du cote du soleil : le long de la perpendiculaire horizontale
  // a sa direction, centre sur lui, un peu au-dessus de sa ligne.
  const hl = Math.hypot(sun.x, sun.z) || 1;
  const px = sun.z / hl;
  const pz = -sun.x / hl;
  const lateral = (index - (count - 1) / 2) * c.escortSpread;
  const ex = sun.x * c.escortRadius + px * lateral;
  const ey = Math.max(1.5, sun.y * c.escortRadius + c.escortLift) + bob;
  const ez = sun.z * c.escortRadius + pz * lateral;
  const escortYaw = Math.atan2(-ex, -ez);
  // Le carrefour : un coin par porteuse, tournee vers le cerf.
  const angle = (index / count) * Math.PI * 2 + Math.PI / 4;
  const cx = Math.sin(angle) * c.crossroadsRadius;
  const cz = Math.cos(angle) * c.crossroadsRadius;
  const cy = c.hoverHeight + bob;
  const crossYaw = Math.atan2(-cx, -cz);
  const t = smoothstep(c.descendStart, c.descendEnd, dusk);
  return { x: lerp(ex, cx, t), y: lerp(ey, cy, t), z: lerp(ez, cz, t), yaw: lerpAngle(escortYaw, crossYaw, t) };
}

export function bearerOpacity(dusk: number, c = CIHUATETEO): number {
  return lerp(c.opacityEscort, c.opacityCrossroads, smoothstep(c.descendStart, c.descendEnd, dusk));
}

export function wispRate(dusk: number, c = CIHUATETEO): number {
  return lerp(c.wispsEscort, c.wispsCrossroads, smoothstep(c.descendStart, c.descendEnd, dusk));
}
