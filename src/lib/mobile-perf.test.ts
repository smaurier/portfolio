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
});
