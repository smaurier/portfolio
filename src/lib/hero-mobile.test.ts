import { describe, expect, it } from "vitest";
import { HERO_TEXTE_SEUIL, heroTexteVisible } from "./hero-mobile";

/**
 * L'ACCUEIL MOBILE (04/10, lecture de Sylvain sur son telephone : « texte
 * omnipresent, on ne voit que ca »). Sur un ecran de 392 px, le paragraphe
 * du hero fait six lignes et la carte couvre 70 % de la hauteur, la scene
 * disparait derriere. Variante choisie sur captures (V1) : la premiere
 * image montre le titre, la ligne de seuil et l'appel ; le paragraphe
 * n'entre dans la carte qu'au premier defilement. Meme DOM, rien de perdu,
 * l'ordre change : d'abord l'image, puis le texte. Ce module est pur.
 */
describe("le paragraphe du hero sur telephone", () => {
  it("est cache tant que l'on n'a pas fait defiler", () => {
    expect(heroTexteVisible(0)).toBe(false);
    expect(heroTexteVisible(HERO_TEXTE_SEUIL / 2)).toBe(false);
  });
  it("apparait des le premier defilement, et reste", () => {
    expect(heroTexteVisible(HERO_TEXTE_SEUIL)).toBe(true);
    expect(heroTexteVisible(0.1)).toBe(true);
    expect(heroTexteVisible(1)).toBe(true);
  });
  it("le seuil est un geste, pas un cran : entre un et trois centiemes de l'arc", () => {
    expect(HERO_TEXTE_SEUIL).toBeGreaterThanOrEqual(0.01);
    expect(HERO_TEXTE_SEUIL).toBeLessThanOrEqual(0.03);
  });
  it("borne le progres", () => {
    expect(heroTexteVisible(-1)).toBe(false);
    expect(heroTexteVisible(2)).toBe(true);
  });
});
