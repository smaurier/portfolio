import { describe, expect, it } from "vitest";
import { composer, luminanceRelative, parseCouleurCss, ratioDeContraste } from "./contraste-wcag";

describe("parseCouleurCss", () => {
  it("lit un rgb() opaque", () => {
    expect(parseCouleurCss("rgb(10, 8, 14)")).toEqual([10, 8, 14, 1]);
  });

  it("lit un rgba() avec alpha decimal", () => {
    expect(parseCouleurCss("rgba(10, 8, 14, 0.96)")).toEqual([10, 8, 14, 0.96]);
  });

  it("rejette une valeur qui n'est pas une couleur", () => {
    expect(() => parseCouleurCss("transparent")).toThrow();
  });
});

describe("composer", () => {
  it("alpha 1 : ignore totalement le fond", () => {
    expect(composer([10, 8, 14, 1], [255, 255, 255])).toEqual([10, 8, 14]);
  });

  it("alpha 0 : rend le fond tel quel", () => {
    expect(composer([10, 8, 14, 0], [255, 255, 255])).toEqual([255, 255, 255]);
  });

  it("alpha 0.5 : moyenne les deux couleurs", () => {
    expect(composer([0, 0, 0, 0.5], [255, 255, 255])).toEqual([127.5, 127.5, 127.5]);
  });
});

describe("luminanceRelative", () => {
  it("blanc pur vaut 1", () => {
    expect(luminanceRelative([255, 255, 255])).toBeCloseTo(1, 5);
  });

  it("noir pur vaut 0", () => {
    expect(luminanceRelative([0, 0, 0])).toBeCloseTo(0, 5);
  });
});

describe("ratioDeContraste", () => {
  it("noir sur blanc : 21:1 (le maximum WCAG)", () => {
    expect(ratioDeContraste([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 1);
  });

  it("une couleur sur elle-meme : 1:1", () => {
    expect(ratioDeContraste([100, 50, 200], [100, 50, 200])).toBeCloseTo(1, 5);
  });

  it("est symetrique (l'ordre des deux couleurs ne change rien)", () => {
    const a: [number, number, number] = [240, 230, 210];
    const b: [number, number, number] = [20, 15, 30];
    expect(ratioDeContraste(a, b)).toBeCloseTo(ratioDeContraste(b, a), 5);
  });

  it("regression reelle : le panneau mobile en face claire avant correctif (01/11)", () => {
    // Fond du panel (rgba(10, 8, 14, 0.96), compose sur le papier clair
    // #f3ece0) contre le texte --ink-warm de la face claire (#1d1626) :
    // mesure sur le site, loin sous le seuil AA de 4,5:1 — le defaut que
    // Sylvain a vu en se montrant son propre portfolio sur mobile.
    const fondPanel = composer(parseCouleurCss("rgba(10, 8, 14, 0.96)"), [243, 236, 224]);
    const texte: [number, number, number] = [29, 22, 38];
    expect(ratioDeContraste(fondPanel, texte)).toBeLessThan(1.3);
  });

  it("regression reelle : le meme panneau, fond theme apres correctif", () => {
    // Apres correctif, le panel reprend --panel-deep-rgb (236, 228, 214 en
    // face claire) au lieu du noir en dur : meme texte, ratio AA large.
    const fondPanel = composer([236, 228, 214, 0.96], [243, 236, 224]);
    const texte: [number, number, number] = [29, 22, 38];
    expect(ratioDeContraste(fondPanel, texte)).toBeGreaterThan(10);
  });
});
