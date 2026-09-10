import { describe, expect, it } from "vitest";
import { GRASS_WIND_BY_DIRECTION, windAt } from "./grass-sim";
import { buildGustCache, gustMagnitude, gustTrig } from "./grass-wind-cache";

/**
 * L'oracle de ce module est windAt lui-meme : le cache doit rendre le MEME
 * champ de vent, sinon il n'a aucun droit de le remplacer. Tout le reste
 * (la vitesse) ne vaut rien si cette egalite n'est pas tenue.
 */
const cellules = (n: number): Float32Array => {
  const out = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    // Reparties dans [-17, 17]^2, l'etendue reelle de la grille, sans
    // random : un test qui echoue doit echouer a chaque fois.
    out[2 * i] = -17 + (34 * ((i * 7919) % 997)) / 997;
    out[2 * i + 1] = -17 + (34 * ((i * 6271) % 991)) / 991;
  }
  return out;
};

describe("buildGustCache (le champ de vent precalcule)", () => {
  it("rend exactement le champ de windAt, sur les cinq directions", () => {
    const pts = cellules(40);
    for (const [nom, spec] of Object.entries(GRASS_WIND_BY_DIRECTION)) {
      const cache = buildGustCache(pts, spec);
      const trig = new Float32Array(cache.bands * 2);
      for (const t of [0, 0.37, 1.5, 9.25, 60.1, 3600]) {
        gustTrig(cache, t, trig);
        for (let i = 0; i < 40; i++) {
          const ref = windAt(pts[2 * i], pts[2 * i + 1], t, spec);
          const attendu = Math.hypot(ref.x, ref.z);
          const obtenu = gustMagnitude(cache, i, trig);
          expect(Math.abs(obtenu - attendu), nom + " cellule " + i + " a t=" + t).toBeLessThan(1e-4);
        }
      }
    }
  });

  it("sans rafales, la magnitude est la brise de fond, exactement", () => {
    const pts = cellules(5);
    const spec = { ...GRASS_WIND_BY_DIRECTION.jade, gustAmp: 0 };
    const cache = buildGustCache(pts, spec);
    const trig = new Float32Array(cache.bands * 2);
    gustTrig(cache, 12.5, trig);
    for (let i = 0; i < 5; i++) expect(gustMagnitude(cache, i, trig)).toBeCloseTo(spec.strength, 12);
  });

  it("les nappes VOYAGENT : le champ a t + T vaut celui decale de speed * T le long du vent", () => {
    const spec = GRASS_WIND_BY_DIRECTION.cendre;
    const T = 1.3;
    const d = spec.gustSpeed * T;
    // Deux cellules : la seconde est la premiere avancee dans le sens du vent.
    const pts = new Float32Array([2.5, -4, 2.5 + spec.dirX * d, -4 + spec.dirZ * d]);
    const cache = buildGustCache(pts, spec);
    const trig = new Float32Array(cache.bands * 2);
    gustTrig(cache, 7 + T, trig);
    const avale = gustMagnitude(cache, 1, trig);
    gustTrig(cache, 7, trig);
    const amont = gustMagnitude(cache, 0, trig);
    expect(avale).toBeCloseTo(amont, 4);
  });

  it("le signe du temps n'est pas inverse : comparer a windAt a un instant non nul suffit a le voir", () => {
    const spec = GRASS_WIND_BY_DIRECTION.turquoise;
    const pts = new Float32Array([3, 5]);
    const cache = buildGustCache(pts, spec);
    const trig = new Float32Array(cache.bands * 2);
    gustTrig(cache, 2.2, trig);
    const ref = windAt(3, 5, 2.2, spec);
    const inverse = windAt(3, 5, -2.2, spec);
    expect(gustMagnitude(cache, 0, trig)).toBeCloseTo(Math.hypot(ref.x, ref.z), 4);
    // Le champ n'est pas symetrique en t : sinon le test precedent ne prouverait rien.
    expect(Math.hypot(ref.x, ref.z)).not.toBeCloseTo(Math.hypot(inverse.x, inverse.z), 3);
  });
});
