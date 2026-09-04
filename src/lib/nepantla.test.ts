import { describe, expect, it } from "vitest";
import {
  NEPANTLA_TIMING,
  enterOffset,
  exitOffset,
  journeyHour,
  sunJourney,
  swingAzimuth,
  swingSpeed,
  type NepantlaDirection,
} from "./nepantla";

const SLIDE_DIRECTIONS: NepantlaDirection[] = ["dore", "turquoise", "cendre", "obsidienne"];

describe("nepantla : offsets du contenu pendant le passage", () => {
  it("Est (dore) : le contenu sortant part a gauche, l'entrant arrive de droite", () => {
    expect(exitOffset("dore")).toEqual({ x: -1, y: 0, scale: 1 });
    expect(enterOffset("dore")).toEqual({ x: 1, y: 0, scale: 1 });
  });

  it("Sud (turquoise) : sortie vers le haut, entree par le bas", () => {
    expect(exitOffset("turquoise")).toEqual({ x: 0, y: -1, scale: 1 });
    expect(enterOffset("turquoise")).toEqual({ x: 0, y: 1, scale: 1 });
  });

  it("Ouest (cendre) : sortie a droite, entree de gauche", () => {
    expect(exitOffset("cendre")).toEqual({ x: 1, y: 0, scale: 1 });
    expect(enterOffset("cendre")).toEqual({ x: -1, y: 0, scale: 1 });
  });

  it("Nord (obsidienne) : sortie vers le bas, entree par le haut", () => {
    expect(exitOffset("obsidienne")).toEqual({ x: 0, y: 1, scale: 1 });
    expect(enterOffset("obsidienne")).toEqual({ x: 0, y: -1, scale: 1 });
  });

  it("chaque direction de glissement : l'entree est le miroir exact de la sortie", () => {
    for (const direction of SLIDE_DIRECTIONS) {
      const out = exitOffset(direction);
      const inn = enterOffset(direction);
      // Somme nulle plutot que negation stricte : Object.is(+0, -0) est faux.
      expect(inn.x + out.x).toBe(0);
      expect(inn.y + out.y).toBe(0);
      expect(out.scale).toBe(1);
      expect(inn.scale).toBe(1);
    }
  });

  it("Centre (jade) : implosion, pas de glissement : sortie retrecit, entree arrive plus grande", () => {
    const out = exitOffset("jade");
    const inn = enterOffset("jade");
    expect(out.x).toBe(0);
    expect(out.y).toBe(0);
    expect(out.scale).toBeLessThan(1);
    expect(inn.x).toBe(0);
    expect(inn.y).toBe(0);
    expect(inn.scale).toBeGreaterThan(1);
  });

  it("les offsets de glissement sont unitaires (fractions de viewport, jamais plus d'un ecran)", () => {
    for (const direction of SLIDE_DIRECTIONS) {
      for (const o of [exitOffset(direction), enterOffset(direction)]) {
        expect(Math.abs(o.x)).toBeLessThanOrEqual(1);
        expect(Math.abs(o.y)).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("nepantla : orbite continue de la camera (etage 2, plan-sequence)", () => {
  it("part du repos et finit au repos exact : un tour complet (2π), position periodique identique", () => {
    for (const direction of SLIDE_DIRECTIONS) {
      expect(swingAzimuth(0, direction)).toBeCloseTo(0, 10);
      expect(Math.abs(swingAzimuth(1, direction))).toBeCloseTo(Math.PI * 2, 10);
    }
  });

  it("ne revient JAMAIS en arriere : azimut monotone dans le sens de la direction", () => {
    for (const direction of SLIDE_DIRECTIONS) {
      const sign = Math.sign(swingAzimuth(1, direction));
      let previous = 0;
      for (let i = 1; i <= 100; i++) {
        const az = swingAzimuth(i / 100, direction);
        expect(az * sign).toBeGreaterThanOrEqual(previous * sign);
        previous = az;
      }
    }
  });

  it("Est et Ouest orbitent en sens opposes (on voyage VERS la direction)", () => {
    expect(Math.sign(swingAzimuth(1, "dore"))).toBe(-Math.sign(swingAzimuth(1, "cendre")));
  });

  it("Centre (jade) : pas d'orbite, retour au foyer par l'axe", () => {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      expect(swingAzimuth(t, "jade")).toBe(0);
    }
  });

  it("changement de vitesse : lent aux bornes, vitesse max au coeur du passage (la ou la nav se fait)", () => {
    expect(swingSpeed(0)).toBeCloseTo(0, 5);
    expect(swingSpeed(1)).toBeCloseTo(0, 5);
    expect(swingSpeed(0.5)).toBeCloseTo(1, 5);
    expect(swingSpeed(0.2)).toBeGreaterThan(0);
    expect(swingSpeed(0.2)).toBeLessThan(swingSpeed(0.35));
    // Symetrique : on accelere comme on decelere.
    expect(swingSpeed(0.25)).toBeCloseTo(swingSpeed(0.75), 10);
  });

  it("hors bornes : clampe (le progress GSAP peut deborder d'un epsilon)", () => {
    expect(swingAzimuth(-0.1, "dore")).toBe(0);
    expect(Math.abs(swingAzimuth(1.1, "dore"))).toBeCloseTo(Math.PI * 2, 10);
    expect(swingSpeed(-0.1)).toBe(0);
    expect(swingSpeed(1.1)).toBe(0);
  });
});

describe("nepantla : les heures du soleil traversees pendant le passage (etage 3)", () => {
  it("le temps ne recule jamais : Est vers Nord traverse zenith puis crepuscule", () => {
    expect(sunJourney("dore", "obsidienne")).toEqual(["dore", "turquoise", "cendre", "obsidienne"]);
  });

  it("Ouest vers Est traverse minuit (la nuit passe, l'aube revient)", () => {
    expect(sunJourney("cendre", "dore")).toEqual(["cendre", "obsidienne", "dore"]);
  });

  it("heures adjacentes : passage direct", () => {
    expect(sunJourney("obsidienne", "dore")).toEqual(["obsidienne", "dore"]);
    expect(sunJourney("dore", "turquoise")).toEqual(["dore", "turquoise"]);
  });

  it("le Centre est hors du temps : vers ou depuis jade, aucune heure intermediaire", () => {
    expect(sunJourney("jade", "obsidienne")).toEqual(["jade", "obsidienne"]);
    expect(sunJourney("turquoise", "jade")).toEqual(["turquoise", "jade"]);
  });

  it("meme direction : pas de voyage", () => {
    expect(sunJourney("dore", "dore")).toEqual(["dore"]);
  });

  it("journeyHour : commence a l'heure de depart, finit a l'heure d'arrivee", () => {
    expect(journeyHour("dore", "obsidienne", 0)).toBe("dore");
    expect(journeyHour("dore", "obsidienne", 1)).toBe("obsidienne");
    expect(journeyHour("jade", "cendre", 0)).toBe("jade");
    expect(journeyHour("jade", "cendre", 1)).toBe("cendre");
  });

  it("journeyHour : segments egaux, les heures intermediaires s'expriment", () => {
    // Est → Nord : 4 heures, quartiles.
    expect(journeyHour("dore", "obsidienne", 0.3)).toBe("turquoise");
    expect(journeyHour("dore", "obsidienne", 0.6)).toBe("cendre");
    expect(journeyHour("dore", "obsidienne", 0.9)).toBe("obsidienne");
  });

  it("journeyHour : clampe hors bornes", () => {
    expect(journeyHour("dore", "obsidienne", -0.5)).toBe("dore");
    expect(journeyHour("dore", "obsidienne", 1.5)).toBe("obsidienne");
  });
});

describe("nepantla : tempo partage du passage", () => {
  it("la sortie commence apres un temps de latence et finit avant la fin du progress (la nav se fait au coeur du mouvement)", () => {
    const exitEnd = NEPANTLA_TIMING.exitDelay + NEPANTLA_TIMING.exitDuration;
    expect(NEPANTLA_TIMING.exitDelay).toBeGreaterThan(0);
    expect(exitEnd).toBeLessThan(NEPANTLA_TIMING.progressDuration);
  });

  it("la navigation (fin de sortie) tombe dans la fenetre de vitesse max de l'orbite", () => {
    const navMoment = (NEPANTLA_TIMING.exitDelay + NEPANTLA_TIMING.exitDuration) / NEPANTLA_TIMING.progressDuration;
    expect(navMoment).toBeGreaterThanOrEqual(0.4);
    expect(navMoment).toBeLessThanOrEqual(0.6);
    expect(swingSpeed(navMoment)).toBeGreaterThan(0.9);
  });

  it("l'entree decelere plus longtemps que la sortie n'accelere (arrivee posee)", () => {
    expect(NEPANTLA_TIMING.enterDuration).toBeGreaterThan(NEPANTLA_TIMING.exitDuration);
  });

  it("les easings signent le changement de vitesse : acceleration a la sortie, deceleration a l'entree", () => {
    expect(NEPANTLA_TIMING.exitEase).toMatch(/\.in$/);
    expect(NEPANTLA_TIMING.enterEase).toMatch(/\.out$/);
  });
});
