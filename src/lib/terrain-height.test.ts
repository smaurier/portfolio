import { describe, expect, it } from "vitest";
import { BLEND_RADIUS, FLAT_RADIUS, getTerrainHeight } from "./terrain-height";

describe("getTerrainHeight", () => {
  it("reste parfaitement plat (0) au centre et dans tout le rayon plat", () => {
    expect(getTerrainHeight(0, 0)).toBeCloseTo(0);
    expect(getTerrainHeight(FLAT_RADIUS - 0.5, 0)).toBeCloseTo(0);
    expect(getTerrainHeight(0, -(FLAT_RADIUS - 0.1))).toBeCloseTo(0);
  });

  it("n'est plus forcément plat au-delà du rayon plat (dunes)", () => {
    const samples = [
      getTerrainHeight(BLEND_RADIUS + 1, 0),
      getTerrainHeight(0, BLEND_RADIUS + 3),
      getTerrainHeight(BLEND_RADIUS + 5, BLEND_RADIUS + 2),
    ];
    expect(samples.some((h) => h !== 0)).toBe(true);
  });

  it("est déterministe : même point -> même hauteur", () => {
    expect(getTerrainHeight(12.3, -7.8)).toBe(getTerrainHeight(12.3, -7.8));
  });

  it("varie continûment (pas de saut brutal) à la frontière du rayon plat", () => {
    const justBefore = getTerrainHeight(FLAT_RADIUS - 0.05, 0);
    const justAfter = getTerrainHeight(FLAT_RADIUS + 0.05, 0);
    expect(Math.abs(justAfter - justBefore)).toBeLessThan(0.05);
  });

  it("s'élève nettement au sommet du Popocatépetl (azimuth opposé au climax du face-à-face, rayon 16)", () => {
    // Azimuth calculé comme dans terrain-height.ts : climaxProgress=0.75 -> azimuth caméra
    // 0.75*2π, montagnes à l'opposé (+π), rayon 16, décalage local du Popo (-6.5,0).
    const azimuth = 0.75 * Math.PI * 2 + Math.PI;
    const radius = 16;
    const rotation = azimuth + Math.PI;
    const centerX = radius * Math.sin(azimuth);
    const centerZ = radius * Math.cos(azimuth);
    // Décalage local (-6.5, 0) tourné par `rotation` pour retrouver le monde.
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const worldOffsetX = -6.5 * cos + 0 * sin;
    const worldOffsetZ = -(-6.5) * sin + 0 * cos;
    const height = getTerrainHeight(centerX + worldOffsetX, centerZ + worldOffsetZ);
    expect(height).toBeGreaterThan(4);
  });

  it("reste bas loin de toute montagne nommée ou générique (juste les dunes)", () => {
    // Point choisi loin de l'azimuth des montagnes nommées (0.75*2π+π) et
    // suffisamment proche du centre pour ne croiser aucun pic générique
    // (rayon 18-30) : seules les dunes proches s'appliquent.
    const height = getTerrainHeight(10, 0);
    expect(Math.abs(height)).toBeLessThan(2);
  });
});
