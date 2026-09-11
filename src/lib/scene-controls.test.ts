import { describe, expect, it } from "vitest";
import { resolveQuality, SCENE_SHORTCUTS, shortcutAction } from "./scene-controls";

describe("resolveQuality : le profil de rendu, auto ou eco", () => {
  it("auto sur ordi : tout ; auto sur mobile : moins", () => {
    const desk = resolveQuality(false, false);
    const mob = resolveQuality(false, true);
    expect(desk.postFx).toBe(true);
    expect(desk.shadows).toBe(true);
    expect(desk.dprCap).toBe(2);
    expect(mob.postFx).toBe(false);
    expect(mob.dprCap).toBeLessThan(desk.dprCap);
    expect(mob.bladeCount).toBeLessThan(desk.bladeCount);
  });

  it("eco force le repli, meme sur ordi", () => {
    const eco = resolveQuality(true, false);
    expect(eco.postFx).toBe(false);
    expect(eco.shadows).toBe(false);
    expect(eco.dprCap).toBe(1);
    expect(eco.bladeCount).toBeLessThanOrEqual(resolveQuality(false, true).bladeCount);
  });
});

describe("les raccourcis de scene", () => {
  it("H texte, F plein ecran, T contemplation, P photo, E eco ; rien d'autre", () => {
    expect(shortcutAction("h")).toBe("text");
    expect(shortcutAction("H")).toBe("text");
    expect(shortcutAction("f")).toBe("fullscreen");
    expect(shortcutAction("t")).toBe("cinematic");
    expect(shortcutAction("g")).toBe("pause");
    expect(shortcutAction("p")).toBe("photo");
    expect(shortcutAction("e")).toBe("eco");
    expect(shortcutAction("l")).toBe("link");
    expect(shortcutAction("n")).toBeNull();
    expect(shortcutAction("w")).toBeNull(); // WASD reste a la navigation
    expect(shortcutAction("Escape")).toBeNull(); // Echap reste au retour accueil
  });

  it("aucun raccourci de scene ne prend une touche de la navigation cardinale", () => {
    for (const k of ["w", "a", "s", "d", "z", "q", "c"]) expect(SCENE_SHORTCUTS[k]).toBeUndefined();
  });
});
