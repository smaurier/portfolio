import { describe, expect, it } from "vitest";
import { buildSerpentPath, sampleSerpentArc, SERPENT_A, SERPENT_B } from "./serpent-loop";

describe("sampleSerpentArc", () => {
  it("returns steps + 1 points", () => {
    expect(sampleSerpentArc(SERPENT_A)).toHaveLength(SERPENT_A.steps + 1);
  });

  it("is deterministic (pas de Math.random, pas de désaccord SSR/client)", () => {
    expect(sampleSerpentArc(SERPENT_A)).toEqual(sampleSerpentArc(SERPENT_A));
  });

  it("reste dans un rayon plausible autour du centre (ondulations petites vs rx/ry)", () => {
    for (const p of sampleSerpentArc(SERPENT_A)) {
      const dx = (p.x - SERPENT_A.cx) / SERPENT_A.rx;
      const dy = (p.y - SERPENT_A.cy) / SERPENT_A.ry;
      const normalizedRadius = Math.hypot(dx, dy);
      // Rayon normalisé proche de 1 (ellipse de base) +/- l'amplitude des
      // deux ondulations combinées, avec une marge pour l'anisotropie
      // rx != ry qui déforme légèrement cette approximation circulaire.
      expect(normalizedRadius).toBeGreaterThan(0.75);
      expect(normalizedRadius).toBeLessThan(1.25);
    }
  });
});

describe("buildSerpentPath", () => {
  it("commence par M et enchaîne des segments L", () => {
    const d = buildSerpentPath(SERPENT_A);
    expect(d.startsWith("M ")).toBe(true);
    expect(d).toContain(" L ");
  });

  it("le nombre de commandes correspond au nombre de points", () => {
    const d = buildSerpentPath(SERPENT_B);
    const commandCount = (d.match(/[ML]/g) ?? []).length;
    expect(commandCount).toBe(SERPENT_B.steps + 1);
  });

  it("A et B ne sont pas de simples miroirs (phases différentes, cf retour 'irrégulier')", () => {
    expect(buildSerpentPath(SERPENT_A)).not.toBe(buildSerpentPath(SERPENT_B));
  });
});
