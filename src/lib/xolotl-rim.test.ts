import { describe, expect, it } from "vitest";
import { rimCrossing, rimHop } from "./xolotl-rim";

const RIM = { inner: 6.28, outer: 6.78, top: 0.34, reach: 0.5, hop: 0.3 };

describe("rimHop (Xolotl enjambe la margelle du bassin, 03/09)", () => {
  it("loin de la margelle, aucune surelevation", () => {
    expect(rimHop(3, 0, RIM)).toBe(0);
    expect(rimHop(8, 0, RIM)).toBe(0);
  });

  it("sur la pierre, les pattes sont au moins au niveau du dessus de la margelle", () => {
    const ground = -0.2;
    const y = ground + rimHop((RIM.inner + RIM.outer) / 2, ground, RIM);
    expect(y).toBeGreaterThanOrEqual(RIM.top + 0.2);
  });

  it("le saut est un arc : plus haut au milieu de la bande qu'a ses bords", () => {
    const edge = rimHop(RIM.inner - RIM.reach + 0.05, 0, RIM);
    const mid = rimHop((RIM.inner + RIM.outer) / 2, 0, RIM);
    expect(mid).toBeGreaterThan(edge);
    expect(mid).toBeCloseTo(RIM.top + RIM.hop, 2);
  });

  it("continu : pas de marche aux bords de la bande", () => {
    const before = rimHop(RIM.inner - RIM.reach - 0.001, 0, RIM);
    const after = rimHop(RIM.inner - RIM.reach + 0.001, 0, RIM);
    expect(Math.abs(after - before)).toBeLessThan(0.01);
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
