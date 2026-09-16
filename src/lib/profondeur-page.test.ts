import { describe, expect, it } from "vitest";
import {
  calculerProfondeur,
  creerLecteurProfondeur,
  PEREMPTION_MS,
  type SourceProfondeur,
} from "./profondeur-page";

describe("calculerProfondeur", () => {
  it("vaut 0 en haut de page", () => {
    expect(calculerProfondeur(0, 2000)).toBe(0);
  });

  it("vaut 1 en bas de page", () => {
    expect(calculerProfondeur(2000, 2000)).toBe(1);
  });

  it("ne depasse jamais 1, meme sur un rebond de defilement", () => {
    expect(calculerProfondeur(2400, 2000)).toBe(1);
  });

  it("ne descend jamais sous 0, meme sur un rebond vers le haut", () => {
    expect(calculerProfondeur(-120, 2000)).toBe(0);
  });

  it("vaut 1 quand la page tient dans la fenetre", () => {
    expect(calculerProfondeur(0, 0)).toBe(1);
    expect(calculerProfondeur(0, -40)).toBe(1);
  });

  it("interpole lineairement entre les deux", () => {
    expect(calculerProfondeur(500, 2000)).toBeCloseTo(0.25, 6);
  });
});

function banc(hauteur = 3000) {
  let hauteurs = 0;
  let t = 0;
  let y = 0;
  let utile = hauteur;
  const source: SourceProfondeur = {
    hauteurUtile: () => {
      hauteurs += 1;
      return utile;
    },
    defilement: () => y,
    maintenant: () => t,
  };
  return {
    lecteur: creerLecteurProfondeur(source),
    lectures: () => hauteurs,
    defiler: (v: number) => {
      y = v;
    },
    avancer: (ms: number) => {
      t += ms;
    },
    redimensionner: (v: number) => {
      utile = v;
    },
  };
}

describe("creerLecteurProfondeur", () => {
  it("suit le defilement", () => {
    const b = banc(2000);
    b.defiler(1000);
    expect(b.lecteur.lire()).toBeCloseTo(0.5, 6);
  });

  it("NE LIT JAMAIS la hauteur depuis `lire` : c'est tout l'interet", () => {
    const b = banc();
    b.lecteur.lire();
    expect(b.lectures()).toBe(1); // le tout premier appel, et lui seul
    for (let i = 0; i < 60; i += 1) {
      b.avancer(1000 / 60);
      b.defiler(i * 10);
      b.lecteur.lire();
    }
    // Soixante images de plus, et pas une lecture de mise en page : c'est
    // l'ecouteur `scroll` qui rafraichit, jamais la boucle.
    expect(b.lectures()).toBe(1);
  });

  it("`rafraichir` relit, mais seulement passe la peremption", () => {
    const b = banc();
    b.lecteur.lire();
    expect(b.lectures()).toBe(1);
    b.lecteur.rafraichir();
    expect(b.lectures()).toBe(1); // trop tot
    b.avancer(PEREMPTION_MS + 1);
    b.lecteur.rafraichir();
    expect(b.lectures()).toBe(2);
  });

  it("prend la nouvelle hauteur au rafraichissement suivant", () => {
    const b = banc(2000);
    b.defiler(1000);
    expect(b.lecteur.lire()).toBeCloseTo(0.5, 6);
    b.redimensionner(4000);
    b.avancer(PEREMPTION_MS / 2);
    b.lecteur.rafraichir();
    expect(b.lecteur.lire()).toBeCloseTo(0.5, 6); // trop tot, encore en cache
    b.avancer(PEREMPTION_MS);
    b.lecteur.rafraichir();
    expect(b.lecteur.lire()).toBeCloseTo(0.25, 6);
  });

  it("relit la hauteur des qu'on l'oublie, sans attendre la peremption", () => {
    const b = banc(2000);
    b.defiler(1000);
    expect(b.lecteur.lire()).toBeCloseTo(0.5, 6);
    b.redimensionner(4000);
    b.lecteur.oublier();
    expect(b.lecteur.lire()).toBeCloseTo(0.25, 6);
  });
});
