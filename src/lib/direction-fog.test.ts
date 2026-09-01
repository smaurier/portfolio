import { describe, expect, it } from "vitest";
import { approachFog, DIRECTION_FOG_RANGE, getFogRange } from "./direction-fog";
import type { DirectionKey } from "@/app/components/stag-scene/direction-colors";

const DIRECTIONS = Object.keys(DIRECTION_FOG_RANGE) as DirectionKey[];

describe("DIRECTION_FOG_RANGE", () => {
  it("garde la reference historique 10/34 pour le jade (home, decision 20/08)", () => {
    expect(getFogRange("jade")).toEqual({ near: 10, far: 34 });
  });

  it("donne au Nord le fog le plus dense du site (derogation actee 01/09)", () => {
    const obsidienne = getFogRange("obsidienne");
    for (const dir of DIRECTIONS) {
      if (dir === "obsidienne") continue;
      const range = getFogRange(dir);
      expect(obsidienne.near).toBeLessThan(range.near);
      expect(obsidienne.far).toBeLessThan(range.far);
    }
  });

  it("donne a l'Est l'air le plus limpide (aube claire)", () => {
    const dore = getFogRange("dore");
    for (const dir of DIRECTIONS) {
      if (dir === "dore") continue;
      const range = getFogRange(dir);
      expect(dore.far).toBeGreaterThanOrEqual(range.far);
    }
  });

  it("a near < far pour toutes les directions", () => {
    for (const dir of DIRECTIONS) {
      const { near, far } = getFogRange(dir);
      expect(near).toBeLessThan(far);
      expect(near).toBeGreaterThan(0);
    }
  });
});

describe("approachFog", () => {
  it("rapproche near et far de la cible proportionnellement a alpha", () => {
    const next = approachFog({ near: 10, far: 34 }, { near: 5, far: 18 }, 0.5);
    expect(next.near).toBeCloseTo(7.5);
    expect(next.far).toBeCloseTo(26);
  });

  it("atteint exactement la cible avec alpha 1", () => {
    const next = approachFog({ near: 10, far: 34 }, { near: 5, far: 18 }, 1);
    expect(next).toEqual({ near: 5, far: 18 });
  });

  it("snap sur la cible sous l'epsilon (pas d'asymptote infinie)", () => {
    const next = approachFog({ near: 5.004, far: 18.004 }, { near: 5, far: 18 }, 0.06);
    expect(next).toEqual({ near: 5, far: 18 });
  });

  it("ne depasse jamais la cible", () => {
    let range = { near: 10, far: 34 };
    const target = { near: 5, far: 18 };
    for (let i = 0; i < 300; i++) range = approachFog(range, target, 0.06);
    expect(range.near).toBeGreaterThanOrEqual(target.near);
    expect(range.far).toBeGreaterThanOrEqual(target.far);
    expect(range).toEqual(target);
  });
});
