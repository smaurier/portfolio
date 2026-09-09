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
    advance(s, FROST.shatterAt + 0.01, FROST.preludeSeconds + FROST.shatterSeconds / 2);
    expect(s.shatter).toBeGreaterThan(early);
    expect(s.shatter).toBeLessThan(1);
    expect(s.timeScale).toBeGreaterThan(0);
    advance(s, FROST.shatterAt + 0.01, FROST.shatterSeconds);
    expect(s.phase).toBe("thawed");
    expect(s.frost).toBe(0);
    expect(s.timeScale).toBe(1);
    expect(s.shatter).toBe(1);
  });

  it("le prelude : les dards volent, le monde reste gele, rien n'eclate encore", () => {
    const s = createFrostState();
    frostStep(s, 1, 1 / 60, false);
    advance(s, 1, FROST.preludeSeconds * 0.5);
    expect(s.phase).toBe("shatter");
    expect(s.darts).toBeGreaterThan(0.3);
    expect(s.darts).toBeLessThan(0.7);
    expect(s.frost).toBe(1);
    expect(s.shatter).toBe(0);
    advance(s, 1, FROST.preludeSeconds * 0.6);
    expect(s.darts).toBe(1);
    expect(s.shatter).toBeGreaterThan(0);
  });

  it("degele, on continue et on revient un peu : rien ne regele avant le seuil bas", () => {
    const s = advance(createFrostState(), 1, FROST.preludeSeconds + FROST.shatterSeconds + 1);
    advance(s, FROST.refreezeAt + 0.02, 3);
    expect(s.phase).toBe("thawed");
    expect(s.frost).toBe(0);
  });

  it("en marche arriere sous le seuil, l'ecran gele quelques instants puis le monde est de nouveau gele", () => {
    const s = advance(createFrostState(), 1, FROST.preludeSeconds + FROST.shatterSeconds + 1);
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
    const s = advance(createFrostState(), 1, FROST.preludeSeconds + FROST.shatterSeconds + 1);
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

describe("le balai d'Itztlacoliuhqui : le degel est un front, pas une disparition", () => {
  it("rien n'est balaye tant que le monde est gele", () => {
    const s = createFrostState();
    expect(s.sweep).toBe(0);
    frostStep(s, 0, 0.1, false);
    expect(s.sweep).toBe(0);
  });

  it("le balai ne part pas pendant le prelude : les dards volent d'abord", () => {
    const s = createFrostState();
    frostStep(s, FROST.shatterAt + 0.01, 0.016, false);
    expect(s.phase).toBe("shatter");
    for (let t = 0; t < FROST.preludeSeconds - 0.1; t += 0.05) frostStep(s, 1, 0.05, false);
    expect(s.darts).toBeGreaterThan(0.5);
    expect(s.sweep, "le balai attend la fin du prelude").toBe(0);
  });

  it("le balai traverse le champ AVANT que le givre global ne tombe", () => {
    const s = createFrostState();
    frostStep(s, 1, 0.016, false);
    for (let t = 0; t < FROST.preludeSeconds + 0.05; t += 0.05) frostStep(s, 1, 0.05, false);
    // Au tiers de l'explosion, le balai est bien engage et le givre global
    // n'a pas encore commence a tomber : c'est le front qui degele.
    for (let t = 0; t < FROST.shatterSeconds * 0.33; t += 0.05) frostStep(s, 1, 0.05, false);
    expect(s.sweep).toBeGreaterThan(0.3);
    expect(s.frost, "le givre global attend derriere le balai").toBeGreaterThan(0.9);
  });

  it("tout est balaye et degele une fois l'explosion finie", () => {
    const s = createFrostState();
    frostStep(s, 1, 0.016, false);
    for (let t = 0; t < FROST.preludeSeconds + FROST.shatterSeconds + 0.2; t += 0.05) frostStep(s, 1, 0.05, false);
    expect(s.phase).toBe("thawed");
    expect(s.sweep).toBe(1);
    expect(s.frost).toBe(0);
  });

  it("le regel annule le balai : le givre doit pouvoir revenir partout", () => {
    const s = createFrostState();
    frostStep(s, 1, 0.016, false);
    for (let t = 0; t < FROST.preludeSeconds + FROST.shatterSeconds + 0.2; t += 0.05) frostStep(s, 1, 0.05, false);
    // On remonte : le monde regele.
    frostStep(s, 0, 0.05, false);
    expect(s.phase).toBe("refreeze");
    for (let t = 0; t < FROST.refreezeSeconds + 0.2; t += 0.05) frostStep(s, 0, 0.05, false);
    expect(s.sweep).toBeLessThan(0.05);
    expect(s.frost).toBeGreaterThan(0.95);
  });
});
