import { describe, expect, it } from "vitest";
import {
  VEILLE_DELAI_MS,
  VEILLE_GAMME,
  approachVeille,
  deriveVeille,
  noteVeille,
  veilleDue,
} from "./veille";

describe("la veille : le monde qui continue sans nous", () => {
  it("s'ouvre apres la vingtaine de secondes sans geste, pas avant", () => {
    expect(VEILLE_DELAI_MS).toBe(20_000);
    expect(veilleDue(19_999, 0, VEILLE_DELAI_MS)).toBe(false);
    expect(veilleDue(20_000, 0, VEILLE_DELAI_MS)).toBe(true);
    // Un geste a 15 s repousse l'echeance.
    expect(veilleDue(30_000, 15_000, VEILLE_DELAI_MS)).toBe(false);
    expect(veilleDue(35_000, 15_000, VEILLE_DELAI_MS)).toBe(true);
  });

  it("la part de veille entre lentement et sort vite", () => {
    let k = 0;
    // 60 images vers 1 a l'entree : encore loin (la contemplation prend son temps).
    for (let i = 0; i < 60; i++) k = approachVeille(k, 1, 1 / 60);
    expect(k).toBeGreaterThan(0.2);
    expect(k).toBeLessThan(0.8);
    for (let i = 0; i < 1200; i++) k = approachVeille(k, 1, 1 / 60);
    expect(k).toBe(1);
    // Au reveil, presque tout en une seconde, tout en deux.
    for (let i = 0; i < 60; i++) k = approachVeille(k, 0, 1 / 60);
    expect(k).toBeLessThan(0.03);
    for (let i = 0; i < 60; i++) k = approachVeille(k, 0, 1 / 60);
    expect(k).toBe(0);
  });

  it("la derive de la camera est nulle a l'instant zero et continue", () => {
    const d0 = deriveVeille(0);
    expect(d0.azimuth).toBe(0);
    expect(d0.height).toBe(0);
    const d10 = deriveVeille(10);
    const d10b = deriveVeille(10.016);
    // Lente : moins d'un dixieme de radian par seconde, mais elle avance.
    expect(Math.abs(d10.azimuth)).toBeGreaterThan(0);
    expect(Math.abs(d10.azimuth)).toBeLessThan(1);
    expect(Math.abs(d10b.azimuth - d10.azimuth)).toBeLessThan(0.01);
    // La hauteur respire dans une bande etroite.
    for (let t = 0; t < 120; t += 0.5) expect(Math.abs(deriveVeille(t).height)).toBeLessThanOrEqual(0.35);
  });

  it("la melodie reste dans la gamme pentatonique, lente, avec des silences", () => {
    let silences = 0;
    let precedent = -1;
    for (let i = 0; i < 400; i++) {
      const n = noteVeille(i, precedent);
      expect(n.duree).toBeGreaterThanOrEqual(1.2);
      expect(n.duree).toBeLessThanOrEqual(4);
      if (n.degre === null) silences++;
      else {
        expect(n.degre).toBeGreaterThanOrEqual(0);
        expect(n.degre).toBeLessThan(VEILLE_GAMME.length);
        // Jamais de saut de plus de trois degres : une melodie qui marche.
        if (precedent >= 0) expect(Math.abs(n.degre - precedent)).toBeLessThanOrEqual(3);
        expect(n.frequence).toBeGreaterThan(100);
        expect(n.frequence).toBeLessThan(700);
        precedent = n.degre;
      }
    }
    expect(silences).toBeGreaterThan(30);
    expect(silences).toBeLessThan(200);
    // Deterministe : la meme phrase pour le meme index.
    expect(noteVeille(7, 2)).toEqual(noteVeille(7, 2));
  });
});
