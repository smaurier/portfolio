import { describe, expect, it } from "vitest";
import { generateGenericPeakProfile, generateMountainRangePlacements } from "./mountain-range";

describe("generateMountainRangePlacements", () => {
  it("donne le nombre de pics demandé", () => {
    expect(generateMountainRangePlacements(12)).toHaveLength(12);
  });

  it("garde chaque pic dans la plage de rayon demandée (distance non homogène)", () => {
    const minRadius = 18;
    const maxRadius = 30;
    const placements = generateMountainRangePlacements(16, { minRadius, maxRadius });
    for (const p of placements) {
      expect(p.radius).toBeGreaterThanOrEqual(minRadius);
      expect(p.radius).toBeLessThanOrEqual(maxRadius);
    }
  });

  it("ne retombe pas tous sur le même rayon (vraiment non homogène, pas juste dans la plage)", () => {
    const placements = generateMountainRangePlacements(10, { minRadius: 18, maxRadius: 30 });
    const radii = new Set(placements.map((p) => p.radius));
    expect(radii.size).toBeGreaterThan(1);
  });

  it("répartit les pics sur un tour complet (azimuth couvre ~0 à ~2π)", () => {
    const placements = generateMountainRangePlacements(12);
    const azimuths = placements.map((p) => p.azimuth);
    expect(Math.min(...azimuths)).toBeLessThan(Math.PI / 2);
    expect(Math.max(...azimuths)).toBeGreaterThan((3 * Math.PI) / 2);
  });

  it("est déterministe : mêmes options -> mêmes pics", () => {
    const options = { seed: 4.2, minRadius: 20, maxRadius: 28 };
    expect(generateMountainRangePlacements(9, options)).toEqual(
      generateMountainRangePlacements(9, options),
    );
  });
});

describe("generateGenericPeakProfile", () => {
  it("part et finit au sol (y=0 aux deux extrémités)", () => {
    const profile = generateGenericPeakProfile(1);
    expect(profile[0].y).toBe(0);
    expect(profile[profile.length - 1].y).toBe(0);
  });

  it("donne le nombre de points demandé", () => {
    expect(generateGenericPeakProfile(1, 8)).toHaveLength(8);
  });

  it("le sommet (point médian) est strictement au-dessus du sol", () => {
    const profile = generateGenericPeakProfile(2, 7);
    const middle = profile[Math.floor(profile.length / 2)];
    expect(middle.y).toBeGreaterThan(0);
  });

  it("est déterministe : même seed -> même profil", () => {
    expect(generateGenericPeakProfile(3.5)).toEqual(generateGenericPeakProfile(3.5));
  });

  it("deux seeds différentes donnent des profils différents (silhouette pas répétitive)", () => {
    expect(generateGenericPeakProfile(1)).not.toEqual(generateGenericPeakProfile(2));
  });
});
