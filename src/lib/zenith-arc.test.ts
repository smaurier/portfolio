import { describe, expect, it } from "vitest";
import { COLUMN_START, columnRise, ZENITH_MAX_DEG, ZENITH_START, zenithElevation, zenithTargetY } from "./zenith-arc";

/**
 * L'arc vertical du Centre. L'ecueil est nomme dans le plan : camera.up
 * n'est jamais touche dans le projet, donc viser la verticale fait
 * degenerer lookAt et se lit comme un roulis brutal dans les derniers
 * degres. Le plafond a 78 degres n'est pas un reglage, c'est une garde.
 */
const R = 4.5; // endRadius
const CY = 2.0; // endHeight
const REST = 1.0; // targetY

const deg = (rad: number) => (rad * 180) / Math.PI;

describe("zenithElevation (le regard qui se leve)", () => {
  it("ne bouge pas avant le debut de l'arc", () => {
    for (const p of [0, 0.3, 0.6, ZENITH_START]) {
      expect(deg(zenithElevation(p, R, CY, REST))).toBeCloseTo(deg(Math.atan2(REST - CY, R)), 9);
    }
  });

  it("ne depasse JAMAIS le plafond, meme si le scroll deborde", () => {
    for (let i = 0; i <= 240; i++) {
      const p = (i / 200) * 1.2; // jusqu'a 1,2 : le scroll reel deborde
      expect(deg(zenithElevation(p, R, CY, REST))).toBeLessThanOrEqual(ZENITH_MAX_DEG + 1e-9);
    }
  });

  it("atteint exactement le plafond en fin d'arc", () => {
    expect(deg(zenithElevation(1, R, CY, REST))).toBeCloseTo(ZENITH_MAX_DEG, 9);
  });

  it("monte sans jamais redescendre", () => {
    let prev = -Infinity;
    for (let i = 0; i <= 200; i++) {
      const e = zenithElevation(i / 200, R, CY, REST);
      expect(e).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = e;
    }
  });
});

describe("zenithTargetY (le point vise sur l'axe du monde)", () => {
  it("rend la cible de repos tant que l'arc n'a pas commence", () => {
    expect(zenithTargetY(0.5, R, CY, REST)).toBeCloseTo(REST, 12);
    expect(zenithTargetY(ZENITH_START, R, CY, REST)).toBeCloseTo(REST, 12);
  });

  it("ne fait aucun saut au demarrage de l'arc", () => {
    const avant = zenithTargetY(ZENITH_START, R, CY, REST);
    const apres = zenithTargetY(ZENITH_START + 1e-4, R, CY, REST);
    expect(Math.abs(apres - avant)).toBeLessThan(1e-3);
  });

  it("place la cible a la hauteur qui tient l'elevation demandee", () => {
    const y = zenithTargetY(1, R, CY, REST);
    expect(deg(Math.atan2(y - CY, R))).toBeCloseTo(ZENITH_MAX_DEG, 6);
    // Concretement : une colonne de fumee vue tres haut sur l'axe.
    expect(y).toBeGreaterThan(20);
  });

  it("ne degenere pas si la camera passe sur l'axe du monde", () => {
    // Rayon nul : l'elevation n'a plus de sens (tan explose). On rend le
    // repos plutot qu'un infini qui ferait disparaitre la scene.
    const y = zenithTargetY(1, 0, CY, REST);
    expect(Number.isFinite(y)).toBe(true);
    expect(y).toBeCloseTo(REST, 12);
  });
});

describe("columnRise (la colonne de fumee)", () => {
  it("commence AVANT le regard : l'oeil doit avoir quelque chose a suivre", () => {
    expect(COLUMN_START).toBeLessThan(ZENITH_START);
  });

  it("est nulle avant son debut, pleine a la fin", () => {
    expect(columnRise(0)).toBe(0);
    expect(columnRise(COLUMN_START)).toBe(0);
    expect(columnRise(1)).toBeCloseTo(1, 12);
  });

  it("monte sans redescendre, et ne depasse pas un", () => {
    let prev = -1;
    for (let i = 0; i <= 200; i++) {
      const v = columnRise((i / 200) * 1.2);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-12);
      expect(v).toBeLessThanOrEqual(1);
      prev = v;
    }
  });
});
