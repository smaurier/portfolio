import { describe, expect, it } from "vitest";
import { buildInstantSearch, parseInstant, shouldOfferResume, type LastVisit } from "./instant-link";

/**
 * LE LIEN PORTE SA VERSION (03/10). Le 20/09, « l'arc dure la page » a change
 * la longueur de l'arc sur chaque page : un `?t=0.9` partage avant renvoyait
 * 5,6 fenetres trop bas sur Memoire. Sylvain a peut-etre diffuse de tels
 * liens. Donc un lien neuf porte `v=2`, et un `?t=` sans version est un lien
 * d'avant : on l'ouvre en haut de page, sans surprise, plutot que de viser
 * un moment qui n'a plus de traduction. `scene=1` n'a jamais change de sens
 * et reste lu quelle que soit la version.
 */
describe("le lien de l'instant : encoder / lire le moment de l'arc dans l'URL", () => {
  it("encode le progres a trois decimales, la version de l'arc, et l'etat scene seule", () => {
    expect(buildInstantSearch({ t: 0.61234, sceneOnly: true })).toBe("?t=0.612&v=2&scene=1");
    expect(buildInstantSearch({ t: 0, sceneOnly: false })).toBe("?t=0&v=2");
  });

  it("borne le progres dans [0, 1]", () => {
    expect(buildInstantSearch({ t: -1, sceneOnly: false })).toBe("?t=0&v=2");
    expect(buildInstantSearch({ t: 3, sceneOnly: false })).toBe("?t=1&v=2");
  });

  it("lit l'URL, tolere l'absence et les valeurs cassees", () => {
    expect(parseInstant("?t=0.5&v=2&scene=1")).toEqual({ t: 0.5, sceneOnly: true });
    expect(parseInstant("?t=0.5&v=2")).toEqual({ t: 0.5, sceneOnly: false });
    expect(parseInstant("?scene=1")).toEqual({ t: null, sceneOnly: true });
    expect(parseInstant("")).toEqual({ t: null, sceneOnly: false });
    expect(parseInstant("?t=abc&v=2")).toEqual({ t: null, sceneOnly: false });
    expect(parseInstant("?t=9&v=2")).toEqual({ t: 1, sceneOnly: false });
    expect(parseInstant("?xiuhcoatl=1&t=0.25&v=2")).toEqual({ t: 0.25, sceneOnly: false });
  });

  it("un lien d'avant le 20/09 (sans version, ou d'une autre version) ouvre en haut de page ; scene=1 reste lu", () => {
    expect(parseInstant("?t=0.9")).toEqual({ t: null, sceneOnly: false });
    expect(parseInstant("?t=0.9&scene=1")).toEqual({ t: null, sceneOnly: true });
    expect(parseInstant("?t=0.9&v=1")).toEqual({ t: null, sceneOnly: false });
    expect(parseInstant("?t=0.9&v=3")).toEqual({ t: null, sceneOnly: false });
  });

  it("un lien neuf se relit tel qu'il s'ecrit", () => {
    expect(parseInstant(buildInstantSearch({ t: 0.5, sceneOnly: true }))).toEqual({ t: 0.5, sceneOnly: true });
  });
});

describe("reprendre ou j'etais", () => {
  const visit: LastVisit = { path: "/fr/projets", t: 0.42, at: 1000 };

  it("propose de reprendre sur l'accueil, si la derniere visite etait ailleurs et deja engagee", () => {
    expect(shouldOfferResume(visit, "/fr", 2000)).toBe(true);
  });

  it("ne propose rien sur la page de la visite elle-meme, ni si l'arc n'avait pas commence", () => {
    expect(shouldOfferResume(visit, "/fr/projets", 2000)).toBe(false);
    expect(shouldOfferResume({ ...visit, t: 0.02 }, "/fr", 2000)).toBe(false);
  });

  it("ne propose rien sans visite, ni au-dela de 30 jours", () => {
    expect(shouldOfferResume(null, "/fr", 2000)).toBe(false);
    expect(shouldOfferResume(visit, "/fr", 1000 + 31 * 24 * 3600 * 1000)).toBe(false);
  });
});
