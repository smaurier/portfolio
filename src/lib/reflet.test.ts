import { describe, expect, it } from "vitest";
import { NEUTRAL_GRADE } from "./direction-grade";
import {
  REFLET,
  REFLET_PAPER,
  approachReflet,
  refletFogColor,
  refletFogRange,
  refletGrade,
  refletK,
  refletLight,
  refletStarOpacity,
} from "./reflet";

describe("le reflet : la scene dans le miroir", () => {
  it("la nuit est k = 0, la face claire k = 1", () => {
    expect(refletK("dark")).toBe(0);
    expect(refletK("light")).toBe(1);
  });

  it("approche exponentielle qui converge vraiment (snap sous epsilon)", () => {
    let k = 0;
    for (let i = 0; i < 200; i++) k = approachReflet(k, 1, 0.06);
    expect(k).toBe(1);
    k = 1;
    for (let i = 0; i < 200; i++) k = approachReflet(k, 0, 0.06);
    expect(k).toBe(0);
    // Sous mouvement reduit on passe alpha 1 : la cible tout de suite.
    expect(approachReflet(0, 1, 1)).toBe(1);
  });

  it("a k = 0, rien ne change (identite : la nuit ne bouge pas d'un poil)", () => {
    const fog = { r: 0, g: 25, b: 16 };
    expect(refletFogColor(fog, 0)).toEqual(fog);
    expect(refletFogRange({ near: 10, far: 34 }, 0)).toEqual({ near: 10, far: 34 });
    expect(refletLight(0)).toEqual({ ambientScale: 1, directionalScale: 1, paperMix: 0 });
    expect(refletGrade(NEUTRAL_GRADE, 0)).toEqual(NEUTRAL_GRADE);
    expect(refletStarOpacity(0)).toBe(1);
  });

  it("a plein reflet, le brouillard est du papier qui garde un souvenir de la direction", () => {
    const c = refletFogColor({ r: 0, g: 25, b: 16 }, 1);
    // Presque le papier, mais pas tout a fait : la teinte de la direction
    // reste dans l'horizon.
    expect(c.r).toBeGreaterThan(200);
    expect(c.r).toBeLessThan(REFLET_PAPER.r);
    expect(c.g).toBeGreaterThan(c.b);
  });

  it("a plein reflet, l'horizon se dissout plus pres (un dessin sur amate) et la lumiere monte", () => {
    const r = refletFogRange({ near: 10, far: 34 }, 1);
    // Le near ne bouge pas : le brouillard ne touche jamais la scene proche.
    expect(r.near).toBe(10);
    expect(r.far).toBeLessThan(34);
    expect(r.near).toBeLessThan(r.far);
    const l = refletLight(1);
    expect(l.ambientScale).toBe(REFLET.ambient);
    expect(l.directionalScale).toBe(REFLET.directional);
    expect(l.paperMix).toBe(REFLET.ambientPaper);
  });

  it("le grade du reflet se compose PAR-DESSUS celui de la direction", () => {
    const nord = { vignetteAdd: 0.1, bloomScale: 0.7, saturation: -0.15 };
    const g = refletGrade(nord, 1);
    expect(g.vignetteAdd).toBeCloseTo(0.1 + REFLET.vignetteAdd);
    expect(g.bloomScale).toBeCloseTo(0.7 * REFLET.bloomScale);
    expect(g.saturation).toBeCloseTo(-0.15 + REFLET.saturation);
    // A mi-chemin, a mi-chemin.
    expect(refletGrade(NEUTRAL_GRADE, 0.5).vignetteAdd).toBeCloseTo(REFLET.vignetteAdd / 2);
  });

  it("les etoiles s'effacent dans le reflet", () => {
    expect(refletStarOpacity(1)).toBe(0);
    expect(refletStarOpacity(0.5)).toBeCloseTo(0.5);
  });
});

import { REFLET_SKY_PAPER, bodiesInInk, fogPaperFor, refletFogColorFor, refletSkyMix } from "./reflet";

describe("le reflet, lot 3 : direction par direction", () => {
  it("l'Ouest et l'Est gardent plus de leur teinte dans la brume", () => {
    expect(fogPaperFor("cendre")).toBeLessThan(fogPaperFor("jade"));
    expect(fogPaperFor("dore")).toBeLessThan(fogPaperFor("jade"));
    expect(fogPaperFor(undefined)).toBe(REFLET.fogPaper);
    const nuit = { r: 120, g: 60, b: 90 };
    const ouest = refletFogColorFor(nuit, 1, "cendre");
    const centre = refletFogColorFor(nuit, 1, "jade");
    // Plus loin du papier a l'Ouest qu'au Centre.
    expect(REFLET_PAPER.r - ouest.r).toBeGreaterThan(REFLET_PAPER.r - centre.r);
    // A k = 0, la nuit, quelle que soit la direction.
    expect(refletFogColorFor(nuit, 0, "cendre")).toEqual(nuit);
  });

  it("le dome de ciel passe dans le papier en gardant un lavis", () => {
    expect(refletSkyMix(0)).toBe(0);
    expect(refletSkyMix(1)).toBe(REFLET_SKY_PAPER);
    expect(REFLET_SKY_PAPER).toBeLessThan(1);
  });

  it("les astres passent a l'encre a mi-reflet", () => {
    expect(bodiesInInk(0)).toBe(false);
    expect(bodiesInInk(0.49)).toBe(false);
    expect(bodiesInInk(0.5)).toBe(true);
    expect(bodiesInInk(1)).toBe(true);
  });
});
