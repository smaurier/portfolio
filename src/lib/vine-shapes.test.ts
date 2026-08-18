import { describe, expect, it } from "vitest";
import { generateVineFlowerPlacements, generateVineHelixPath } from "./vine-shapes";

describe("generateVineHelixPath", () => {
  it("part exactement au sol (premier point à y=0)", () => {
    const path = generateVineHelixPath({ height: 1 });
    expect(path[0].y).toBe(0);
  });

  it("atteint la hauteur demandée au sommet", () => {
    const path = generateVineHelixPath({ height: 1 });
    expect(path[path.length - 1].y).toBeCloseTo(1);
  });

  it("garde un rayon d'enroulement constant sans dérive (driftX/Z=0)", () => {
    const path = generateVineHelixPath({ radius: 0.1, driftX: 0, driftZ: 0 });
    for (const p of path) {
      const r = Math.sqrt(p.x ** 2 + p.z ** 2);
      expect(r).toBeCloseTo(0.1, 2);
    }
  });

  it("reste sur la patte à la base même avec une dérive demandée (la dérive s'accélère avec la hauteur)", () => {
    const path = generateVineHelixPath({ radius: 0.1, driftX: 0.6, height: 1 });
    const base = path[0];
    // À la base, la dérive (t²) est nulle : seul l'enroulement (rayon 0.1) compte.
    const baseDistanceFromAxis = Math.sqrt(base.x ** 2 + base.z ** 2);
    expect(baseDistanceFromAxis).toBeCloseTo(0.1, 2);
  });

  it("dérive vers driftX/driftZ en montant (la vigne grimpe puis part vers le corps)", () => {
    const path = generateVineHelixPath({ radius: 0.05, driftX: 0.5, driftZ: 0.3, height: 1 });
    const top = path[path.length - 1];
    // Au sommet, driftEnvelope=1 : x/z doivent être proches de driftX/driftZ
    // (à l'enroulement final près, petit vu le rayon).
    expect(top.x).toBeCloseTo(0.5, 1);
    expect(top.z).toBeCloseTo(0.3, 1);
  });

  it("est déterministe : même options -> mêmes points", () => {
    const options = { seed: 2, driftX: 0.4, height: 0.9 };
    expect(generateVineHelixPath(options)).toEqual(generateVineHelixPath(options));
  });
});

describe("generateVineFlowerPlacements", () => {
  it("donne le nombre de fleurs demandé", () => {
    expect(generateVineFlowerPlacements(3)).toHaveLength(3);
  });

  it("place toutes les fleurs entre 25% et 95% de la hauteur (jamais au ras du sol)", () => {
    for (const flower of generateVineFlowerPlacements(5)) {
      expect(flower.t).toBeGreaterThanOrEqual(0.25);
      expect(flower.t).toBeLessThanOrEqual(0.95);
    }
  });
});
