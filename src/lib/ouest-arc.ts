/**
 * L'arc de l'Ouest (06/09, Sylvain : « du clair vers le sombre, c'est
 * juste »). Cihuatlampa est le lieu ou le soleil tombe : la page Contact
 * commence en fin d'apres-midi, soleil bas a l'ouest, et descend jusqu'au
 * crepuscule. Le miroir du Sud (nuit -> midi) et le pendant du Nord
 * (direction-arc.ts, la descente au Mictlan).
 *
 * Trois valeurs par progres de scroll :
 *  - `day` : la hauteur du soleil pour direction-light (sunDirection,
 *    rigAtArc) et le ciel : `dayTop` = ~50 deg en tete de page, sous
 *    l'horizon a `setAt`, puis la nuit tombe jusqu'a `dayNight` ;
 *  - `lightP` : le progres a donner aux courbes de reveal-arc (ambiante,
 *    directionnelle, brouillard) : du clair au plancher du crepuscule ;
 *  - `dusk` : le crepuscule lui-meme, 0 -> 1, pour la bande mauve du ciel
 *    et, plus tard, les porteuses et les offrandes.
 */

export const OUEST_ARC = {
  /** Hauteur de soleil (entree de sunDirection) en tete de page (~37 deg). */
  dayTop: 0.55,
  /** ... au coucher : le disque touche l'horizon a `setAt` ... */
  daySet: 0.29,
  /** ... et en bas de page (la nuit tombee). */
  dayNight: 0.1,
  /** Progres du coucher : le soleil touche l'horizon. */
  setAt: 0.72,
  /** Progres de reveal-arc en haut et en bas de page. */
  lightTop: 0.8,
  lightFloor: 0.28,
  duskStart: 0.5,
  duskEnd: 0.85,
};

export type WestArc = { day: number; lightP: number; dusk: number };

/** Le brouillard de l'Ouest : gris abricot de fin d'apres-midi, puis le
 * mauve du crepuscule (la cendre et le corail du Codex). */
export const WEST_FOG = {
  afternoon: { r: 122, g: 104, b: 98 },
  dusk: { r: 74, g: 28, b: 52 },
};

export function westFogTint(dusk: number): { r: number; g: number; b: number } {
  const t = clamp01(dusk);
  const mix = (a: number, b: number) => a + (b - a) * t;
  return { r: mix(WEST_FOG.afternoon.r, WEST_FOG.dusk.r), g: mix(WEST_FOG.afternoon.g, WEST_FOG.dusk.g), b: mix(WEST_FOG.afternoon.b, WEST_FOG.dusk.b) };
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

const DESCENT_START = 0.05;

export function remapWestArc(progress: number, c = OUEST_ARC): WestArc {
  const p = clamp01(progress);
  // Le soleil : de l'apres-midi au coucher, puis la nuit qui s'installe.
  const toSet = smoothstep(DESCENT_START, c.setAt, p);
  const toNight = smoothstep(c.setAt, 1, p);
  const day = c.dayTop + (c.daySet - c.dayTop) * toSet + (c.dayNight - c.daySet) * toNight;
  // La lumiere : une seule descente douce, du clair au plancher.
  const lightP = c.lightTop + (c.lightFloor - c.lightTop) * smoothstep(DESCENT_START, 0.8, p);
  return { day, lightP, dusk: smoothstep(c.duskStart, c.duskEnd, p) };
}
