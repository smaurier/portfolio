import { describe, expect, it } from "vitest";
import { easeToward, isLoadingDone, MIN_VEIL_DURATION_MS } from "./loading-veil";

describe("isLoadingDone", () => {
  it("n'est pas terminé tant que les assets ne sont pas à 100%, même après la durée minimale", () => {
    expect(isLoadingDone(0, true)).toBe(false);
    expect(isLoadingDone(50, true)).toBe(false);
    expect(isLoadingDone(99.9, true)).toBe(false);
  });

  it("n'est pas terminé tant que la durée minimale n'est pas passée, même si les assets sont prêts", () => {
    // Cas du chargement depuis le cache : sans ce garde-fou, la phrase en
    // nahuatl ne ferait qu'un flash illisible plutôt que le premier vrai
    // beat de la scène (retour de Sylvain, cf memory project-nahual-da).
    expect(isLoadingDone(100, false)).toBe(false);
  });

  it("est terminé seulement quand les deux conditions sont réunies", () => {
    expect(isLoadingDone(100, true)).toBe(true);
  });

  it("expose une durée minimale strictement positive", () => {
    expect(MIN_VEIL_DURATION_MS).toBeGreaterThan(0);
  });
});

describe("easeToward", () => {
  it("se rapproche de la cible sans jamais dépasser (overshoot)", () => {
    const next = easeToward(0, 100, 0.1);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(100);
  });

  it("reste sur place une fois la cible atteinte", () => {
    expect(easeToward(100, 100, 0.1)).toBe(100);
  });

  it("un facteur plus grand rattrape plus vite", () => {
    const slow = easeToward(0, 100, 0.05);
    const fast = easeToward(0, 100, 0.3);
    expect(fast).toBeGreaterThan(slow);
  });
});
