import { describe, expect, it } from "vitest";
import { buildParticle, evenSampleLengths, mulberry32, samplesForLength } from "./particle-sampling";

describe("evenSampleLengths", () => {
  it("répartit N longueurs uniformément entre 0 et totalLength (exclu)", () => {
    const lengths = evenSampleLengths(100, 4);
    expect(lengths).toEqual([0, 25, 50, 75]);
  });

  it("renvoie un tableau vide pour un compte ou une longueur nuls/négatifs", () => {
    expect(evenSampleLengths(100, 0)).toEqual([]);
    expect(evenSampleLengths(0, 5)).toEqual([]);
    expect(evenSampleLengths(-10, 5)).toEqual([]);
  });
});

describe("samplesForLength", () => {
  it("est proportionnel à la longueur pour une densité donnée", () => {
    expect(samplesForLength(100, 0.1)).toBe(10);
    expect(samplesForLength(200, 0.1)).toBe(20);
  });

  it("ne descend jamais sous 1 (aucun petit segment perdu)", () => {
    expect(samplesForLength(0.01, 0.1)).toBe(1);
  });
});

describe("mulberry32", () => {
  it("est déterministe pour une même graine", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect(a()).toBe(b());
    expect(a()).toBe(b());
  });

  it("produit des valeurs dans [0, 1[", () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 50; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("deux graines différentes divergent", () => {
    const a = mulberry32(1)();
    const b = mulberry32(2)();
    expect(a).not.toBe(b);
  });
});

describe("buildParticle", () => {
  it("conserve la position d'origine", () => {
    const p = buildParticle(12, 34, mulberry32(1), 10);
    expect(p.homeX).toBe(12);
    expect(p.homeY).toBe(34);
  });

  it("la direction est normalisée (norme ~1)", () => {
    const p = buildParticle(0, 0, mulberry32(1), 10);
    const norm = Math.hypot(p.dirX, p.dirY);
    expect(norm).toBeCloseTo(1, 5);
  });

  it("le délai reste dans [0, 0.6[ (laisse toujours de la marge pour l'animation)", () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 30; i++) {
      const p = buildParticle(0, 0, rng, 10);
      expect(p.delay).toBeGreaterThanOrEqual(0);
      expect(p.delay).toBeLessThan(0.6);
    }
  });

  it("la distance varie autour de la base sans jamais être négative ou nulle", () => {
    const rng = mulberry32(9);
    for (let i = 0; i < 30; i++) {
      const p = buildParticle(0, 0, rng, 10);
      expect(p.distance).toBeGreaterThan(0);
    }
  });
});
