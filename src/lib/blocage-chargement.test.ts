import { describe, expect, it } from "vitest";
import { avancerVeille, veilleInitiale } from "./blocage-chargement";

const SEUIL = 15_000;

describe("la veille du chargement bloque", () => {
  it("ne declare rien au depart", () => {
    expect(veilleInitiale(0, 1_000).bloque).toBe(false);
  });

  it("une valeur qui bouge repousse l'echeance", () => {
    let v = veilleInitiale(0, 0);
    v = avancerVeille(v, 0, 14_000, SEUIL);
    expect(v.bloque, "pas encore le seuil").toBe(false);
    v = avancerVeille(v, 40, 14_500, SEUIL);
    v = avancerVeille(v, 40, 28_000, SEUIL);
    expect(v.bloque, "13,5 s depuis le dernier mouvement, pas 28").toBe(false);
  });

  it("une valeur figee au-dela du seuil declare le blocage", () => {
    let v = veilleInitiale(40, 0);
    v = avancerVeille(v, 40, SEUIL, SEUIL);
    expect(v.bloque).toBe(true);
  });

  // Un chargement fini n'a rien a sauver : c'est la porte normale qui
  // s'ouvre, pas le dernier recours.
  it("ne declare jamais bloque un chargement complet", () => {
    let v = veilleInitiale(100, 0);
    v = avancerVeille(v, 100, 600_000, SEUIL);
    expect(v.bloque).toBe(false);
  });

  // Sinon le voile pourrait se refermer : une fois le visiteur entre, on
  // n'y revient pas.
  it("une fois declare, le blocage ne se retracte pas", () => {
    let v = veilleInitiale(40, 0);
    v = avancerVeille(v, 40, SEUIL, SEUIL);
    v = avancerVeille(v, 60, SEUIL + 1_000, SEUIL);
    expect(v.bloque).toBe(true);
  });
});
