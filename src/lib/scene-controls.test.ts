import { describe, expect, it } from "vitest";
import { cinematicProgress, CINEMATIC, resolveQuality, SCENE_SHORTCUTS, shortcutAction } from "./scene-controls";

describe("cinematicProgress : la scene deroule seule, du soir au midi", () => {
  it("part de la position courante et atteint la fin de l'arc en CINEMATIC.seconds, puis y reste", () => {
    expect(cinematicProgress(0, 0.2)).toBeCloseTo(0.2, 9);
    expect(cinematicProgress(CINEMATIC.seconds, 0.2)).toBeCloseTo(1, 9);
    expect(cinematicProgress(CINEMATIC.seconds * 3, 0.2)).toBeCloseTo(1, 9);
  });

  it("est monotone et lisse : jamais de retour en arriere, pas de saut", () => {
    let prev = cinematicProgress(0, 0);
    for (let t = 0.5; t <= CINEMATIC.seconds + 5; t += 0.5) {
      const p = cinematicProgress(t, 0);
      expect(p).toBeGreaterThanOrEqual(prev - 1e-12);
      expect(p - prev).toBeLessThan(0.05);
      prev = p;
    }
  });

  it("demarre doucement et finit doucement (ease-in-out)", () => {
    const early = cinematicProgress(CINEMATIC.seconds * 0.1, 0);
    const mid = cinematicProgress(CINEMATIC.seconds * 0.5, 0) - cinematicProgress(CINEMATIC.seconds * 0.4, 0);
    expect(early).toBeLessThan(0.05);
    expect(mid).toBeGreaterThan(0.1);
  });

  it("un depart deja a la fin reste a la fin", () => {
    expect(cinematicProgress(1, 1)).toBe(1);
  });
});

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
    expect(shortcutAction("p")).toBe("photo");
    expect(shortcutAction("e")).toBe("eco");
    expect(shortcutAction("w")).toBeNull(); // WASD reste a la navigation
    expect(shortcutAction("Escape")).toBeNull(); // Echap reste au retour accueil
  });

  it("aucun raccourci de scene ne prend une touche de la navigation cardinale", () => {
    for (const k of ["w", "a", "s", "d", "z", "q", "c"]) expect(SCENE_SHORTCUTS[k]).toBeUndefined();
  });
});
