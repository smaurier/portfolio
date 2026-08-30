import { describe, expect, it } from "vitest";
import { MIN_VEIL_DURATION_MS } from "./loading-veil";

describe("MIN_VEIL_DURATION_MS", () => {
  it("expose une duree minimale strictement positive", () => {
    expect(MIN_VEIL_DURATION_MS).toBeGreaterThan(0);
  });

  it("laisse au moins 3 secondes pour lire la phrase + traduction (retour Sylvain 30/08)", () => {
    // Sylvain a itere 1400ms → 2500ms → 3500ms. Le seuil de 3000ms est
    // le plancher confortable pour lire une phrase courte en langue
    // etrangere (nahuatl) + sa traduction sans se sentir presse.
    expect(MIN_VEIL_DURATION_MS).toBeGreaterThanOrEqual(3000);
  });
});
