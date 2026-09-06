import { describe, expect, it } from "vitest";
import { CONTEMPLATION, contemplationStep } from "./contemplation";

const c = CONTEMPLATION;
const real = 0.6;
/** Debut de chaque jalon de la sequence pour `real` = 0.6. */
const t = {
  hold: c.arrive,
  up: c.arrive + c.hold,
  down: c.arrive + c.hold + c.day * (1 - real),
  back: c.arrive + c.hold + c.day * (1 - real) + c.day,
  cycle: c.hold + 2 * c.day,
};

describe("contemplationStep : l'heure vraie d'abord, puis le jour entier", () => {
  it("part du progres courant et rejoint l'heure de Tenochtitlan en douceur", () => {
    expect(contemplationStep(0, 0.2, real).progress).toBeCloseTo(0.2, 9);
    expect(contemplationStep(c.arrive / 2, 0.2, real).progress).toBeCloseTo(0.4, 9);
    expect(contemplationStep(c.arrive, 0.2, real).progress).toBeCloseTo(real, 9);
    expect(contemplationStep(0, 0.2, real).atRealHour).toBe(false);
  });

  it("se tient sur l'heure vraie pendant la tenue, et le dit", () => {
    const s = contemplationStep(t.hold + c.hold / 2, 0.2, real);
    expect(s.progress).toBeCloseTo(real, 9);
    expect(s.atRealHour).toBe(true);
    expect(s.phase).toBe("hold");
  });

  it("monte au midi, redescend a la nuit, revient a l'heure vraie, a vitesse uniforme", () => {
    expect(contemplationStep(t.down, 0.2, real).progress).toBeCloseTo(1, 9);
    expect(contemplationStep(t.back, 0.2, real).progress).toBeCloseTo(0, 9);
    expect(contemplationStep(t.back + c.day * real, 0.2, real).progress).toBeCloseTo(real, 9);
    // Chaque tronçon dure proportionnellement a l'arc parcouru.
    expect(t.down - t.up).toBeCloseTo(c.day * (1 - real), 9);
    expect(t.back - t.down).toBeCloseTo(c.day, 9);
  });

  it("ne revient jamais en arriere pendant la montee ni en avant pendant la descente", () => {
    let prev = -1;
    for (let e = t.up; e <= t.down; e += 0.5) {
      const p = contemplationStep(e, 0.2, real).progress;
      expect(p).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = p;
    }
    prev = 2;
    for (let e = t.down; e <= t.back; e += 0.5) {
      const p = contemplationStep(e, 0.2, real).progress;
      expect(p).toBeLessThanOrEqual(prev + 1e-9);
      prev = p;
    }
  });

  it("boucle : au tour suivant, on se tient de nouveau sur l'heure vraie", () => {
    const again = t.hold + t.cycle + c.hold / 2;
    const s = contemplationStep(again, 0.2, real);
    expect(s.progress).toBeCloseTo(real, 9);
    expect(s.atRealHour).toBe(true);
    // Et entre deux tenues, on n'y est pas.
    expect(contemplationStep(t.down, 0.2, real).atRealHour).toBe(false);
  });

  it("la nuit a Tenochtitlan (arc 0) : tenue dans la nuit, le jour entier, retour direct a la nuit", () => {
    expect(contemplationStep(c.arrive + c.hold / 2, 0.5, 0).progress).toBeCloseTo(0, 9);
    expect(contemplationStep(c.arrive + c.hold + c.day, 0.5, 0).progress).toBeCloseTo(1, 9);
    const nightAgain = c.arrive + c.hold + 2 * c.day + c.hold / 2;
    const s = contemplationStep(nightAgain, 0.5, 0);
    expect(s.progress).toBeCloseTo(0, 9);
    expect(s.atRealHour).toBe(true);
  });

  it("le zenith a Tenochtitlan (arc 1) : pas de montee, la descente commence apres la tenue", () => {
    expect(contemplationStep(c.arrive + c.hold, 0.5, 1).progress).toBeCloseTo(1, 9);
    expect(contemplationStep(c.arrive + c.hold + c.day, 0.5, 1).progress).toBeCloseTo(0, 9);
  });

  it("borne les entrees hors de 0..1", () => {
    expect(contemplationStep(-5, 3, -1).progress).toBeCloseTo(1, 9);
    expect(contemplationStep(c.arrive, 3, 2).progress).toBeCloseTo(1, 9);
  });
});
