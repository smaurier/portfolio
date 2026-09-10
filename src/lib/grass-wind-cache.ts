import { GUST_BANDS, type WindSpec } from "./grass-sim";

/**
 * LE CHAMP DE VENT, PRECALCULE (10/09).
 *
 * Profil processeur du 10/09 sur la page Contact : stepGrassGrid prend
 * 266 ms par seconde, soit 27 % du temps, premier poste du site. La cause
 * n'est pas l'integration du ressort, elle est le VENT : windAt fait six
 * sinus par cellule, sur 4096 cellules, soixante fois par seconde. Un
 * quart de million de sinus par seconde.
 *
 * Or ce champ est un champ qui VOYAGE, sans se deformer :
 *
 *   s = sin( k.along.2pi + phase + sin(across.k.cross).0,8  -  k.speed.2pi.t )
 *       \_________________ constant par cellule : A ______/    \__ omega.t _/
 *
 * Donc s = sin(A).cos(omega.t) - cos(A).sin(omega.t). On garde sin(A) et
 * cos(A) par cellule et par nappe, on calcule cos(omega.t) et sin(omega.t)
 * UNE fois par image et par nappe, et la boucle des 4096 cellules n'a plus
 * un seul appel transcendant : trois multiplications-additions par nappe.
 *
 * Le champ rendu est le meme, et c'est le test qui le dit : l'oracle de ce
 * module est windAt lui-meme, a 1e-4 pres, jusqu'a t = 3600 s.
 *
 * Ce que le cache ne sait pas faire : changer de repere. Il est construit
 * sur des centres de cellules DEJA exprimes dans le repere du vent. Quand
 * le decor tourne (la boussole), l'appelant le reconstruit une fois, ou
 * repasse par windAt tant que l'angle bouge.
 */
export type GustCache = {
  /** Nombre de cellules. */
  n: number;
  /** Nombre de nappes (GUST_BANDS). */
  bands: number;
  /** sin(A) et cos(A) par nappe puis par cellule : [b * n + i]. */
  sinA: Float32Array;
  cosA: Float32Array;
  /** Pulsation de chaque nappe (rad/s). EN DOUBLE : a t = 3600 s, une
   *  erreur relative de flottant simple sur omega deplace la phase de
   *  2,5 milliradians, ce qui sort de la tolerance du test. */
  omega: Float64Array;
  weight: Float32Array;
  strength: number;
  gustAmp: number;
};

/** `centers` : [x0, z0, x1, z1, ...], dans le repere ou vit `spec`. */
export function buildGustCache(centers: Float32Array, spec: WindSpec): GustCache {
  const n = centers.length >> 1;
  const bands = GUST_BANDS.length;
  const sinA = new Float32Array(bands * n);
  const cosA = new Float32Array(bands * n);
  const omega = new Float64Array(bands);
  const weight = new Float32Array(bands);
  for (let b = 0; b < bands; b++) {
    const band = GUST_BANDS[b];
    const k = spec.gustScale * band.freq;
    omega[b] = k * spec.gustSpeed * Math.PI * 2;
    weight[b] = band.weight;
    const base = b * n;
    for (let i = 0; i < n; i++) {
      const x = centers[2 * i];
      const z = centers[2 * i + 1];
      const along = x * spec.dirX + z * spec.dirZ;
      const across = -x * spec.dirZ + z * spec.dirX;
      const a = k * along * Math.PI * 2 + band.phase + Math.sin(across * k * band.cross) * 0.8;
      sinA[base + i] = Math.sin(a);
      cosA[base + i] = Math.cos(a);
    }
  }
  return { n, bands, sinA, cosA, omega, weight, strength: spec.strength, gustAmp: spec.gustAmp };
}

/** Les deux trigonometries de l'instant t, par nappe : [cos, sin] * bands.
 *  Une fois par image, pas une fois par cellule. */
export function gustTrig(cache: GustCache, t: number, out: Float32Array): void {
  for (let b = 0; b < cache.bands; b++) {
    const wt = cache.omega[b] * t;
    out[2 * b] = Math.cos(wt);
    out[2 * b + 1] = Math.sin(wt);
  }
}

/** La magnitude du vent sur la cellule i. La direction, elle, est celle du
 *  spec : elle ne depend ni de la cellule ni du temps. */
export function gustMagnitude(cache: GustCache, i: number, trig: Float32Array): number {
  if (!(cache.gustAmp > 0)) return cache.strength;
  let gust = 0;
  for (let b = 0; b < cache.bands; b++) {
    const base = b * cache.n;
    // Les creux sont des accalmies, pas des contre-vents (cf. windAt).
    const s = cache.sinA[base + i] * trig[2 * b] - cache.cosA[base + i] * trig[2 * b + 1];
    if (s > 0) gust += cache.weight[b] * s;
  }
  return cache.strength + cache.gustAmp * gust;
}
