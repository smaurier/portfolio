import { describe, expect, it } from "vitest";
import {
  CAMBRURE_BANDE,
  CAMBRURE_MAX,
  angleCambrure,
  cambrure,
  distanceALaPierre,
  repartirCambrure,
} from "./xolotl-cambrure";

const RIM = { inner: 6.28, outer: 6.78, top: 0.09 };

describe("la cambrure de Xolotl : le dos qui entre et sort du bassin", () => {
  it("la distance a la pierre est nulle dessus, positive de part et d'autre", () => {
    expect(distanceALaPierre(6.5, RIM)).toBe(0);
    expect(distanceALaPierre(RIM.inner, RIM)).toBe(0);
    expect(distanceALaPierre(RIM.outer, RIM)).toBe(0);
    expect(distanceALaPierre(6, RIM)).toBeCloseTo(0.28);
    expect(distanceALaPierre(7, RIM)).toBeCloseTo(0.22);
  });

  it("loin de la pierre, le dos garde la pose du cycle de marche", () => {
    expect(cambrure(3, -0.4, RIM)).toBe(0);
    expect(cambrure(9, 0.4, RIM)).toBe(0);
  });

  it("le dos s'arrondit en descendant, se tend en sortant", () => {
    const entre = cambrure(RIM.inner, -0.4, RIM);
    const sort = cambrure(RIM.inner, 0.4, RIM);
    expect(entre).toBeLessThan(0);
    expect(sort).toBeGreaterThan(0);
    expect(entre).toBeCloseTo(-sort);
    expect(Math.abs(entre)).toBeCloseTo(1);
  });

  it("a l'arret, aucune cambrure, meme sur la pierre", () => {
    expect(cambrure(6.5, 0, RIM)).toBe(0);
  });

  it("elle retombe continument sur la bande, sans saut", () => {
    let precedent = cambrure(RIM.outer, 0.4, RIM);
    for (let d = 0; d <= CAMBRURE_BANDE + 0.2; d += 0.02) {
      const v = cambrure(RIM.outer + d, 0.4, RIM);
      expect(Math.abs(v - precedent)).toBeLessThan(0.15);
      precedent = v;
    }
    expect(cambrure(RIM.outer + CAMBRURE_BANDE, 0.4, RIM)).toBe(0);
  });

  it("l'angle reste petit : « legerement »", () => {
    expect(angleCambrure(1)).toBe(CAMBRURE_MAX);
    expect((CAMBRURE_MAX * 180) / Math.PI).toBeLessThan(15);
  });

  it("la repartition monte vers les epaules et conserve l'angle total", () => {
    const parts = repartirCambrure(0.2, 5);
    expect(parts).toHaveLength(5);
    expect(parts.reduce((a, b) => a + b, 0)).toBeCloseTo(0.2);
    for (let i = 1; i < parts.length; i++) expect(parts[i]).toBeGreaterThan(parts[i - 1]);
    expect(repartirCambrure(0.2, 0)).toEqual([]);
  });
});
