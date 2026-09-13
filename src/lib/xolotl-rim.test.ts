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

describe("le ralenti au bord du bassin (13/09)", () => {
  const rim = { inner: 6.28, outer: 6.78, top: 0.2 };
  it("pleine vitesse loin de la pierre, ralenti dessus, pente douce", async () => {
    const { rimSlowdown, RIM_SLOW_FACTOR, RIM_SLOW_BAND } = await import("./xolotl-rim");
    expect(rimSlowdown(0, rim)).toBe(1);
    expect(rimSlowdown(12, rim)).toBe(1);
    expect(rimSlowdown(6.5, rim)).toBeCloseTo(RIM_SLOW_FACTOR, 6);
    const mi = rimSlowdown(rim.outer + RIM_SLOW_BAND / 2, rim);
    expect(mi).toBeGreaterThan(RIM_SLOW_FACTOR);
    expect(mi).toBeLessThan(1);
  });
});

describe("la traverse ralentie (13/09)", () => {
  const rim = { inner: 6.28, outer: 6.78, top: 0.2 };
  it("part et arrive aux memes points, monotone, et passe plus de temps sur la pierre", async () => {
    const { makeRimWarp } = await import("./xolotl-rim");
    const warp = makeRimWarp(-12, 12, 1.0, rim);
    expect(warp(0)).toBeCloseTo(-12, 6);
    expect(warp(1)).toBeCloseTo(12, 6);
    let prev = warp(0);
    for (let i = 1; i <= 100; i++) {
      const x = warp(i / 100);
      expect(x).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = x;
    }
    // Sans ralenti, x = 0 a t = 0,5 ; avec, on y arrive plus tard qu'a
    // l'entree de la pierre, donc le temps passe sur la pierre est plus long.
    const tSur = (() => { let n = 0; for (let i = 0; i <= 1000; i++) { const r = Math.hypot(warp(i / 1000), 1.0); if (r >= rim.inner && r <= rim.outer) n++; } return n / 1000; })();
    const largeurPierre = (rim.outer - rim.inner) * 2 / 24; // part du chemin, sans ralenti
    expect(tSur).toBeGreaterThan(largeurPierre * 1.3);
  });
});
