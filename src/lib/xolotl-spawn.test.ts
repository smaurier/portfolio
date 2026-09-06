import { describe, expect, it } from "vitest";
import { decideSpawn, xolotlSpawnKey, xolotlSpawnProbability } from "./xolotl-spawn";

const evening = new Date("2026-09-06T02:00:00Z"); // Venus etoile du soir
const morning = new Date("2026-11-15T02:00:00Z"); // Venus etoile du matin

describe("xolotlSpawnProbability : ou et quand le chien passe", () => {
  it("jamais au Centre, a l'Est ni au Sud", () => {
    for (const d of ["jade", "dore", "turquoise"] as const) {
      expect(xolotlSpawnProbability(d, evening)).toBe(0);
      expect(xolotlSpawnProbability(d, morning)).toBe(0);
    }
  });

  it("toujours au Nord, quelle que soit la date", () => {
    expect(xolotlSpawnProbability("obsidienne", evening)).toBe(1);
    expect(xolotlSpawnProbability("obsidienne", morning)).toBe(1);
  });

  it("a l'Ouest : toujours quand Venus est etoile du soir, sinon une fois sur trois", () => {
    expect(xolotlSpawnProbability("cendre", evening)).toBe(1);
    expect(xolotlSpawnProbability("cendre", morning)).toBeCloseTo(1 / 3, 9);
  });
});

describe("decideSpawn : un tirage par session et par direction", () => {
  it("probabilite nulle : non, meme si un tirage 'oui' est en cache", () => {
    expect(decideSpawn(0, "1", () => 0)).toBe(false);
  });

  it("probabilite 1 : oui, meme si un tirage 'non' est en cache", () => {
    expect(decideSpawn(1, "0", () => 0.99)).toBe(true);
  });

  it("entre les deux : le cache fait foi, sinon le tirage", () => {
    expect(decideSpawn(1 / 3, "1", () => 0.9)).toBe(true);
    expect(decideSpawn(1 / 3, "0", () => 0.1)).toBe(false);
    expect(decideSpawn(1 / 3, null, () => 0.2)).toBe(true);
    expect(decideSpawn(1 / 3, null, () => 0.5)).toBe(false);
  });

  it("la cle de session est versionnee par direction", () => {
    expect(xolotlSpawnKey("cendre")).toMatch(/^nahual-xolotl-spawn-v\d+-cendre$/);
    expect(xolotlSpawnKey("cendre")).not.toBe(xolotlSpawnKey("obsidienne"));
  });
});
