import { describe, expect, it } from "vitest";
import { COUCHE_STORAGE_KEY, coucheInitiale, coucheParDefaut, parseStoredCouche, type CoucheContexte } from "./couche";

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

describe("la memoire du choix (02/11 : le choix manuel persiste)", () => {
  it("ne lit que les trois mots, et rien d'autre", () => {
    expect(parseStoredCouche("scene")).toBe("scene");
    expect(parseStoredCouche("amatl")).toBe("amatl");
    expect(parseStoredCouche("parole")).toBe("parole");
    expect(parseStoredCouche("3d")).toBeNull();
    expect(parseStoredCouche("Scene")).toBeNull();
    expect(parseStoredCouche("")).toBeNull();
    expect(parseStoredCouche(null)).toBeNull();
    expect(parseStoredCouche(undefined)).toBeNull();
  });

  it("la cle de stockage suit le nommage du depot", () => {
    expect(COUCHE_STORAGE_KEY).toBe("nahual-couche");
  });
});

describe("la couche a l'ouverture : le choix memorise face a la machine", () => {
  it("sans rien en memoire, c'est la regle par defaut qui decide", () => {
    expect(coucheInitiale(null, SUIT)).toBe("scene");
    expect(coucheInitiale(null, { ...SUIT, prefersReducedMotion: true })).toBe("amatl");
  });

  it("un choix memorise l'emporte sur la machine, y compris contre le mouvement reduit", () => {
    // Regle du depot (lib/reduced-motion.ts, 09/09) : une demande explicite
    // gagne sur une preference generale.
    expect(coucheInitiale("scene", { ...SUIT, prefersReducedMotion: true })).toBe("scene");
    expect(coucheInitiale("scene", { ...SUIT, connexionDegradee: true })).toBe("scene");
    expect(coucheInitiale("parole", SUIT)).toBe("parole");
    expect(coucheInitiale("amatl", SUIT)).toBe("amatl");
  });

  it("MAIS un choix impossible ne s'honore pas : la scene memorisee sans WebGL retombe sur l'amatl", () => {
    // Une preference se respecte, une impossibilite ne se discute pas :
    // ouvrir sur une couche que la machine ne peut pas rendre donnerait une
    // page vide.
    expect(coucheInitiale("scene", { ...SUIT, webglDisponible: false })).toBe("amatl");
  });

  it("la parole memorisee reste honoree meme sans WebGL : elle ne demande rien a la machine", () => {
    expect(coucheInitiale("parole", { ...SUIT, webglDisponible: false })).toBe("parole");
    expect(coucheInitiale("amatl", { ...SUIT, webglDisponible: false })).toBe("amatl");
  });

  it("une valeur de stockage abimee se traite comme une absence, jamais comme une erreur", () => {
    expect(coucheInitiale("3d", SUIT)).toBe("scene");
    expect(coucheInitiale("", { ...SUIT, prefersReducedMotion: true })).toBe("amatl");
  });
});
