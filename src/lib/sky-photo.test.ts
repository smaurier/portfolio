import { describe, expect, it } from "vitest";
import { SKY_PHOTO_DIRECTIONS, skyPhotoNeeded } from "./sky-photo";

describe("skyPhotoNeeded (qui charge la photo de ciel)", () => {
  it("les trois directions qui posent un dome la demandent", () => {
    for (const d of ["turquoise", "cendre", "dore"] as const) {
      expect(skyPhotoNeeded(d), d).toBe(true);
    }
  });

  it("le Centre et le Nord ne la demandent PAS : c'est la mesure du 10/09", () => {
    // 120 Ko sur les 2 Mo du fil, pour une texture jamais affichee, alors
    // que le voile se leve 1,1 s apres le dernier octet.
    expect(skyPhotoNeeded("jade")).toBe(false);
    expect(skyPhotoNeeded("obsidienne")).toBe(false);
  });

  it("la liste ne contient rien d'autre", () => {
    expect([...SKY_PHOTO_DIRECTIONS].sort()).toEqual(["cendre", "dore", "turquoise"]);
  });
});
