import type { DirectionKey } from "@/app/components/stag-scene/direction-colors";

/**
 * Simulateur de prairie (05/09, retour Sylvain : « un vrai simulateur
 * d'herbe qui permet d'avoir une vraie prairie qui pourrait reagir au
 * vent »). Pur, deterministe, sans three.
 *
 * Le principe : l'herbe n'est pas POSEE par le vent, elle y est POUSSEE.
 * Chaque cellule d'une grille (le sol de la prairie) porte une flexion
 * (le deplacement de la pointe des brins, en fraction de leur hauteur,
 * plan xz) et une vitesse ; un ressort la ramene au repos, un
 * amortissement freine, le vent est une force. Elle se couche, resiste,
 * revient en oscillant. Les impulsions (l'onde d'Ollin, la frappe du
 * xiuhcoatl) sont des coups de vitesse radiaux.
 *
 * Le vent est un champ : une brise de fond, plus des rafales en nappes
 * qui VOYAGENT dans le sens du vent (sinus sur la coordonnee le long du
 * vent, moins la vitesse fois le temps : la nappe se deplace). Trois
 * nappes incommensurables : on voit des vagues courir dans l'herbe, pas
 * un balancement uniforme.
 *
 * Le composant echantillonne la grille sur le GPU (une texture de
 * flexion, filtrage bilineaire) : la simulation reste petite (une grille
 * 64 x 64), le rendu peut avoir des dizaines de milliers de brins.
 */

export type Vec2 = { x: number; z: number };

export type WindSpec = {
  /** Direction unitaire (monde, plan xz) d'ou SOUFFLE le vent vers ou il va. */
  dirX: number;
  dirZ: number;
  /** Brise de fond (0..1, en fraction de flexion apres gain). */
  strength: number;
  /** Amplitude des rafales, ajoutee a la brise. */
  gustAmp: number;
  /** Vitesse de deplacement des nappes (u/s). */
  gustSpeed: number;
  /** Frequence spatiale des nappes (1/u) : petit = grandes vagues. */
  gustScale: number;
};

function unit(x: number, z: number): { dirX: number; dirZ: number } {
  const l = Math.hypot(x, z) || 1;
  return { dirX: x / l, dirZ: z / l };
}

/** Le vent de chaque page. L'Ouest est la page d'Ehecatl, le dieu du
 * vent : la prairie y est la plus couchee. Directions en coordonnees
 * MONDE (la camera de tete de page regarde -z). */
export const GRASS_WIND_BY_DIRECTION: Record<DirectionKey, WindSpec> = {
  jade: { ...unit(0.8, -0.4), strength: 0.16, gustAmp: 0.22, gustSpeed: 2.2, gustScale: 0.22 },
  dore: { ...unit(1, 0.35), strength: 0.2, gustAmp: 0.26, gustSpeed: 2.4, gustScale: 0.2 },
  turquoise: { ...unit(-0.7, -0.5), strength: 0.18, gustAmp: 0.3, gustSpeed: 2.6, gustScale: 0.24 },
  cendre: { ...unit(-1, 0.25), strength: 0.42, gustAmp: 0.4, gustSpeed: 4.2, gustScale: 0.18 },
  obsidienne: { ...unit(0, 1), strength: 0.1, gustAmp: 0.1, gustSpeed: 1.5, gustScale: 0.2 },
};

/** Trois nappes de rafales : rapports de frequence incommensurables,
 * poids qui somment a 1 (la borne strength + gustAmp tient). */
const GUST_BANDS: readonly { freq: number; weight: number; phase: number; cross: number }[] = [
  { freq: 1, weight: 0.5, phase: 0, cross: 0.35 },
  { freq: 1.618, weight: 0.3, phase: 2.1, cross: -0.6 },
  { freq: 2.414, weight: 0.2, phase: 4.4, cross: 0.9 },
];

/** Le vent en (x, z) a l'instant t. Rafales : sinus positif (les creux
 * sont des accalmies, pas des contre-vents), sur la coordonnee le long du
 * vent moins speed * t, avec une petite modulation en travers pour que les
 * nappes ne soient pas des barres parfaites. */
export function windAt(x: number, z: number, t: number, spec: WindSpec): Vec2 {
  const along = x * spec.dirX + z * spec.dirZ;
  const across = -x * spec.dirZ + z * spec.dirX;
  let gust = 0;
  if (spec.gustAmp > 0) {
    for (const b of GUST_BANDS) {
      const k = spec.gustScale * b.freq;
      const s = Math.sin(k * (along - spec.gustSpeed * t) * Math.PI * 2 + b.phase + Math.sin(across * k * b.cross) * 0.8);
      gust += b.weight * Math.max(0, s);
    }
  }
  const m = spec.strength + spec.gustAmp * gust;
  return { x: spec.dirX * m, z: spec.dirZ * m };
}

export type SimSpec = {
  /** Raideur du ressort (1/s^2) et amortissement (1/s). */
  stiffness: number;
  damping: number;
  /** Flexion de repos pour un vent unitaire. */
  windGain: number;
  /** Flexion maximale (la pointe ne passe pas sous le sol). */
  maxBend: number;
  /** Pas de temps maximal integre (s) : au-dela, on sous-echantillonne. */
  maxDt: number;
};

export const GRASS_SIM: SimSpec = {
  stiffness: 14,
  damping: 2.6,
  windGain: 1,
  maxBend: 1,
  maxDt: 1 / 30,
};

