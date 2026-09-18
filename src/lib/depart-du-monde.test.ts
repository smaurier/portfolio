import { describe, expect, it } from "vitest";
import { DEPART, avancerPresenceMonde, enfoncementMonde, mondeSeDessine } from "./depart-du-monde";

describe("avancerPresenceMonde (le monde vient, le monde s'en va)", () => {
  it("monte vers un, et s'y colle au lieu de l'approcher sans fin", () => {
    let p = 0;
    for (let i = 0; i < 400; i += 1) p = avancerPresenceMonde(p, 1, 0.06);
    expect(p).toBe(1);
  });

  it("redescend vers zero, et s'y colle aussi", () => {
    let p = 1;
    for (let i = 0; i < 400; i += 1) p = avancerPresenceMonde(p, 0, 0.06);
    expect(p).toBe(0);
  });

  it("le monde a le temps de partir avant d'etre demonte", () => {
    // `MountForDirection` garde le sous-arbre 2 500 ms apres le depart : la
    // descente doit tenir dedans, sinon le monde serait supprime en plein
    // geste, ce qui est exactement ce qu'on corrige.
    let p = 1;
    let images = 0;
    while (p > 0 && images < 1000) { p = avancerPresenceMonde(p, 0, 0.06); images += 1; }
    expect(images / 60).toBeLessThan(2.5);
  });

  it("mouvement reduit : la cible est posee tout de suite", () => {
    expect(avancerPresenceMonde(0, 1, 1)).toBe(1);
    expect(avancerPresenceMonde(1, 0, 1)).toBe(0);
  });

  it("ne depasse jamais, dans aucun sens", () => {
    let p = 0;
    for (let i = 0; i < 200; i += 1) {
      p = avancerPresenceMonde(p, 1, 0.3);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });
});

describe("enfoncementMonde (de combien il est encore sous la terre)", () => {
  it("sous terre a zero, en place a un", () => {
    expect(enfoncementMonde(0)).toBe(DEPART.profondeur);
    expect(enfoncementMonde(1)).toBe(0);
  });

  it("ne remonte jamais quand la presence monte", () => {
    let precedent = Infinity;
    for (let p = 0; p <= 1.0001; p += 0.02) {
      const e = enfoncementMonde(p);
      expect(e).toBeLessThanOrEqual(precedent);
      precedent = e;
    }
  });

  it("PART ET ARRIVE EN DOUCEUR : la derivee est nulle aux deux bouts", () => {
    // Une rampe lineaire ferait demarrer le monde a pleine vitesse, ce qui
    // est un a-coup de plus, pas un depart. Meme exigence que la venue des
    // porteuses et que tous les fondus du site.
    const auDepart = enfoncementMonde(0) - enfoncementMonde(0.02);
    const auMilieu = enfoncementMonde(0.49) - enfoncementMonde(0.51);
    const aLArrivee = enfoncementMonde(0.98) - enfoncementMonde(1);
    expect(auDepart).toBeLessThan(auMilieu / 4);
    expect(aLArrivee).toBeLessThan(auMilieu / 4);
  });
});

describe("mondeSeDessine (ce qu'on ne paie plus)", () => {
  it("un monde entierement sous la terre n'est pas dessine", () => {
    expect(mondeSeDessine(0)).toBe(false);
  });

  it("des qu'il commence a sortir, il se dessine", () => {
    expect(mondeSeDessine(0.02)).toBe(true);
    expect(mondeSeDessine(1)).toBe(true);
  });
});
