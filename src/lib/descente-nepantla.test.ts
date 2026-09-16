import { describe, expect, it, vi } from "vitest";
import { descendreVersLaNuit, garantirLeHaut, type ContexteDescente, type MoteurDefilement } from "./descente-nepantla";

function banc(over: Partial<ContexteDescente> = {}) {
  const scrollTo = vi.fn();
  const sansMoteur = vi.fn();
  const moteur: MoteurDefilement = { scrollTo };
  const ctx: ContexteDescente = {
    moteur,
    sansMoteur,
    defilement: 1200,
    mouvementReduit: false,
    ...over,
  };
  return { ctx, scrollTo, sansMoteur };
}

describe("descendreVersLaNuit", () => {
  it("glisse vers zero sur la duree du passage", () => {
    const { ctx, scrollTo } = banc();
    expect(descendreVersLaNuit(ctx, 0.95)).toBe("glisse");
    expect(scrollTo).toHaveBeenCalledWith(0, expect.objectContaining({ duration: 0.95 }));
  });

  it("FORCE le moteur : la classe de transition peut l'avoir verrouille", () => {
    // `nahual-transitioning` coupe les evenements de pointeur pendant le
    // passage ; sans `force`, Lenis refuserait de bouger et la descente ne
    // se jouerait jamais, en silence.
    const { ctx, scrollTo } = banc();
    descendreVersLaNuit(ctx, 0.95);
    expect(scrollTo).toHaveBeenCalledWith(0, expect.objectContaining({ force: true }));
  });

  it("ne fait rien quand on est deja en haut", () => {
    const { ctx, scrollTo, sansMoteur } = banc({ defilement: 0 });
    expect(descendreVersLaNuit(ctx, 0.95)).toBe("rien");
    expect(scrollTo).not.toHaveBeenCalled();
    expect(sansMoteur).not.toHaveBeenCalled();
  });

  it("mouvement reduit : on se pose en haut, sans glissade", () => {
    // RGAA 13.6 : un defilement anime qu'on n'a pas demande est exactement
    // ce que la preference refuse.
    const { ctx, scrollTo } = banc({ mouvementReduit: true });
    expect(descendreVersLaNuit(ctx, 0.95)).toBe("immediat");
    expect(scrollTo).toHaveBeenCalledWith(0, expect.objectContaining({ immediate: true }));
  });

  it("sans moteur lisse, le repli natif, et il saute", () => {
    // Lenis n'est pas monte du tout en mouvement reduit (smooth-scroll).
    const { ctx, sansMoteur } = banc({ moteur: null });
    expect(descendreVersLaNuit(ctx, 0.95)).toBe("immediat");
    expect(sansMoteur).toHaveBeenCalledWith(0);
  });

  it("un defilement negatif (rebond de navigateur) compte comme le haut", () => {
    const { ctx, scrollTo } = banc({ defilement: -40 });
    expect(descendreVersLaNuit(ctx, 0.95)).toBe("rien");
    expect(scrollTo).not.toHaveBeenCalled();
  });
});

describe("garantirLeHaut (le filet, a la fin du passage)", () => {
  it("se pose franchement quand il reste du defilement", () => {
    const { ctx, scrollTo } = banc({ defilement: 418 });
    expect(garantirLeHaut(ctx)).toBe(true);
    expect(scrollTo).toHaveBeenCalledWith(0, expect.objectContaining({ immediate: true }));
  });

  it("ne touche a rien quand on y est deja", () => {
    const { ctx, scrollTo, sansMoteur } = banc({ defilement: 0 });
    expect(garantirLeHaut(ctx)).toBe(false);
    expect(scrollTo).not.toHaveBeenCalled();
    expect(sansMoteur).not.toHaveBeenCalled();
  });

  it("tient meme sans moteur lisse", () => {
    const { ctx, sansMoteur } = banc({ moteur: null, defilement: 418 });
    expect(garantirLeHaut(ctx)).toBe(true);
    expect(sansMoteur).toHaveBeenCalledWith(0);
  });
});
