import { describe, expect, it } from "vitest";
import { SUD_CAMERA, sudCamera } from "./sud-camera";

describe("sudCamera : la camera du Sud monte avec le soleil", () => {
  it("la nuit : basse, regard leve (contre-plongee), focale serree", () => {
    const c = sudCamera(0, 0);
    expect(c.height).toBe(SUD_CAMERA.heightNight);
    expect(c.targetLift).toBe(SUD_CAMERA.targetLiftNight);
    expect(c.fov).toBe(SUD_CAMERA.fovNight);
    expect(c.height).toBeLessThan(0);
    expect(c.targetLift).toBeGreaterThan(0.5);
  });

  it("au zenith : haute, regard baisse sur la Piedra (plongee douce), focale ouverte", () => {
    const c = sudCamera(1, 0);
    expect(c.height).toBeCloseTo(SUD_CAMERA.heightNoon, 9);
    expect(c.targetLift).toBeCloseTo(SUD_CAMERA.targetLiftNoon, 9);
    expect(c.fov).toBeCloseTo(SUD_CAMERA.fovNoon, 9);
    expect(c.height).toBeGreaterThan(1);
    expect(c.targetLift).toBeLessThan(SUD_CAMERA.targetLiftNight);
    expect(c.fov).toBeGreaterThan(SUD_CAMERA.fovNight);
  });

  it("la montee est monotone et lisse (pas de saut) le long du jour", () => {
    let prev = sudCamera(0, 0);
    for (let k = 1; k <= 40; k++) {
      const c = sudCamera(k / 40, 0);
      expect(c.height).toBeGreaterThanOrEqual(prev.height - 1e-12);
      expect(c.targetLift).toBeLessThanOrEqual(prev.targetLift + 1e-12);
      expect(c.fov).toBeGreaterThanOrEqual(prev.fov - 1e-12);
      // pas plus de 6 % de la course par pas de 1/40
      expect(Math.abs(c.height - prev.height)).toBeLessThan((SUD_CAMERA.heightNoon - SUD_CAMERA.heightNight) * 0.06);
      prev = c;
    }
  });

  it("la frappe donne un coup de focale, qui disparait avec le feu", () => {
    const base = sudCamera(0.9, 0).fov;
    expect(sudCamera(0.9, 1).fov).toBeCloseTo(base + SUD_CAMERA.fovStrikeKick, 9);
    expect(sudCamera(0.9, 0.5).fov).toBeCloseTo(base + SUD_CAMERA.fovStrikeKick * 0.5, 9);
    expect(sudCamera(0.9, 0).fov).toBe(base);
  });

  it("le jour est borne : hors de [0, 1] on reste aux extremes", () => {
    expect(sudCamera(-2, 0)).toEqual(sudCamera(0, 0));
    expect(sudCamera(7, 0)).toEqual(sudCamera(1, 0));
  });
});
