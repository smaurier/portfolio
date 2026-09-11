import { describe, expect, it } from "vitest";
import { ARRIVAL_CUES, arrivalCueFor, shouldPlayArrival } from "./journey-cues";

describe("les coupes son de l'arrivee (11/09)", () => {
  it("cinq directions, cinq elements distincts", () => {
    const kinds = Object.values(ARRIVAL_CUES).map((c) => c.kind);
    expect(kinds).toHaveLength(5);
    expect(new Set(kinds).size).toBe(5);
    expect(arrivalCueFor("obsidienne").kind).toBe("drops");
  });
  it("jamais au premier chargement, jamais deux fois de suite", () => {
    expect(shouldPlayArrival(null, "cendre", null)).toBe(false);
    expect(shouldPlayArrival("jade", "cendre", null)).toBe(true);
    expect(shouldPlayArrival("jade", "cendre", "cendre")).toBe(false);
    expect(shouldPlayArrival("cendre", "cendre", null)).toBe(false);
  });
});
