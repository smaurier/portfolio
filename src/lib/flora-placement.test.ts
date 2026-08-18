import { describe, expect, it } from "vitest";
import { generateRingPlacements } from "./flora-placement";

describe("generateRingPlacements", () => {
  it("donne le nombre d'emplacements demandé", () => {
    expect(generateRingPlacements(6)).toHaveLength(6);
  });

  it("garde tous les emplacements dans la plage de rayon demandée", () => {
    const options = { minRadius: 5, maxRadius: 10 };
    for (const p of generateRingPlacements(20, options)) {
      const distance = Math.sqrt(p.x ** 2 + p.z ** 2);
      expect(distance).toBeGreaterThanOrEqual(options.minRadius - 0.001);
      expect(distance).toBeLessThanOrEqual(options.maxRadius + 0.001);
    }
  });

  it("garde toutes les échelles dans la plage demandée", () => {
    const options = { minScale: 0.8, maxScale: 1.2 };
    for (const p of generateRingPlacements(20, options)) {
      expect(p.scale).toBeGreaterThanOrEqual(options.minScale - 0.001);
      expect(p.scale).toBeLessThanOrEqual(options.maxScale + 0.001);
    }
  });

  it("ne place jamais deux emplacements consécutifs au même angle (pas d'alignement)", () => {
    const placements = generateRingPlacements(8);
    for (let i = 1; i < placements.length; i++) {
      const a = Math.atan2(placements[i].x, placements[i].z);
      const b = Math.atan2(placements[i - 1].x, placements[i - 1].z);
      const diff = Math.abs(a - b) % (Math.PI * 2);
      expect(diff).toBeGreaterThan(0.1);
    }
  });

  it("est déterministe : même seed -> mêmes emplacements", () => {
    const options = { seed: 4 };
    expect(generateRingPlacements(6, options)).toEqual(generateRingPlacements(6, options));
  });

  it("deux seeds différentes donnent des distributions différentes", () => {
    const a = generateRingPlacements(6, { seed: 0 });
    const b = generateRingPlacements(6, { seed: 5 });
    expect(a).not.toEqual(b);
  });
});
