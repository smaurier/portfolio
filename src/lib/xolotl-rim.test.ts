import { describe, expect, it } from "vitest";
import { rimCrossing, rimSurface } from "./xolotl-rim";

const RIM = { inner: 6.28, outer: 6.78, top: 0.34 };

describe("rimSurface (le relief de la margelle sous les pattes)", () => {
  it("dans le bassin, loin de la pierre : le sol", () => {
    expect(rimSurface(3, -0.1, RIM)).toBeCloseTo(-0.1, 12);
  });

  it("dehors, loin de la pierre : le sol", () => {
    expect(rimSurface(9, -0.1, RIM)).toBeCloseTo(-0.1, 12);
  });

  it("au-dessus de la pierre : le dessus de la pierre, quel que soit le sol", () => {
    const middle = (RIM.inner + RIM.outer) / 2;
    expect(rimSurface(middle, 0, RIM)).toBeCloseTo(RIM.top, 12);
    expect(rimSurface(middle, -0.3, RIM)).toBeCloseTo(RIM.top, 12);
  });

  it("continue : pas de saut d'appui d'une frame a l'autre", () => {
    let prev = rimSurface(5.5, 0, RIM);
    for (let r = 5.5; r < 7.5; r += 0.01) {
      const h = rimSurface(r, 0, RIM);
      expect(Math.abs(h - prev)).toBeLessThan(0.05);
      prev = h;
    }
  });

  it("l'appui monte en abordant la pierre et redescend en la quittant", () => {
    expect(rimSurface(RIM.inner - 0.2, 0, RIM)).toBeLessThan(rimSurface(RIM.inner + 0.2, 0, RIM));
    expect(rimSurface(RIM.outer + 0.2, 0, RIM)).toBeLessThan(rimSurface(RIM.outer - 0.2, 0, RIM));
  });

  it("sol plus haut que la pierre : la pierre ne creuse rien", () => {
    const middle = (RIM.inner + RIM.outer) / 2;
    expect(rimSurface(middle, 1, RIM)).toBeCloseTo(1, 12);
  });
});

describe("rimCrossing (entree et sortie de l'eau)", () => {
  it("passe de la pierre a l'eau : entree", () => {
    expect(rimCrossing(6.5, 6.1, RIM)).toBe("enter");
  });
  it("passe de l'eau a la pierre : sortie", () => {
    expect(rimCrossing(6.1, 6.5, RIM)).toBe("exit");
  });
  it("reste du meme cote : rien", () => {
    expect(rimCrossing(6.0, 5.5, RIM)).toBeNull();
    expect(rimCrossing(7.0, 6.6, RIM)).toBeNull();
  });
});
