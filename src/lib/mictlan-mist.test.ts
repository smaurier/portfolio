import { describe, expect, it } from "vitest";
import { mistEmitters } from "./mictlan-mist";

describe("mistEmitters (les nappes de brouillard naissent aux bords du bassin, 03/09)", () => {
  it("place N emetteurs dans la couronne rMin..rMax, dans la grille", () => {
    const e = mistEmitters(4.2, 14, 4.6, 6.2, 7);
    expect(e).toHaveLength(14);
    for (const s of e) {
      const x = (s.u - 0.5) * 14;
      const z = (s.v - 0.5) * 14;
      const r = Math.hypot(x, z);
      expect(r).toBeGreaterThanOrEqual(4.6 - 1e-9);
      expect(r).toBeLessThanOrEqual(6.2 + 1e-9);
      expect(s.u).toBeGreaterThan(0);
      expect(s.u).toBeLessThan(1);
      expect(s.v).toBeGreaterThan(0);
      expect(s.v).toBeLessThan(1);
    }
  });

  it("derive tres lente, vers l'interieur (la nappe rampe vers le cerf sans l'atteindre)", () => {
    for (const s of mistEmitters(9, 14, 4.6, 6.2, 7)) {
      const speed = Math.hypot(s.du, s.dv);
      expect(speed).toBeGreaterThan(0);
      expect(speed).toBeLessThan(0.06);
      const inward = -((s.u - 0.5) * s.du + (s.v - 0.5) * s.dv);
      expect(inward).toBeGreaterThan(0);
    }
  });

  it("deterministe et anime : deux instants donnent des positions differentes mais proches", () => {
    const a = mistEmitters(0, 6, 4.6, 6.2, 7);
    const b = mistEmitters(3, 6, 4.6, 6.2, 7);
    expect(mistEmitters(3, 6, 4.6, 6.2, 7)).toEqual(b);
    expect(a[0].u !== b[0].u || a[0].v !== b[0].v).toBe(true);
    expect(Math.hypot(a[0].u - b[0].u, a[0].v - b[0].v)).toBeLessThan(0.1);
  });
});
