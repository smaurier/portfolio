import { describe, expect, it } from "vitest";
import { Group, Mesh, Object3D } from "three";
import { creerSuiviAjouts } from "./ajouts-scene";

/** Les ecouteurs poses par three sur un objet, pour verifier qu'on n'en
 *  empile pas. */
function ecouteurs(o: Object3D): number {
  const l = (o as unknown as { _listeners?: Record<string, unknown[]> })._listeners;
  return l?.childadded?.length ?? 0;
}

describe("creerSuiviAjouts (savoir si un objet a pu apparaitre)", () => {
  it("est sale a la naissance : rien n'a encore ete balaye", () => {
    expect(creerSuiviAjouts().sale()).toBe(true);
  });

  it("devient propre apres un balayage declare", () => {
    const s = creerSuiviAjouts();
    s.marquerPropre();
    expect(s.sale()).toBe(false);
  });

  it("se salit des qu'un enfant arrive sous un objet surveille", () => {
    const s = creerSuiviAjouts();
    const racine = new Group();
    s.surveiller(racine);
    s.marquerPropre();
    racine.add(new Mesh());
    expect(s.sale()).toBe(true);
  });

  it("se salit aussi en profondeur, sous un petit-enfant surveille", () => {
    const s = creerSuiviAjouts();
    const racine = new Group();
    const branche = new Object3D();
    racine.add(branche);
    for (const o of [racine, branche]) s.surveiller(o);
    s.marquerPropre();
    branche.add(new Mesh());
    expect(s.sale()).toBe(true);
  });

  it("voit arriver un sous-arbre entier monte a l'ecart", () => {
    const s = creerSuiviAjouts();
    const racine = new Group();
    s.surveiller(racine);
    s.marquerPropre();
    // Un modele se construit detache, puis s'accroche : c'est le cas de
    // Suspense, et c'est celui qui doit absolument reveiller le balayage.
    const modele = new Group();
    modele.add(new Mesh(), new Mesh());
    racine.add(modele);
    expect(s.sale()).toBe(true);
  });

  it("voit aussi `attach`, qui n'est pas `add`", () => {
    const s = creerSuiviAjouts();
    const racine = new Group();
    s.surveiller(racine);
    s.marquerPropre();
    racine.attach(new Mesh());
    expect(s.sale()).toBe(true);
  });

  it("reste propre pour un ajout hors de ce qu'on surveille", () => {
    // Le contrat, dit a l'endroit : on ne sait que des objets qu'on a vus.
    // Un balayage doit donc surveiller TOUT ce qu'il traverse.
    const s = creerSuiviAjouts();
    s.marquerPropre();
    new Group().add(new Mesh());
    expect(s.sale()).toBe(false);
  });

  it("n'empile pas deux ecouteurs sur le meme objet", () => {
    const s = creerSuiviAjouts();
    const racine = new Group();
    s.surveiller(racine);
    s.surveiller(racine);
    expect(ecouteurs(racine)).toBe(1);
  });

  it("compte les objets surveilles, une seule fois chacun", () => {
    const s = creerSuiviAjouts();
    const a = new Group();
    const b = new Mesh();
    s.surveiller(a);
    s.surveiller(b);
    s.surveiller(a);
    expect(s.taille()).toBe(2);
  });

  it("se salit quand un objet retire revient", () => {
    const s = creerSuiviAjouts();
    const racine = new Group();
    const enfant = new Mesh();
    racine.add(enfant);
    s.surveiller(racine);
    s.surveiller(enfant);
    enfant.removeFromParent();
    s.marquerPropre();
    racine.add(enfant);
    expect(s.sale()).toBe(true);
  });
});
