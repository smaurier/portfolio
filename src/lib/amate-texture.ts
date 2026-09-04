/**
 * Le papier amate (04/09, Sylvain : "sans mettre de glyphe, je veux que
 * ca ressemble davantage a ce que c'est cense representer, ici on dirait
 * un vulgaire papier blanc").
 *
 * L'amatl est un papier d'ECORCE battue (ficus, morus), pas une feuille
 * lisse : une pate de fibres martelees, a la surface irreguliere, striee
 * dans le sens des fibres, tachetee, aux bords effiloches, d'un ton
 * creme-ocre tirant vers le brun selon l'ecorce. Dans les offrandes, les
 * papiers etaient ECLABOUSSES de caoutchouc liquide (ulli), gouttes
 * noires irregulieres attestees dans les sources (Sahagun, offrandes de
 * papier "goutte de hule"). Aucun glyphe : le projet a ecarte les signes
 * inventes (voie anti-appropriation, 28/08).
 *
 * Ce module est la partie PURE : une fonction de motif (u, v, graine) ->
 * couleur + alpha, deterministe, testable sans canvas ni WebGL. Le
 * composant l'echantillonne dans une DataTexture. `u` court le long de la
 * bande (le sens des fibres), `v` en travers.
 */

export type Rgba = { r: number; g: number; b: number; a: number };

export type AmateOptions = {
  /** Nombre de gouttes de caoutchouc sur la bande (0 = papier nu). */
  spatters: number;
  /** Largeur de l'effilochage des bords, en fraction de v. */
  fray: number;
};

export const AMATE_OPTIONS: AmateOptions = { spatters: 7, fray: 0.12 };

const BASE = { r: 0.83, g: 0.74, b: 0.56 }; // creme-ocre
const BARK = { r: 0.5, g: 0.36, b: 0.22 }; // brun d'ecorce
const RUBBER = { r: 0.08, g: 0.06, b: 0.05 }; // hule, presque noir

function hash(x: number, y: number, seed: number): number {
  const v = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return v - Math.floor(v);
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Bruit de valeur 2D lisse, dans [0, 1]. */
function noise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = smooth(x - x0);
  const fy = smooth(y - y0);
  const a = hash(x0, y0, seed);
  const b = hash(x0 + 1, y0, seed);
  const c = hash(x0, y0 + 1, seed);
  const d = hash(x0 + 1, y0 + 1, seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Couleur et alpha du papier au point (u, v) de la bande. */
export function amatePattern(u: number, v: number, seed: number, options: AmateOptions = AMATE_OPTIONS): Rgba {
  // Fibres : stries longues dans le sens de u, fines en v. Le bruit est
  // tres etire le long de u (une fibre court sur toute la bande).
  const fibre = noise(u * 3, v * 42, seed) * 0.6 + noise(u * 9, v * 120, seed + 1) * 0.4;
  // Pate irreguliere : taches larges, plus sombres la ou l'ecorce domine.
  const mottle = noise(u * 4 + 7, v * 3 + 3, seed + 2);
  const bark = clamp01(0.25 + 0.55 * mottle + 0.35 * (fibre - 0.5));
  let r = BASE.r + (BARK.r - BASE.r) * bark * 0.75;
  let g = BASE.g + (BARK.g - BASE.g) * bark * 0.75;
  let b = BASE.b + (BARK.b - BASE.b) * bark * 0.75;
  // Martelage : grain fin qui casse toute surface lisse. Lui aussi etire
  // dans le sens des fibres (cellules longues en u, courtes en v) : une
  // ecorce battue reste striee jusque dans son grain.
  const grain = (hash(Math.floor(u * 70), Math.floor(v * 220), seed + 3) - 0.5) * 0.08;
  r += grain;
  g += grain;
  b += grain;

  // Gouttes de hule : disques irreguliers, bords baveux.
  for (let i = 0; i < options.spatters; i++) {
    const cx = hash(i, 1, seed + 5);
    const cy = 0.15 + 0.7 * hash(i, 2, seed + 5);
    const radius = 0.012 + 0.03 * hash(i, 3, seed + 5);
    const dx = (u - cx) * 1; // meme echelle en u et v : la bande est 1:1 dans la texture
    const dy = (v - cy) * 0.35; // la bande est plus longue que large
    const wobble = 1 + 0.35 * (noise(u * 60 + i * 9, v * 60, seed + 6) - 0.5);
    const d = Math.hypot(dx, dy) / (radius * wobble);
    if (d < 1) {
      const k = clamp01((1 - d) * 4);
      r += (RUBBER.r - r) * k;
      g += (RUBBER.g - g) * k;
      b += (RUBBER.b - b) * k;
    }
  }

  // Bords effiloches : alpha qui se dechire pres de v = 0 et v = 1, et
  // au bout libre de la bande (u = 1), avec un contour dentele.
  const edgeNoise = noise(u * 40, v * 6, seed + 4);
  const fray = options.fray * (0.6 + 0.8 * edgeNoise);
  const edgeDist = Math.min(v, 1 - v);
  let a = clamp01(edgeDist / Math.max(1e-6, fray));
  const tipNoise = noise(u * 12, v * 30, seed + 7);
  const tipFray = 0.06 * (0.5 + tipNoise);
  a *= clamp01((1 - u) / tipFray);
  return { r: clamp01(r), g: clamp01(g), b: clamp01(b), a };
}

/** Echantillonne la bande dans un tampon RGBA 8 bits, `width` colonnes le
 *  long des fibres, `height` lignes en travers. Rangees du bas vers le
 *  haut (convention des textures WebGL). */
export function bakeAmate(width: number, height: number, seed: number, options: AmateOptions = AMATE_OPTIONS): Uint8Array {
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const v = (y + 0.5) / height;
    for (let x = 0; x < width; x++) {
      const u = (x + 0.5) / width;
      const px = amatePattern(u, v, seed, options);
      const o = (y * width + x) * 4;
      data[o] = Math.round(px.r * 255);
      data[o + 1] = Math.round(px.g * 255);
      data[o + 2] = Math.round(px.b * 255);
      data[o + 3] = Math.round(px.a * 255);
    }
  }
  return data;
}
