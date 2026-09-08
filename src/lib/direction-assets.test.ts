import { describe, expect, it } from "vitest";
import { assetsForDirection, DIRECTION_ASSETS, HEAVY_MODELS } from "./direction-assets";

describe("direction-assets : quels modeles appartiennent a quelle direction", () => {
  it("le Centre ne charge aucun modele de direction", () => {
    expect(assetsForDirection("jade")).toEqual([]);
  });

  it("chaque modele lourd appartient a au moins une direction, et jamais au Centre", () => {
    for (const model of HEAVY_MODELS) {
      const owners = (Object.keys(DIRECTION_ASSETS) as (keyof typeof DIRECTION_ASSETS)[]).filter((d) =>
        DIRECTION_ASSETS[d].includes(model),
      );
      expect(owners.length).toBeGreaterThan(0);
      expect(owners).not.toContain("jade");
    }
  });

  it("Xolotl appartient a l'Ouest ET au Nord : il y passe dans les deux", () => {
    expect(assetsForDirection("cendre")).toContain("/models/xolotl.glb");
    expect(assetsForDirection("obsidienne")).toContain("/models/xolotl.glb");
    expect(assetsForDirection("turquoise")).not.toContain("/models/xolotl.glb");
  });

  it("les porteuses sont a l'Ouest seul, le serpent et les colibris au Sud seul", () => {
    expect(assetsForDirection("cendre")).toContain("/models/cihuateotl.glb");
    expect(assetsForDirection("dore")).not.toContain("/models/cihuateotl.glb");
    expect(assetsForDirection("turquoise")).toContain("/models/xiuhcoatl.glb");
    expect(assetsForDirection("turquoise")).toContain("/models/hummingbird-poly.glb");
    expect(assetsForDirection("obsidienne")).not.toContain("/models/xiuhcoatl.glb");
  });

  it("ne liste que des chemins de modeles, jamais autre chose", () => {
    for (const list of Object.values(DIRECTION_ASSETS)) {
      for (const path of list) expect(path).toMatch(/^\/models\/[a-z0-9-]+\.glb$/);
    }
  });
});
