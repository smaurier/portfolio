import { describe, expect, it } from "vitest";
import { createFrostState, FROST, frostStep, type FrostState } from "./frost";

/** Fait avancer la machine de `seconds` a progress constant, par pas de 1/60. */
function advance(state: FrostState, progress: number, seconds: number, reduced = false): FrostState {
  for (let t = 0; t < seconds; t += 1 / 60) frostStep(state, progress, 1 / 60, reduced);
  return state;
}

describe("frost : le monde gele de l'Est, l'explosion au lever, le regel en marche arriere", () => {
  it("au depart le monde est gele : givre plein, temps arrete, rien n'eclate", () => {
    const s = createFrostState();
    expect(s.phase).toBe("frozen");
    expect(s.frost).toBe(1);
    expect(s.timeScale).toBe(0);
    expect(s.shatter).toBe(0);
    expect(s.screen).toBe(0);
  });

  it("reste gele tant que le scroll n'atteint pas le lever", () => {
    const s = advance(createFrostState(), FROST.shatterAt - 0.01, 5);
    expect(s.phase).toBe("frozen");
    expect(s.frost).toBe(1);
  });

  it("au lever, tout eclate une fois : l'explosion se joue en temps reel, pas au scroll", () => {
    const s = createFrostState();
    frostStep(s, FROST.shatterAt + 0.01, 1 / 60, false);
    expect(s.phase).toBe("shatter");
    const early = s.shatter;
    advance(s, FROST.shatterAt + 0.01, FROST.shatterSeconds / 2);
    expect(s.shatter).toBeGreaterThan(early);
    expect(s.shatter).toBeLessThan(1);
    expect(s.timeScale).toBeGreaterThan(0);
    advance(s, FROST.shatterAt + 0.01, FROST.shatterSeconds);
    expect(s.phase).toBe("thawed");
    expect(s.frost).toBe(0);
    expect(s.timeScale).toBe(1);
    expect(s.shatter).toBe(1);
  });

  it("degele, on continue et on revient un peu : rien ne regele avant le seuil bas", () => {
    const s = advance(createFrostState(), 1, FROST.shatterSeconds + 1);
    advance(s, FROST.refreezeAt + 0.02, 3);
    expect(s.phase).toBe("thawed");
    expect(s.frost).toBe(0);
  });

  it("en marche arriere sous le seuil, l'ecran gele quelques instants puis le monde est de nouveau gele", () => {
    const s = advance(createFrostState(), 1, FROST.shatterSeconds + 1);
    frostStep(s, FROST.refreezeAt - 0.01, 1 / 60, false);
    expect(s.phase).toBe("refreeze");
    advance(s, FROST.refreezeAt - 0.01, FROST.refreezeSeconds * 0.4);
    expect(s.screen).toBeGreaterThan(0.5); // le givre couvre l'ecran
    expect(s.timeScale).toBe(0); // le temps s'arrete
    advance(s, FROST.refreezeAt - 0.01, FROST.refreezeSeconds);
    expect(s.phase).toBe("frozen");
    expect(s.frost).toBe(1);
    expect(s.screen).toBe(0);
    expect(s.shatter).toBe(0);
  });

  it("apres un regel, le lever fait de nouveau tout eclater", () => {
    const s = advance(createFrostState(), 1, FROST.shatterSeconds + 1);
    advance(s, 0, FROST.refreezeSeconds + 1);
    expect(s.phase).toBe("frozen");
    frostStep(s, 1, 1 / 60, false);
    expect(s.phase).toBe("shatter");
  });

  it("reduced-motion : pas d'explosion animee ni d'ecran gele, on passe d'un etat a l'autre", () => {
    const s = createFrostState();
    frostStep(s, 1, 1 / 60, true);
    expect(s.phase).toBe("thawed");
    expect(s.frost).toBe(0);
    frostStep(s, 0, 1 / 60, true);
    expect(s.phase).toBe("frozen");
    expect(s.screen).toBe(0);
  });

  it("le seuil de regel est sous le seuil d'explosion : pas de battement", () => {
    expect(FROST.refreezeAt).toBeLessThan(FROST.shatterAt);
  });
});
