import { describe, expect, it } from "vitest";
import { EAST_MILPA, eastMilpaPose, milpaRing } from "./milpa-frost";

describe("milpaRing : a l'Est, la milpa passe du centre a la bordure de la Piedra", () => {
  it("garde les directions des plants du centre, mais au rayon de la bordure", () => {
    const centre: [number, number][] = [
      [0.54, 0.48],
      [-0.54, 0.54],
      [0.61, -0.51],
      [-0.48, -0.58],
    ];
    const ring = milpaRing(centre);
    expect(ring.length).toBe(centre.length);
    ring.forEach(([x, z], i) => {
      const [cx, cz] = centre[i];
      // Meme azimut.
      expect(Math.atan2(x, z)).toBeCloseTo(Math.atan2(cx, cz), 6);
      // Sur la bordure : au-dela du disque, pas au milieu.
      expect(Math.hypot(x, z)).toBeCloseTo(EAST_MILPA.ringRadius, 6);
    });
  });

  it("le rayon de bordure est hors du disque de la Piedra (3 u) mais proche", () => {
    expect(EAST_MILPA.ringRadius).toBeGreaterThan(3);
    expect(EAST_MILPA.ringRadius).toBeLessThan(4);
  });
});

describe("eastMilpaPose : gelee couchee et petite, elle ne se releve qu'apres le degel", () => {
  it("sous le gel : petite, couchee, quelle que soit la pousse du scroll", () => {
    for (const growth of [0, 0.5, 1]) {
      const p = eastMilpaPose(growth, 1);
      expect(p.growth).toBeCloseTo(EAST_MILPA.frozenGrowth, 6);
      expect(p.bend).toBeCloseTo(EAST_MILPA.frozenBend, 6);
    }
  });

  it("degelee : la pousse du scroll reprend et la tige se redresse", () => {
    const p = eastMilpaPose(1, 0);
    expect(p.growth).toBe(1);
    expect(p.bend).toBe(0);
  });

  it("ne descend jamais sous la taille gelee, meme si le scroll est au debut", () => {
    const p = eastMilpaPose(0, 0);
    expect(p.growth).toBeGreaterThanOrEqual(EAST_MILPA.frozenGrowth);
  });

  it("le degel est continu : pas de saut entre gele et degele", () => {
    let prev = eastMilpaPose(1, 1);
    for (let frost = 1; frost >= 0; frost -= 0.05) {
      const p = eastMilpaPose(1, frost);
      expect(Math.abs(p.growth - prev.growth)).toBeLessThan(0.2);
      expect(Math.abs(p.bend - prev.bend)).toBeLessThan(0.25);
      prev = p;
    }
  });

  it("elle se releve en meme temps qu'elle pousse (le soleil fait les deux)", () => {
    const mid = eastMilpaPose(1, 0.5);
    expect(mid.growth).toBeGreaterThan(EAST_MILPA.frozenGrowth);
    expect(mid.growth).toBeLessThan(1);
    expect(mid.bend).toBeGreaterThan(0);
    expect(mid.bend).toBeLessThan(EAST_MILPA.frozenBend);
  });
});
