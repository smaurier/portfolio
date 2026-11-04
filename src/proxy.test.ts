import { describe, expect, it } from "vitest";
import { config } from "./proxy";

/**
 * LE FILTRE DU PROXY DE LOCALE (04/11/2026).
 *
 * Ce proxy redirige vers une langue tout chemin qui n'en porte pas. Il
 * tourne en fonction EDGE chez Netlify, donc AVANT les fonctions : ce qu'il
 * attrape n'atteint jamais le reste.
 *
 * NE D'UN DEFAUT REEL. La page de mesure `/referents` est servie par une
 * fonction Netlify, hors de Next. Elle etait bien deployee
 * (`available_functions` la listait), mais le proxy redirigeait `/referents`
 * vers `/fr/referents`, qui n'existe dans aucune app : 307 puis 404, et la
 * fonction jamais atteinte. Une heure de diagnostic pour un chemin absent
 * d'une liste d'exclusions.
 *
 * Ce test juge le filtre LUI-MEME, pas le comportement du proxy : c'est le
 * filtre qui decide si le proxy tourne, et il n'etait garde par rien.
 */
const filtre = new RegExp(`^${config.matcher[0]}$`);

/** Vrai si le proxy s'en saisit, donc si le chemin part vers une locale. */
const attrape = (chemin: string) => filtre.test(chemin);

describe("ce que le proxy laisse passer sans y toucher", () => {
  // CHACUN DE CES CHEMINS EST SERVI HORS DE L'ARBRE [locale] : les rediriger
  // vers /fr/... donne un 404, et le defaut est silencieux (une redirection
  // reussit toujours, c'est la destination qui manque).
  it.each([
    ["/referents", "page de mesure, fonction Netlify hors de Next"],
    ["/api/quoi-que-ce-soit", "routes d'API"],
    ["/_next/static/truc", "interne du framework"],
    ["/apple-icon", "convention de metadonnees, sans extension"],
    ["/icon", "convention de metadonnees, sans extension"],
    ["/favicon.ico", "tout ce qui porte une extension"],
    ["/sitemap.xml", "tout ce qui porte une extension"],
    ["/robots.txt", "tout ce qui porte une extension"],
  ])("laisse %s tranquille (%s)", (chemin) => {
    expect(attrape(chemin)).toBe(false);
  });
});

describe("ce que le proxy doit bien attraper", () => {
  // L'INVERSE COMPTE AUTANT : une exclusion trop large rendrait le site
  // inaccessible sans locale, et ce test rougirait.
  it.each([["/"], ["/projets"], ["/services"], ["/contact"], ["/memoire"]])(
    "redirige %s vers une langue",
    (chemin) => {
      expect(attrape(chemin)).toBe(true);
    },
  );
});
