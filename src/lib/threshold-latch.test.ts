import { describe, expect, it } from "vitest";
import { armLatch, stepLatch } from "./threshold-latch";

const SPEC = { fireAt: 0.6, rearmAt: 0.2 };

/**
 * Le verrou de seuil : « declenche UNE FOIS quand un signal franchit un
 * seuil en montant, et ne se rearme qu'apres etre vraiment redescendu ».
 *
 * Ecrit d'abord pour la cloche du climax (09/09), il sert aussi a
 * l'atterrissage des Cihuateteo, qui n'avait pas d'instant : `settle` est un
 * fondu continu, et un geste d'impact demande une date.
 */
describe("threshold-latch : declencher une fois, et une seule", () => {
  it("declenche au franchissement en montant", () => {
    let r = stepLatch(armLatch(0, SPEC), 0.3, SPEC);
    expect(r.fire).toBe(false);
    r = stepLatch(r.state, 0.7, SPEC);
    expect(r.fire).toBe(true);
  });

  it("ne declenche pas deux fois si le signal reste haut", () => {
    let r = stepLatch(armLatch(0, SPEC), 1, SPEC);
    expect(r.fire).toBe(true);
    for (const v of [1, 0.9, 0.7, 1]) {
      r = stepLatch(r.state, v, SPEC);
      expect(r.fire).toBe(false);
    }
  });

  it("ne se rearme pas au moindre recul, mais seulement en bas", () => {
    let r = stepLatch(armLatch(0, SPEC), 1, SPEC);
    expect(r.fire).toBe(true);
    r = stepLatch(r.state, SPEC.fireAt - 0.05, SPEC);
    r = stepLatch(r.state, 1, SPEC);
    expect(r.fire, "une hesitation autour du seuil ne rearme pas").toBe(false);
    r = stepLatch(r.state, 0, SPEC);
    r = stepLatch(r.state, 1, SPEC);
    expect(r.fire, "revenu en bas, il ressert").toBe(true);
  });

  it("ne declenche PAS si l'on arrive deja au-dela du seuil", () => {
    // Cas reel : lien profond, position de scroll restauree, ou passage
    // immediat en mouvement reduit. Declencher a l'ouverture serait un coup
    // sorti de nulle part.
    let r = stepLatch(armLatch(0.9, SPEC), 0.9, SPEC);
    expect(r.fire).toBe(false);
    r = stepLatch(r.state, 1, SPEC);
    expect(r.fire).toBe(false);
    r = stepLatch(r.state, 0, SPEC);
    r = stepLatch(r.state, 1, SPEC);
    expect(r.fire).toBe(true);
  });

  it("tolere des valeurs manquantes sans declencher par accident", () => {
    const r = stepLatch(armLatch(0, SPEC), Number.NaN, SPEC);
    expect(r.fire).toBe(false);
    expect(r.state.armed).toBe(true);
  });

  it("refuse un seuil de rearmement au-dessus du seuil de declenchement", () => {
    expect(() => armLatch(0, { fireAt: 0.2, rearmAt: 0.6 })).toThrow();
  });
});
