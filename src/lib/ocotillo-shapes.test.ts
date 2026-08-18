import { describe, expect, it } from "vitest";
import {
  generateOcotilloCluster,
  generateOcotilloFlowerPlacements,
  generateOcotilloWandPath,
} from "./ocotillo-shapes";

describe("generateOcotilloWandPath", () => {
  it("part exactement au sol, à la verticale du pied (premier point à 0,0,0)", () => {
    const path = generateOcotilloWandPath({ height: 2 });
    expect(path[0]).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("atteint la hauteur demandée au sommet", () => {
    const path = generateOcotilloWandPath({ height: 2 });
    expect(path[path.length - 1].y).toBeCloseTo(2);
  });

  it("sans balancement, dérive exactement vers leanX/leanZ au sommet", () => {
    const path = generateOcotilloWandPath({
      height: 2,
      leanX: 0.4,
      leanZ: -0.2,
      wobbleAmplitude: 0,
    });
    const top = path[path.length - 1];
    expect(top.x).toBeCloseTo(0.4);
    expect(top.z).toBeCloseTo(-0.2);
  });

  it("reste plantée à la base même avec un penchant demandé (dérive en t²)", () => {
    const path = generateOcotilloWandPath({ height: 1, leanX: 0.6, wobbleAmplitude: 0 });
    // À 25% de la hauteur, t²=0.0625 : la dérive doit rester petite, pas déjà 25% du chemin.
    const quarter = path[Math.round(path.length / 4)];
    expect(Math.abs(quarter.x)).toBeLessThan(0.6 * 0.25);
  });

  it("est déterministe : mêmes options -> mêmes points", () => {
    const options = { seed: 1.7, leanX: 0.3, leanZ: 0.1, height: 2.2 };
    expect(generateOcotilloWandPath(options)).toEqual(generateOcotilloWandPath(options));
  });
});

describe("generateOcotilloCluster", () => {
  it("donne le nombre de tiges demandé", () => {
    expect(generateOcotilloCluster({ wandCount: 7 })).toHaveLength(7);
  });

  it("garde chaque tige dans le rayon d'ouverture demandé", () => {
    const spread = 0.5;
    for (const wand of generateOcotilloCluster({ wandCount: 12, spread })) {
      const radius = Math.sqrt(wand.leanX ** 2 + wand.leanZ ** 2);
      expect(radius).toBeLessThanOrEqual(spread + 1e-9);
    }
  });

  it("garde chaque tige dans la plage de hauteur demandée", () => {
    const minHeight = 1.6;
    const maxHeight = 2.3;
    for (const wand of generateOcotilloCluster({ wandCount: 12, minHeight, maxHeight })) {
      expect(wand.height).toBeGreaterThanOrEqual(minHeight);
      expect(wand.height).toBeLessThanOrEqual(maxHeight);
    }
  });

  it("est déterministe : mêmes options -> mêmes tiges", () => {
    const options = { wandCount: 9, seed: 3.1 };
    expect(generateOcotilloCluster(options)).toEqual(generateOcotilloCluster(options));
  });
});

describe("generateOcotilloFlowerPlacements", () => {
  it("donne le nombre de fleurs demandé", () => {
    expect(generateOcotilloFlowerPlacements(4)).toHaveLength(4);
  });

  it("concentre toutes les fleurs en pointe (jamais avant 85% de la hauteur)", () => {
    for (const flower of generateOcotilloFlowerPlacements(5)) {
      expect(flower.t).toBeGreaterThanOrEqual(0.85);
      expect(flower.t).toBeLessThanOrEqual(1);
    }
  });
});
