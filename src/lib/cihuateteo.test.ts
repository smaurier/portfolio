import { describe, expect, it } from "vitest";
import { bearerOpacity, bearerPose, CIHUATETEO, wispRate } from "./cihuateteo";

const sun = { x: 0.6, y: 0.25, z: 0.76 }; // soleil bas, a l'ouest du decor (+x)
const len = Math.hypot(sun.x, sun.y, sun.z);
const sunN = { x: sun.x / len, y: sun.y / len, z: sun.z / len };
const c = CIHUATETEO;

describe("bearerPose : les porteuses descendent avec le soleil puis attendent au carrefour", () => {
  it("avant le coucher, elles flottent du cote du soleil, en eventail", () => {
    for (let i = 0; i < c.count; i++) {
      const p = bearerPose(i, c.count, 0, sunN, 0);
      const d = Math.hypot(p.x, p.y, p.z);
      const dot = (p.x * sunN.x + p.y * sunN.y + p.z * sunN.z) / d;
      expect(dot).toBeGreaterThan(0.9);
      expect(d).toBeGreaterThan(c.escortRadius * 0.8);
      expect(p.y).toBeGreaterThan(1);
    }
    const a = bearerPose(0, c.count, 0, sunN, 0);
    const b = bearerPose(c.count - 1, c.count, 0, sunN, 0);
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(c.escortSpread * (c.count - 1) * 0.9);
  });

  it("le soleil entre dans la terre : elles se posent aux quatre coins du carrefour, face au cerf", () => {
    const seen = new Set<string>();
    for (let i = 0; i < c.count; i++) {
      const p = bearerPose(i, c.count, 1, sunN, 0);
      expect(Math.hypot(p.x, p.z)).toBeCloseTo(c.crossroadsRadius, 6);
      expect(p.y).toBeGreaterThan(c.hoverHeight - c.bobAmplitude - 1e-9);
      expect(p.y).toBeLessThan(c.hoverHeight + c.bobAmplitude + 1e-9);
      // Regard vers l'origine : le lacet pointe vers le cerf.
      const toCentre = Math.atan2(-p.x, -p.z);
      const d = Math.atan2(Math.sin(p.yaw - toCentre), Math.cos(p.yaw - toCentre));
      expect(Math.abs(d)).toBeLessThan(1e-6);
      seen.add(`${Math.round(p.x)},${Math.round(p.z)}`);
    }
    expect(seen.size).toBe(c.count);
  });

  it("entre les deux, une descente continue, sans saut", () => {
    let prev = bearerPose(1, c.count, 0, sunN, 0);
    for (let dusk = 0.02; dusk <= 1; dusk += 0.02) {
      const p = bearerPose(1, c.count, dusk, sunN, 0);
      expect(Math.hypot(p.x - prev.x, p.y - prev.y, p.z - prev.z)).toBeLessThan(1.2);
      prev = p;
    }
  });

  it("elles respirent : un lent flottement vertical, jamais un saut", () => {
    const a = bearerPose(0, c.count, 1, sunN, 0).y;
    const b = bearerPose(0, c.count, 1, sunN, 1 / (4 * c.bobHz)).y;
    expect(Math.abs(a - b)).toBeGreaterThan(0.02);
    expect(Math.abs(a - b)).toBeLessThanOrEqual(c.bobAmplitude + 1e-9);
  });
});

describe("bearerOpacity et wispRate : a peine la, puis presentes dans la nuit", () => {
  it("faibles quand elles portent le soleil, franches au carrefour", () => {
    expect(bearerOpacity(0)).toBeCloseTo(c.opacityEscort, 9);
    expect(bearerOpacity(1)).toBeCloseTo(c.opacityCrossroads, 9);
    expect(bearerOpacity(0.5)).toBeGreaterThan(bearerOpacity(0));
  });

  it("les particules s'echappent d'elles davantage a la nuit", () => {
    expect(wispRate(0)).toBeGreaterThan(0);
    expect(wispRate(1)).toBeGreaterThan(wispRate(0));
  });
});
