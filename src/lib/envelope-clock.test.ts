import { describe, expect, it } from "vitest";
import { ENVELOPE_MAX_STEP, advanceEnvelope } from "./envelope-clock";

/**
 * La lecon du 09/09, generalisee. Elle est nee sur la frappe du xiuhcoatl,
 * ou l'horloge de la scene a saute de 3,9 s en une image au moment ou
 * l'anneau s'embrase et compile son shader : toute l'enveloppe de 3,1 s a
 * ete consommee d'un coup, donc invisible. La meme forme se retrouve partout
 * ailleurs dans le projet, et merite la meme borne.
 */
describe("advanceEnvelope : une saccade ne doit jamais enjamber un geste", () => {
  it("un a-coup de plusieurs secondes n'avance que d'un pas", () => {
    expect(advanceEnvelope(0, 3.9)).toBeLessThanOrEqual(ENVELOPE_MAX_STEP);
    expect(advanceEnvelope(0, 60)).toBeLessThanOrEqual(ENVELOPE_MAX_STEP);
  });

  it("en marche normale, le temps s'accumule sans perte visible", () => {
    let t = 0;
    for (let i = 0; i < 120; i++) t = advanceEnvelope(t, 1 / 60);
    expect(t).toBeCloseTo(2, 2);
  });

  it("un pas maximum sur mesure est respecte", () => {
    expect(advanceEnvelope(0, 5, 0.01)).toBeCloseTo(0.01, 6);
  });

  it("un delta sans valeur n'avance rien, un delta infini avance d'un pas", () => {
    // La distinction compte : NaN veut dire « on ne sait pas de combien », et
    // geler la sequence est alors la seule reponse honnete. L'infini, lui,
    // est une saccade comme une autre, en pire.
    expect(advanceEnvelope(0.5, Number.NaN)).toBe(0.5);
    expect(advanceEnvelope(0.5, Number.POSITIVE_INFINITY)).toBeCloseTo(0.5 + ENVELOPE_MAX_STEP, 6);
  });

  it("un delta nul ou negatif n'avance rien", () => {
    expect(advanceEnvelope(0.5, 0)).toBe(0.5);
    expect(advanceEnvelope(0.5, -1)).toBe(0.5);
  });

  it("repart de zero si l'horloge fournie est corrompue", () => {
    expect(advanceEnvelope(Number.NaN, 0.016)).toBe(0);
  });
});
