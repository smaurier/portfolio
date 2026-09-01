import { describe, expect, it } from "vitest";
import {
  MIN_VEIL_DURATION_MS,
  HOLD_AFTER_REVEAL_MS,
  computeMinVeilDuration,
  computeRevealEndMs,
} from "./loading-veil";

describe("MIN_VEIL_DURATION_MS (plancher de securite)", () => {
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

describe("computeMinVeilDuration (31/08 : calcul dynamique)", () => {
  it("laisse au moins HOLD_AFTER_REVEAL_MS apres la fin du reveal", () => {
    const phrase = "In xochitl in cuicatl";
    const translation = "Fleur et chant, seule verite ici-bas";
    const revealEnd = computeRevealEndMs(phrase, translation);
    const total = computeMinVeilDuration(phrase, translation);
    expect(total).toBeGreaterThanOrEqual(revealEnd + HOLD_AFTER_REVEAL_MS);
  });

  it("respecte le plancher MIN_VEIL_DURATION_MS pour un texte tres court", () => {
    // Un texte pathologiquement court pourrait donner une duree sous le
    // plancher raisonnable ; la fonction doit forcer le minimum.
    const total = computeMinVeilDuration("A", "B");
    expect(total).toBeGreaterThanOrEqual(MIN_VEIL_DURATION_MS);
  });

  it("scale avec la longueur du texte (phrase longue = duree plus longue)", () => {
    const short = computeMinVeilDuration("Ollin", "Mouvement");
    const long = computeMinVeilDuration(
      "In xochitl in cuicatl in tlacatl in yelli",
      "Fleur et chant, homme et coeur, quatre voies pour une seule verite",
    );
    expect(long).toBeGreaterThan(short);
  });
});
