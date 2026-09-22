import { describe, expect, it } from "vitest";
import { compterLignes } from "../../scripts/compter-lignes.mjs";

/**
 * LE COMPTE DE LIGNES DU HARNAIS EST CELUI D'ESLINT (mesure du 22/09).
 * `max-lines` ne compte pas la ligne vide apres le dernier retour a la
 * ligne ; `wc -l` non plus ; `split("\n").length` si.
 */
describe("compterLignes", () => {
  const corps = Array.from({ length: 400 }, (_, i) => `export const l${i} = ${i};`).join("\n");

  it("compte 400 lignes sans retour final", () => {
    expect(compterLignes(corps)).toBe(400);
  });

  it("compte 400 lignes avec retour final, comme max-lines et wc -l", () => {
    expect(compterLignes(corps + "\n")).toBe(400);
  });

  it("compte 401 lignes quand il y en a 401", () => {
    expect(compterLignes(corps + "\nexport const fin = 1;\n")).toBe(401);
  });

  it("compte 0 ligne pour un fichier vide", () => {
    expect(compterLignes("")).toBe(0);
  });
});