export type GrassGrid = {
  /** Cellules par cote. */
  size: number;
  /** Demi-etendue (u) : la grille couvre [-extent, extent]^2. */
  extent: number;
  /** Flexion (x, z) par cellule, index 2i / 2i+1 ; i = z * size + x. */
  bend: Float32Array;
  /** Vitesse de flexion (x, z) par cellule. */
  vel: Float32Array;
};

export function createGrassGrid(size: number, extent: number): GrassGrid {
  return { size, extent, bend: new Float32Array(size * size * 2), vel: new Float32Array(size * size * 2) };
}

/** Centre (x, z) de la cellule i. */
export function cellCenter(grid: GrassGrid, i: number): Vec2 {
  const cell = (2 * grid.extent) / grid.size;
  const cx = i % grid.size;
  const cz = Math.floor(i / grid.size);
  return { x: -grid.extent + (cx + 0.5) * cell, z: -grid.extent + (cz + 0.5) * cell };
}

/** Un pas de simulation : ressort vers gain * vent, amortissement,
 * integration semi-implicite, borne de flexion. `wind` recoit le centre
 * de la cellule et rend le vent la (deja dans le repere de la grille). */
export function stepGrassGrid(grid: GrassGrid, dt: number, wind: (x: number, z: number) => Vec2, spec: SimSpec): void {
  if (!(dt > 0)) return;
  const steps = Math.max(1, Math.ceil(dt / spec.maxDt));
  const h = dt / steps;
  const n = grid.size * grid.size;
  const { bend, vel } = grid;
  const cell = (2 * grid.extent) / grid.size;
  for (let s = 0; s < steps; s++) {
    for (let i = 0; i < n; i++) {
      const x = -grid.extent + ((i % grid.size) + 0.5) * cell;
      const z = -grid.extent + (Math.floor(i / grid.size) + 0.5) * cell;
      const w = wind(x, z);
      const tx = w.x * spec.windGain;
      const tz = w.z * spec.windGain;
      const bx = bend[2 * i], bz = bend[2 * i + 1];
      let vx = vel[2 * i], vz = vel[2 * i + 1];
      vx += ((tx - bx) * spec.stiffness - vx * spec.damping) * h;
      vz += ((tz - bz) * spec.stiffness - vz * spec.damping) * h;
      let nx = bx + vx * h;
      let nz = bz + vz * h;
      const len = Math.hypot(nx, nz);
      if (len > spec.maxBend) {
        const k = spec.maxBend / len;
        nx *= k;
        nz *= k;
        // La pointe bute : la vitesse radiale sortante est perdue.
        const outward = (vx * nx + vz * nz) / (spec.maxBend * spec.maxBend);
        if (outward > 0) {
          vx -= outward * nx;
          vz -= outward * nz;
        }
      }
      bend[2 * i] = nx;
      bend[2 * i + 1] = nz;
      vel[2 * i] = vx;
      vel[2 * i + 1] = vz;
    }
  }
}

/** Un coup de vent radial depuis (cx, cz) : vitesse vers l'exterieur,
 * pleine au centre, nulle au rayon (cosinus). Le centre exact ne recoit
 * rien (pas de direction). */
export function applyRadialImpulse(grid: GrassGrid, cx: number, cz: number, radius: number, strength: number): void {
  const n = grid.size * grid.size;
  const cell = (2 * grid.extent) / grid.size;
  for (let i = 0; i < n; i++) {
    const x = -grid.extent + ((i % grid.size) + 0.5) * cell - cx;
    const z = -grid.extent + (Math.floor(i / grid.size) + 0.5) * cell - cz;
    const r = Math.hypot(x, z);
    if (r >= radius || r < 1e-6) continue;
    const fall = 0.5 + 0.5 * Math.cos((r / radius) * Math.PI);
    const k = (strength * fall) / r;
    grid.vel[2 * i] += x * k;
    grid.vel[2 * i + 1] += z * k;
  }
}

/** Energie (flexion^2 + vitesse^2 sommees) : zero = prairie au repos. */
export function gridEnergy(grid: GrassGrid): number {
  let e = 0;
  for (let i = 0; i < grid.bend.length; i++) e += grid.bend[i] * grid.bend[i] + grid.vel[i] * grid.vel[i];
  return e;
}

/** Teinte de l'herbe par page (multiplicateur rgb, et part de melange) :
 * herbe seche, doree a l'Est (l'aube), chaude et blanchie au Sud a midi,
 * cendree a l'Ouest sous le vent d'Ehecatl. `greenBase` : une pointe de
 * vert au pied des brins au Sud (la saison des pluies et la naissance du
 * soleil vont ensemble), jamais une prairie verte. */
export const GRASS_TINT_BY_DIRECTION: Record<DirectionKey, { rgb: [number, number, number]; mix: number; greenBase: number }> = {
  jade: { rgb: [1, 1, 1], mix: 0, greenBase: 0.08 },
  dore: { rgb: [1.08, 0.94, 0.72], mix: 0.55, greenBase: 0 },
  turquoise: { rgb: [1.04, 1.0, 0.9], mix: 0.4, greenBase: 0.35 },
  cendre: { rgb: [0.82, 0.83, 0.86], mix: 0.6, greenBase: 0 },
  obsidienne: { rgb: [0.7, 0.7, 0.8], mix: 0.6, greenBase: 0 },
};
