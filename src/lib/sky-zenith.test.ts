import { describe, expect, it } from "vitest";
import { horizonLuminance, skyDaylight, zenithInto, zenithSpread, ZENITH_PULL, ZENITH_SPREAD_DAY, ZENITH_SPREAD_NIGHT, type Rgb } from "./sky-zenith";

const deep: Rgb = { r: 0.02, g: 0.13, b: 0.4 };
const predawn: Rgb = { r: 0.03, g: 0.05, b: 0.16 };
const noir: Rgb = { r: 0, g: 0, b: 0 };

/** La regle d'origine, celle du 05/09, gardee ici comme oracle. */
function origine(horizon: Rgb, daylight: number): Rgb {
  const t = ZENITH_PULL * daylight;
  return {
    r: horizon.r + (deep.r - horizon.r) * t,
    g: horizon.g + (deep.g - horizon.g) * t,
    b: horizon.b + (deep.b - horizon.b) * t,
  };
}

describe("sky-zenith : le zenith du dome", () => {
  it("SANS couleur de nuit, rend exactement la regle d'origine", () => {
    // La preuve qui compte : le Sud et l'Ouest ne bougent pas d'un poil.
    // Leur nuit noire est voulue (les 400 etoiles viennent s'y poser).
    for (const horizon of [noir, { r: 0.02, g: 0.03, b: 0.05 }, { r: 0.3, g: 0.4, b: 0.55 }, { r: 0.8, g: 0.9, b: 1 }]) {
      for (const d of [0, 0.17, 0.5, 0.83, 1]) {
        const attendu = origine(horizon, d);
        const obtenu = zenithInto({ r: 0, g: 0, b: 0 }, horizon, deep, null, d);
        expect(obtenu.r).toBeCloseTo(attendu.r, 12);
        expect(obtenu.g).toBeCloseTo(attendu.g, 12);
        expect(obtenu.b).toBeCloseTo(attendu.b, 12);
      }
    }
  });

  it("a l'Est, un horizon noir ne donne plus un zenith noir", () => {
    const z = zenithInto({ r: 0, g: 0, b: 0 }, noir, deep, predawn, skyDaylight(horizonLuminance(noir)));
    expect(z, "la nuit d'avant-jour est exactement la couleur donnee").toEqual(predawn);
    expect(z.b, "et elle est bleue, pas grise").toBeGreaterThan(z.r * 2);
  });

  it("en plein jour, la couleur de nuit n'influence plus rien", () => {
    // Sinon l'Est aurait un zenith fausse a midi, alors que son aube est finie.
    const horizon = { r: 0.7, g: 0.8, b: 0.95 };
    const avec = zenithInto({ r: 0, g: 0, b: 0 }, horizon, deep, predawn, 1);
    const sans = zenithInto({ r: 0, g: 0, b: 0 }, horizon, deep, null, 1);
    expect(avec).toEqual(sans);
  });

  it("passe de la nuit au jour sans saut", () => {
    let precedent = zenithInto({ r: 0, g: 0, b: 0 }, noir, deep, predawn, 0);
    for (let i = 1; i <= 20; i += 1) {
      const horizon = { r: 0.02 * i, g: 0.025 * i, b: 0.03 * i };
      const z = zenithInto({ r: 0, g: 0, b: 0 }, horizon, deep, predawn, skyDaylight(horizonLuminance(horizon)));
      const saut = Math.abs(z.r - precedent.r) + Math.abs(z.g - precedent.g) + Math.abs(z.b - precedent.b);
      expect(saut, "un ciel qui saute se voit comme un clignotement").toBeLessThan(0.2);
      precedent = z;
    }
  });

  it("accepte d'ecrire dans l'horizon lui-meme", () => {
    // Cote scene, la cible est parfois l'uniforme deja rempli : la fonction
    // doit tout lire avant d'ecrire, sinon les canaux se contaminent.
    const cible: Rgb = { r: 0.3, g: 0.4, b: 0.5 };
    const attendu = zenithInto({ r: 0, g: 0, b: 0 }, { ...cible }, deep, null, 0.5);
    zenithInto(cible, cible, deep, null, 0.5);
    expect(cible).toEqual(attendu);
  });

  it("borne la luminosite et tolere les valeurs manquantes", () => {
    expect(skyDaylight(0.5)).toBe(1);
    expect(skyDaylight(-1)).toBe(0);
    expect(skyDaylight(Number.NaN)).toBe(0);
    expect(horizonLuminance({ r: Number.NaN, g: 0, b: 0 })).toBe(0);
    const z = zenithInto({ r: 9, g: 9, b: 9 }, noir, deep, predawn, Number.NaN);
    expect(z).toEqual(predawn);
  });
});

describe("sky-zenith : ou le degrade atteint sa couleur", () => {
  it("ne change JAMAIS sans couleur de nuit", () => {
    for (const d of [0, 0.3, 0.7, 1, Number.NaN, -5]) {
      expect(zenithSpread(false, d)).toBe(ZENITH_SPREAD_DAY);
    }
  });

  it("monte vite la nuit, revient a la courbe d'origine de jour", () => {
    expect(zenithSpread(true, 0)).toBe(ZENITH_SPREAD_NIGHT);
    expect(zenithSpread(true, 1)).toBe(ZENITH_SPREAD_DAY);
    expect(zenithSpread(true, 0.5)).toBeCloseTo((ZENITH_SPREAD_NIGHT + ZENITH_SPREAD_DAY) / 2, 12);
  });

  it("met la couleur de nuit dans la bande REELLEMENT vue", () => {
    // Le regard de l'Est est pique : le haut du cadre est a 14 degres
    // au-dessus de l'horizon, soit vDir.y = 0,24. C'est la seule mesure qui
    // compte, et l'ancienne courbe y rendait moins d'un cinquieme.
    const hautDuCadre = 0.24;
    const part = (spread: number) => {
      const x = Math.min(1, Math.max(0, hautDuCadre / spread));
      return x * x * (3 - 2 * x);
    };
    expect(part(ZENITH_SPREAD_DAY), "l'ancienne courbe laissait le ciel noir").toBeLessThan(0.2);
    expect(part(zenithSpread(true, 0)), "la nouvelle le remplit").toBeGreaterThan(0.85);
  });

  it("borne la part de jour", () => {
    expect(zenithSpread(true, 5)).toBe(ZENITH_SPREAD_DAY);
    expect(zenithSpread(true, Number.NaN)).toBe(ZENITH_SPREAD_NIGHT);
  });
});
