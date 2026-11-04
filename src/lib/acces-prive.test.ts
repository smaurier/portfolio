import { describe, expect, it } from "vitest";
import { identifiantsValides } from "./acces-prive";

describe("identifiantsValides (la porte de la page de lecture)", () => {
  const attendu = { utilisateur: "sylvain", motDePasse: "un-secret-long" };
  const bon = `Basic ${Buffer.from("sylvain:un-secret-long").toString("base64")}`;

  it("laisse passer les bons identifiants", () => {
    expect(identifiantsValides(bon, attendu)).toBe(true);
  });

  it("refuse un mot de passe faux, un utilisateur faux, et les deux", () => {
    expect(identifiantsValides(`Basic ${Buffer.from("sylvain:faux").toString("base64")}`, attendu)).toBe(false);
    expect(identifiantsValides(`Basic ${Buffer.from("autre:un-secret-long").toString("base64")}`, attendu)).toBe(false);
    expect(identifiantsValides(`Basic ${Buffer.from("autre:faux").toString("base64")}`, attendu)).toBe(false);
  });

  it("refuse une absence d'en-tete, un schema inconnu, un base64 casse", () => {
    expect(identifiantsValides(null, attendu)).toBe(false);
    expect(identifiantsValides("Bearer jeton", attendu)).toBe(false);
    expect(identifiantsValides("Basic %%%", attendu)).toBe(false);
  });

  // UN MOT DE PASSE QUI CONTIENT UN DEUX-POINTS reste valide : la norme dit
  // que seul le PREMIER deux-points separe. Couper sur tous les deux-points
  // rejetterait un mot de passe legitime, et pousserait a en choisir un plus
  // faible.
  it("accepte un mot de passe contenant un deux-points", () => {
    const avecDeuxPoints = { utilisateur: "sylvain", motDePasse: "a:b:c" };
    const entete = `Basic ${Buffer.from("sylvain:a:b:c").toString("base64")}`;
    expect(identifiantsValides(entete, avecDeuxPoints)).toBe(true);
  });

  // LA PORTE NE S'OUVRE JAMAIS SUR UNE CONFIGURATION MANQUANTE. Si la
  // variable d'environnement n'est pas posee, l'attendu est vide : sans ce
  // garde-fou, un en-tete vide ouvrirait la page a tout le monde.
  it("refuse tout quand l'attendu est vide, meme un en-tete qui lui correspond", () => {
    const vide = { utilisateur: "", motDePasse: "" };
    expect(identifiantsValides(`Basic ${Buffer.from(":").toString("base64")}`, vide)).toBe(false);
    expect(identifiantsValides(bon, vide)).toBe(false);
  });
});
