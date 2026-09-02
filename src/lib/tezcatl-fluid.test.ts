import { describe, expect, it } from "vitest";
import { emitterSplats, pointerSplat, smokeGate, worldToSimUv } from "./tezcatl-fluid";

describe("worldToSimUv (disque du tezcatl -> grille de simulation)", () => {
  it("le centre du disque est le centre de la grille", () => {
    expect(worldToSimUv(0, 0, 3)).toEqual({ u: 0.5, v: 0.5, inside: true });
  });

  it("le bord du disque touche le bord de la grille, au-dela = dehors", () => {
    expect(worldToSimUv(3, 0, 3)).toMatchObject({ u: 1, v: 0.5, inside: true });
    expect(worldToSimUv(-3, 0, 3)).toMatchObject({ u: 0, inside: true });
    expect(worldToSimUv(2.5, 2.5, 3).inside).toBe(false);
  });
});

describe("emitterSplats (filets de fumee nes au contact du reflet)", () => {
  it("place N emetteurs dans le disque, pres du centre, jamais au bord", () => {
    const splats = emitterSplats(12.3, 5, 0.6, 3);
    expect(splats).toHaveLength(5);
    for (const s of splats) {
      const d = Math.hypot(s.u - 0.5, s.v - 0.5);
      expect(d).toBeGreaterThan(0.03);
      expect(d).toBeLessThan(0.2);
    }
  });

  it("chaque emetteur pousse vers l'exterieur (la fumee s'ecarte du cerf)", () => {
    for (const s of emitterSplats(4.2, 6, 0.6, 3)) {
      const radial = (s.u - 0.5) * s.du + (s.v - 0.5) * s.dv;
      expect(radial).toBeGreaterThan(0);
    }
  });

  it("derive avec le temps : deux instants donnent des positions differentes", () => {
    const a = emitterSplats(0, 3, 0.6, 3);
    const b = emitterSplats(5, 3, 0.6, 3);
    expect(a[0].u !== b[0].u || a[0].v !== b[0].v).toBe(true);
  });
});

describe("pointerSplat (la souris pousse la fumee)", () => {
  it("null sans mouvement ou hors du disque", () => {
    expect(pointerSplat({ u: 0.5, v: 0.5 }, { u: 0.5, v: 0.5 }, 1 / 60)).toBeNull();
    expect(pointerSplat({ u: 0.5, v: 0.5 }, { u: 1.2, v: 0.5 }, 1 / 60)).toBeNull();
  });

  it("la vitesse suit le deplacement, plafonnee", () => {
    const s = pointerSplat({ u: 0.5, v: 0.5 }, { u: 0.52, v: 0.5 }, 1 / 60);
    expect(s).not.toBeNull();
    expect(s!.du).toBeGreaterThan(0);
    expect(Math.abs(s!.dv)).toBeLessThan(1e-9);
    const fast = pointerSplat({ u: 0.1, v: 0.1 }, { u: 0.9, v: 0.9 }, 1 / 60)!;
    expect(Math.hypot(fast.du, fast.dv)).toBeLessThanOrEqual(1 + 1e-9);
  });
});

describe("smokeGate (Nord seulement, se revele en descendant)", () => {
  it("0 hors du Nord", () => {
    expect(smokeGate({ direction: "jade", scrollDepth: 1, reducedMotion: false })).toBe(0);
  });

  it("au Nord : affleure en haut de page, plein en bas", () => {
    const top = smokeGate({ direction: "obsidienne", scrollDepth: 0, reducedMotion: false });
    const bottom = smokeGate({ direction: "obsidienne", scrollDepth: 1, reducedMotion: false });
    expect(top).toBeGreaterThan(0);
    expect(top).toBeLessThan(bottom);
    expect(bottom).toBe(1);
  });

  it("prefers-reduced-motion : fumee figee mais presente (0 = rien a voir, pas ca)", () => {
    const g = smokeGate({ direction: "obsidienne", scrollDepth: 0.5, reducedMotion: true });
    expect(g).toBeGreaterThan(0);
  });
});
