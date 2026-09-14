import { describe, expect, it } from "vitest";
import { DoubleSide, FrontSide, MeshBasicMaterial, MeshStandardMaterial } from "three";
import { addShaderModifier, signatureMateriau } from "./shader-patch";

/**
 * Le contrat de la signature : elle doit bouger quand le PROGRAMME du
 * materiau doit etre refait, et seulement dans ce cas.
 */
describe("signatureMateriau (ce qui oblige vraiment a recompiler)", () => {
  it("bouge quand la version d'un materiau ordinaire bouge", () => {
    const m = new MeshStandardMaterial();
    const avant = signatureMateriau(m);
    m.needsUpdate = true;
    expect(signatureMateriau(m)).not.toBe(avant);
  });

  it("ne bouge PAS pour la danse deux passes du rendu", () => {
    // three rend un materiau transparent en double face en deux passes, et
    // pose `needsUpdate` avant chacune (renderObject, source de r185). La
    // version de ce materiau grimpe donc de deux a CHAQUE image, sans que
    // son programme change : mesure du 14/09, +2256 versions en trois
    // secondes sur Memoire.
    const m = new MeshBasicMaterial({ transparent: true, side: DoubleSide });
    expect(m.forceSinglePass).toBe(false);
    const avant = signatureMateriau(m);
    m.needsUpdate = true;
    m.needsUpdate = true;
    expect(signatureMateriau(m)).toBe(avant);
  });

  it("bouge quand meme si un modificateur arrive sur un materiau deux passes", () => {
    // C'est la seule chose qui change VRAIMENT son programme chez nous :
    // la cle de cache compte les modificateurs.
    const m = new MeshBasicMaterial({ transparent: true, side: DoubleSide });
    const avant = signatureMateriau(m);
    addShaderModifier(m, () => {});
    expect(signatureMateriau(m)).not.toBe(avant);
    const apresUn = signatureMateriau(m);
    addShaderModifier(m, () => {});
    expect(signatureMateriau(m)).not.toBe(apresUn);
  });

  it("surveille la version des que la passe unique est forcee", () => {
    const m = new MeshBasicMaterial({ transparent: true, side: DoubleSide, forceSinglePass: true });
    const avant = signatureMateriau(m);
    m.needsUpdate = true;
    expect(signatureMateriau(m)).not.toBe(avant);
  });

  it("surveille la version d'un materiau transparent en face avant", () => {
    const m = new MeshBasicMaterial({ transparent: true, side: FrontSide });
    const avant = signatureMateriau(m);
    m.needsUpdate = true;
    expect(signatureMateriau(m)).not.toBe(avant);
  });

  it("surveille la version d'un opaque en double face", () => {
    const m = new MeshBasicMaterial({ transparent: false, side: DoubleSide });
    const avant = signatureMateriau(m);
    m.needsUpdate = true;
    expect(signatureMateriau(m)).not.toBe(avant);
  });

  it("suit un materiau qui devient deux passes en cours de route", () => {
    const m = new MeshBasicMaterial({ transparent: false, side: DoubleSide });
    const opaque = signatureMateriau(m);
    m.transparent = true;
    // Il change de regime : la signature n'est plus la meme, et a partir de
    // la elle ne suivra plus la version.
    expect(signatureMateriau(m)).not.toBe(opaque);
    const deuxPasses = signatureMateriau(m);
    m.needsUpdate = true;
    expect(signatureMateriau(m)).toBe(deuxPasses);
  });
});
