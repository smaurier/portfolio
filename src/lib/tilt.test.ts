import { describe, expect, it } from "vitest";
import { TILT, tiltToParallax } from "./tilt";

describe("tiltToParallax : incliner le telephone remplace la souris", () => {
  it("a plat sur la reference : aucun decalage", () => {
    expect(tiltToParallax({ beta: 40, gamma: 0 }, { beta: 40, gamma: 0 })).toEqual({ x: 0, y: 0 });
  });

  it("gauche/droite (gamma) donne x, avant/arriere (beta) donne y, dans [-1, 1]", () => {
    const r = tiltToParallax({ beta: 40, gamma: TILT.rangeDeg }, { beta: 40, gamma: 0 });
    expect(r.x).toBeCloseTo(1, 9);
    expect(r.y).toBe(0);
    const f = tiltToParallax({ beta: 40 - TILT.rangeDeg, gamma: 0 }, { beta: 40, gamma: 0 });
    expect(f.y).toBeCloseTo(-1, 9);
  });

  it("borne au-dela de la plage, zone morte au centre", () => {
    expect(tiltToParallax({ beta: 40, gamma: 90 }, { beta: 40, gamma: 0 }).x).toBe(1);
    expect(tiltToParallax({ beta: 40, gamma: -90 }, { beta: 40, gamma: 0 }).x).toBe(-1);
    expect(tiltToParallax({ beta: 40, gamma: TILT.deadDeg * 0.5 }, { beta: 40, gamma: 0 }).x).toBe(0);
  });

  it("valeurs nulles (capteur muet) : rien", () => {
    expect(tiltToParallax({ beta: null, gamma: null }, { beta: 40, gamma: 0 })).toEqual({ x: 0, y: 0 });
  });
});
