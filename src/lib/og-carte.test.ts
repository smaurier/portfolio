import { describe, expect, it } from "vitest";
import { couper } from "./og-carte";

describe("la carte de partage : couper la description", () => {
  it("laisse un texte court intact", () => {
    expect(couper("Trois mots ici")).toBe("Trois mots ici");
  });

  it("coupe au dernier mot entier et pose une ellipse", () => {
    const long = "Teyolía, l'une des trois entités qui, dans la pensée nahua, composent une personne : elle réside dans le cœur, porte la mémoire, et voyage vers Mictlán.";
    const c = couper(long);
    expect(c.length).toBeLessThanOrEqual(131);
    expect(c.endsWith("…")).toBe(true);
    // Pas de mot tranche : ce qui precede l'ellipse est un mot du texte.
    const dernier = c.slice(0, -1).split(" ").at(-1) ?? "";
    expect(long).toContain(dernier);
  });

  it("ne laisse pas de ponctuation avant l'ellipse", () => {
    expect(couper("un deux trois, " + "x".repeat(200))).not.toContain(", …");
  });
});
