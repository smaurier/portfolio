import { describe, expect, it } from "vitest";
import { SEUIL_TETE, seuilTeteOpacity } from "./seuil-tete";

describe("la ligne de seuil en tete de page (13/09)", () => {
  it("pleine au debut, effacee apres le premier quart, lisse entre les deux", () => {
    expect(seuilTeteOpacity(0)).toBe(1);
    expect(seuilTeteOpacity(SEUIL_TETE.holdUntil)).toBe(1);
    expect(seuilTeteOpacity(SEUIL_TETE.goneAt)).toBe(0);
    expect(seuilTeteOpacity(1)).toBe(0);
    const milieu = seuilTeteOpacity((SEUIL_TETE.holdUntil + SEUIL_TETE.goneAt) / 2);
    expect(milieu).toBeGreaterThan(0.4);
    expect(milieu).toBeLessThan(0.6);
  });
  it("une progression invalide laisse la ligne visible (mouvement reduit, arc fige)", () => {
    expect(seuilTeteOpacity(Number.NaN)).toBe(1);
  });
});
