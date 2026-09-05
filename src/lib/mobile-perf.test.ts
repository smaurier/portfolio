import { describe, expect, it } from "vitest";
import { getPerfProfile } from "./mobile-perf";

describe("getPerfProfile", () => {
  it("allège le rendu sous le seuil mobile (768px)", () => {
    const profile = getPerfProfile(375);
    expect(profile.postFx).toBe(false);
    expect(profile.dprCap).toBeLessThan(2);
  });

  it("garde le rendu complet au-dessus du seuil mobile", () => {
    const profile = getPerfProfile(1440);
    expect(profile.postFx).toBe(true);
    expect(profile.dprCap).toBe(2);
  });

  it("traite exactement 768px comme desktop (seuil exclusif côté mobile)", () => {
    expect(getPerfProfile(768).postFx).toBe(true);
  });

  it("767px reste mobile", () => {
    expect(getPerfProfile(767).postFx).toBe(false);
  });

  it("une largeur pas encore mesurée (0, avant hydratation) ne dégrade pas le rendu", () => {
    // Évite un flash "version allégée" pendant l'hydratation avant que la
    // vraie largeur de viewport ne soit lue côté client.
    expect(getPerfProfile(0).postFx).toBe(true);
  });

  it("le dprCap mobile reste strictement positif", () => {
    expect(getPerfProfile(320).dprCap).toBeGreaterThan(0);
  });

  it("le mode eco force le repli, meme sur ordi (05/09, controles de scene)", () => {
    const eco = getPerfProfile(1440, true);
    expect(eco.postFx).toBe(false);
    expect(eco.shadows).toBe(false);
    expect(eco.dprCap).toBe(1);
    expect(eco.bladeCount).toBeLessThan(getPerfProfile(1440).bladeCount);
    expect(getPerfProfile(1440).shadows).toBe(true);
    expect(getPerfProfile(375).shadows).toBe(false);
  });
});
