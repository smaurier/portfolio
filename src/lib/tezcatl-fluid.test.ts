import { describe, expect, it } from "vitest";
import { hoofDrop, pointerSplat, smokeGate, worldToSimUv } from "./tezcatl-fluid";

describe("worldToSimUv (disque du tezcatl -> grille de simulation)", () => {
  it("le centre du disque est le centre de la grille", () => {
    expect(worldToSimUv(0, 0, 3)).toEqual({ u: 0.5, v: 0.5, inside: true });
  });

  it("la grille est CARREE (toute la surface, 02/09) : dedans jusqu'aux coins, dehors au-dela", () => {
    expect(worldToSimUv(3, 0, 3)).toMatchObject({ u: 1, v: 0.5, inside: true });
    expect(worldToSimUv(-3, 0, 3)).toMatchObject({ u: 0, inside: true });
    expect(worldToSimUv(2.5, 2.5, 3).inside).toBe(true);
    expect(worldToSimUv(3.5, 0, 3).inside).toBe(false);
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

describe("hoofDrop (le sabot du cerf qui bouge fait une onde, 02/09)", () => {
  const level = 0.25;
  it("un sabot immobile ne fait rien", () => {
    expect(hoofDrop({ x: 0.3, y: 0.02, z: 0.1 }, { x: 0.3, y: 0.02, z: 0.1 }, 1 / 60, level)).toBe(0);
  });

  it("un tremblement infime (bruit d'animation) ne fait rien", () => {
    expect(hoofDrop({ x: 0.3, y: 0.02, z: 0.1 }, { x: 0.3002, y: 0.02, z: 0.1 }, 1 / 60, level)).toBe(0);
  });

  it("un sabot qui glisse dans l'eau fait une onde proportionnelle a sa vitesse, plafonnee", () => {
    const slow = hoofDrop({ x: 0, y: 0.05, z: 0 }, { x: 0.004, y: 0.05, z: 0 }, 1 / 60, level);
    const fast = hoofDrop({ x: 0, y: 0.05, z: 0 }, { x: 0.02, y: 0.05, z: 0 }, 1 / 60, level);
    const huge = hoofDrop({ x: 0, y: 0.05, z: 0 }, { x: 0.5, y: 0.05, z: 0 }, 1 / 60, level);
    expect(slow).toBeGreaterThan(0);
    expect(fast).toBeGreaterThan(slow);
    expect(huge).toBeLessThanOrEqual(0.3);
  });

  it("un sabot qui entre dans l'eau (traverse le niveau vers le bas) fait une eclaboussure", () => {
    const splash = hoofDrop({ x: 0, y: 0.4, z: 0 }, { x: 0, y: 0.2, z: 0 }, 1 / 60, level);
    expect(splash).toBeGreaterThan(0.03);
  });

  it("un sabot en l'air (au-dessus du niveau) ne touche pas l'eau", () => {
    expect(hoofDrop({ x: 0, y: 0.6, z: 0 }, { x: 0.02, y: 0.6, z: 0 }, 1 / 60, level)).toBe(0);
  });
});
