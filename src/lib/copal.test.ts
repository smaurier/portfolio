import { describe, expect, it } from "vitest";
import { brazierPositions, COPAL, copalIntensity, puffPose } from "./copal";

describe("brazierPositions : les braseros en bordure de la Piedra", () => {
  it("sont tous sur le meme cercle, hors du disque, et repartis", () => {
    const p = brazierPositions();
    expect(p.length).toBe(COPAL.count);
    for (const b of p) {
      expect(Math.hypot(b.x, b.z)).toBeCloseTo(COPAL.radius, 6);
      expect(Math.hypot(b.x, b.z)).toBeGreaterThan(3); // au-dela de la Piedra
    }
    const angles = p.map((b) => Math.atan2(b.x, b.z)).sort((a, b) => a - b);
    for (let i = 1; i < angles.length; i++) {
      expect(angles[i] - angles[i - 1]).toBeGreaterThan(0.4);
    }
  });

  it("aucun brasero devant le cerf a l'arrivee de la camera (azimut 0)", () => {
    for (const b of brazierPositions()) {
      const az = Math.abs((Math.atan2(b.x, b.z) * 180) / Math.PI);
      expect(az).toBeGreaterThan(20);
    }
  });
});

describe("copalIntensity : l'offrande monte avec le jour", () => {
  it("faible au debut du scroll, pleine a la fin", () => {
    expect(copalIntensity(0, 0)).toBeLessThan(0.25);
    expect(copalIntensity(1, 0)).toBeCloseTo(1, 6);
    expect(copalIntensity(0.5, 0)).toBeGreaterThan(copalIntensity(0.2, 0));
  });

  it("monte sans redescendre", () => {
    let prev = -1;
    for (let p = 0; p <= 1; p += 0.05) {
      const v = copalIntensity(p, 0);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = v;
    }
  });

  it("les feux sont eteints sous le gel, quel que soit le scroll", () => {
    expect(copalIntensity(1, 1)).toBe(0);
    expect(copalIntensity(0.5, 1)).toBe(0);
    // et ils se rallument progressivement au degel
    expect(copalIntensity(1, 0.5)).toBeGreaterThan(0);
    expect(copalIntensity(1, 0.5)).toBeLessThan(1);
  });
});

describe("puffPose : la fumee monte, s'ecarte et se dissipe", () => {
  it("une bouffee part du brasero et monte", () => {
    const a = puffPose(0, 0, 1);
    const b = puffPose(0, 1.5, 1);
    expect(b.y).toBeGreaterThan(a.y);
    expect(a.y).toBeGreaterThanOrEqual(0);
  });

  it("elle grossit et s'efface en montant", () => {
    const young = puffPose(2, 0.2, 1);
    const old = puffPose(2, COPAL.puffLife * 0.9, 1);
    expect(old.size).toBeGreaterThan(young.size);
    expect(old.opacity).toBeLessThan(young.opacity);
    expect(puffPose(2, COPAL.puffLife * 1.5, 1).opacity).toBe(0);
  });

  it("plus l'offrande est forte, plus la colonne monte haut", () => {
    expect(puffPose(1, 2, 1).y).toBeGreaterThan(puffPose(1, 2, 0.3).y);
  });

  it("deux bouffees ne suivent pas la meme derive", () => {
    const a = puffPose(0, 1, 1);
    const b = puffPose(1, 1, 1);
    expect(a.x === b.x && a.z === b.z).toBe(false);
  });
});
