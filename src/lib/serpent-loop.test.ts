import { describe, expect, it } from "vitest";
import {
  buildSegmentTicks,
  buildSerpentOutlinePath,
  buildSnoutHook,
  buildTailFlare,
  sampleSerpentArc,
  SERPENT_A,
  SERPENT_B,
  widthAt,
} from "./serpent-loop";

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

  it("t=0 (tête) est proche du bas de l'ellipse, pour A et B, retour du 21/08 (aligné sur la vraie Piedra)", () => {
    for (const serpent of [SERPENT_A, SERPENT_B]) {
      const head = sampleSerpentArc(serpent)[0];
      expect(head.y).toBeGreaterThan(serpent.cy);
    }
  });

  it("t=1 (queue) est proche du haut de l'ellipse, pour A et B", () => {
    for (const serpent of [SERPENT_A, SERPENT_B]) {
      const tail = sampleSerpentArc(serpent).at(-1)!;
      expect(tail.y).toBeLessThan(serpent.cy);
    }
  });
});

describe("widthAt", () => {
  it("est maximale à t=0 (bulbe tête) et décroît en s'approchant du corps", () => {
    expect(widthAt(0)).toBeGreaterThan(widthAt(0.14));
  });

  it("vaut la largeur de corps constante au milieu du tracé", () => {
    expect(widthAt(0.5)).toBeCloseTo(2.6);
  });

  it("rétrécit vers le cou en s'approchant de t=1", () => {
    expect(widthAt(1)).toBeLessThan(widthAt(0.86));
  });

  it("reste dans [neckWidth, headWidth] sur tout le domaine", () => {
    for (let t = 0; t <= 1; t += 0.05) {
      const w = widthAt(t);
      expect(w).toBeGreaterThanOrEqual(1.4 - 1e-9);
      expect(w).toBeLessThanOrEqual(5 + 1e-9);
    }
  });
});

describe("buildSerpentOutlinePath", () => {
  it("commence par M, enchaîne des L, et se referme avec Z", () => {
    const d = buildSerpentOutlinePath(SERPENT_A);
    expect(d.startsWith("M ")).toBe(true);
    expect(d).toContain(" L ");
    expect(d.endsWith("Z")).toBe(true);
  });

  it("A et B ne sont pas de simples miroirs (phases différentes, cf retour 'irrégulier')", () => {
    expect(buildSerpentOutlinePath(SERPENT_A)).not.toBe(buildSerpentOutlinePath(SERPENT_B));
  });

  it("est déterministe", () => {
    expect(buildSerpentOutlinePath(SERPENT_A)).toBe(buildSerpentOutlinePath(SERPENT_A));
  });
});

describe("buildSnoutHook", () => {
  it("commence exactement au point tête (t=0) de l'arc", () => {
    const head = sampleSerpentArc(SERPENT_A)[0];
    const d = buildSnoutHook(SERPENT_A);
    expect(d.startsWith(`M ${head.x.toFixed(2)},${head.y.toFixed(2)}`)).toBe(true);
  });

  it("produit steps segments L en plus du point de départ", () => {
    const d = buildSnoutHook(SERPENT_A);
    const commandCount = (d.match(/[ML]/g) ?? []).length;
    expect(commandCount).toBe(SERPENT_A.steps > 0 ? 7 : 0); // 1 M + 6 L (steps par défaut)
  });
});

describe("buildTailFlare", () => {
  it("produit un M par palier de largeur, plus le rayon final", () => {
    const d = buildTailFlare(SERPENT_A);
    const moveCount = (d.match(/M/g) ?? []).length;
    expect(moveCount).toBe(4); // 3 tabWidths + 1 rayon
  });
});

describe("buildSegmentTicks", () => {
  it("produit `count` petits traits (count occurrences de M)", () => {
    const d = buildSegmentTicks(SERPENT_A);
    const moveCount = (d.match(/M/g) ?? []).length;
    expect(moveCount).toBe(9);
  });

  it("est déterministe", () => {
    expect(buildSegmentTicks(SERPENT_A)).toBe(buildSegmentTicks(SERPENT_A));
  });
});
