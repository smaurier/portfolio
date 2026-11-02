import { describe, expect, it } from "vitest";
import { coucheParDefaut, type CoucheContexte } from "./couche";

/**
 * LA COUCHE D'OUVERTURE (02/11) : la scene si la machine suit, l'amatl
 * sinon (mouvement reduit, WebGL absent, connexion degradee). Jamais la
 * parole par defaut : elle est toujours a un geste (design, section 1).
 */
const SUIT: CoucheContexte = { prefersReducedMotion: false, webglDisponible: true, connexionDegradee: false };

describe("la couche d'ouverture", () => {
  it("la scene si la machine suit tout", () => {
    expect(coucheParDefaut(SUIT)).toBe("scene");
  });
  it("l'amatl si WebGL est absent, meme si tout le reste suit", () => {
    expect(coucheParDefaut({ ...SUIT, webglDisponible: false })).toBe("amatl");
  });
  it("l'amatl sous mouvement reduit", () => {
    expect(coucheParDefaut({ ...SUIT, prefersReducedMotion: true })).toBe("amatl");
  });
  it("l'amatl en connexion degradee", () => {
    expect(coucheParDefaut({ ...SUIT, connexionDegradee: true })).toBe("amatl");
  });
  it("jamais la parole : ce n'est pas son role, elle est toujours a un geste", () => {
    for (const c of [SUIT, { ...SUIT, webglDisponible: false }, { ...SUIT, prefersReducedMotion: true }, { ...SUIT, connexionDegradee: true }]) {
      expect(coucheParDefaut(c)).not.toBe("parole");
    }
  });
  it("le WebGL absent l'emporte sur tout, meme si le reste suit", () => {
    expect(coucheParDefaut({ prefersReducedMotion: false, webglDisponible: false, connexionDegradee: false })).toBe("amatl");
  });
});
