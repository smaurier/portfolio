import { describe, expect, it } from "vitest";
import { CARDINAL_TREES, foliageGrowth, treeFor } from "./cardinal-trees";
import { getOrbitCameraPosition } from "./camera-path";

describe("treeFor : un arbre par direction, aucun au Centre", () => {
  it("les quatre points ont leur essence, le Centre n'a rien", () => {
    expect(treeFor("dore")?.species).toBe("pseudobombax");
    expect(treeFor("turquoise")?.species).toBe("cacao");
    expect(treeFor("cendre")?.species).toBe("erythrina");
    expect(treeFor("obsidienne")?.species).toBe("ceiba");
    expect(treeFor("jade")).toBeNull();
  });

  it("chaque arbre est hors du cercle et loin du cerf", () => {
    for (const t of Object.values(CARDINAL_TREES)) {
      const r = Math.hypot(t.x, t.z);
      expect(r).toBeGreaterThan(6.5);
      expect(r).toBeLessThan(9);
    }
  });

  it("aucun arbre dans l'axe du regard d'ouverture ni dans celui d'arrivee", () => {
    // Les deux moments ou la composition compte : l'arrivee sur la page et le
    // bas de page. Un arbre pile dans l'axe se dresse derriere le cerf.
    for (const progress of [0, 1]) {
      const cam = getOrbitCameraPosition(progress);
      const gaze = Math.atan2(-cam.x, -cam.z);
      for (const t of Object.values(CARDINAL_TREES)) {
        const d = Math.atan2(t.x, t.z) - gaze;
        const wrapped = Math.atan2(Math.sin(d), Math.cos(d));
        expect(Math.abs((wrapped * 180) / Math.PI)).toBeGreaterThan(35);
      }
    }
  });

  it("l'arbre de l'Ouest ne se tient pas sur les Cihuateteo (azimut 135 deg)", () => {
    const west = CARDINAL_TREES.cendre;
    const az = (Math.atan2(west.x, west.z) * 180) / Math.PI;
    expect(Math.abs(az - 135)).toBeGreaterThan(40);
  });
});

describe("foliageGrowth : le feuillage pousse avec le scroll, et attend le degel a l'Est", () => {
  it("nu en haut de page, plein en bas", () => {
    expect(foliageGrowth(0, 0)).toBeLessThan(0.2);
    expect(foliageGrowth(1, 0)).toBeCloseTo(1, 6);
  });

  it("monte sans redescendre", () => {
    let prev = -1;
    for (let p = 0; p <= 1; p += 0.05) {
      const v = foliageGrowth(p, 0);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = v;
    }
  });

  it("sous le gel, l'arbre reste nu quel que soit le scroll", () => {
    expect(foliageGrowth(1, 1)).toBe(0);
    expect(foliageGrowth(0.6, 1)).toBe(0);
  });

  it("au degel il feuille, sans saut", () => {
    let prev = foliageGrowth(1, 1);
    for (let frost = 1; frost >= 0; frost -= 0.05) {
      const v = foliageGrowth(1, Math.max(0, frost));
      expect(Math.abs(v - prev)).toBeLessThan(0.2);
      prev = v;
    }
    expect(foliageGrowth(1, 0)).toBeCloseTo(1, 6);
  });
});
