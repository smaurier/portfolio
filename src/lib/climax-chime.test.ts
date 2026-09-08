import { describe, expect, it } from "vitest";
import { CLIMAX_CHIME, armChime, stepChime } from "./climax-chime";

/**
 * La cloche du climax : le son doit repondre au SCROLL et non a un clic.
 * Tout le risque est dans le declenchement, donc il est isole ici, pur et
 * teste, avant d'etre branche sur Web Audio.
 */
describe("climax-chime : quand la cloche cardinale doit sonner", () => {
  it("sonne une fois quand on franchit le seuil en montant", () => {
    let state = armChime(0);
    let r = stepChime(state, 0.2);
    expect(r.fire).toBe(false);
    r = stepChime(r.state, CLIMAX_CHIME.fireAt + 0.01);
    expect(r.fire).toBe(true);
  });

  it("ne sonne pas deux fois si on continue de descendre la page", () => {
    let r = stepChime(armChime(0), 1);
    expect(r.fire).toBe(true);
    for (const p of [0.9, 1, 0.8, 0.95]) {
      r = stepChime(r.state, p);
      expect(r.fire).toBe(false);
    }
  });

  it("se rearme seulement quand on est vraiment redescendu, pas au moindre recul", () => {
    let r = stepChime(armChime(0), 1);
    expect(r.fire).toBe(true);
    // Un recul juste sous le seuil ne rearme pas : sinon la cloche
    // sonnerait a chaque hesitation de la molette autour du climax.
    r = stepChime(r.state, CLIMAX_CHIME.fireAt - 0.01);
    r = stepChime(r.state, 1);
    expect(r.fire).toBe(false);
    // Retour au debut de la page : la cloche est de nouveau disponible.
    r = stepChime(r.state, 0);
    r = stepChime(r.state, 1);
    expect(r.fire).toBe(true);
  });

  it("ne sonne PAS si on arrive deja au-dela du seuil", () => {
    // Cas reel : lien profond, restauration de position, ou passage
    // instantane en mouvement reduit. Sonner a l'ouverture serait un coup
    // de cloche sorti de nulle part.
    let r = stepChime(armChime(0.8), 0.8);
    expect(r.fire).toBe(false);
    r = stepChime(r.state, 1);
    expect(r.fire).toBe(false);
    // Il faut d'abord etre redescendu.
    r = stepChime(r.state, 0);
    r = stepChime(r.state, 1);
    expect(r.fire).toBe(true);
  });

  it("le seuil de rearmement est franchement sous le seuil de declenchement", () => {
    expect(CLIMAX_CHIME.rearmAt).toBeLessThan(CLIMAX_CHIME.fireAt);
    expect(CLIMAX_CHIME.fireAt - CLIMAX_CHIME.rearmAt).toBeGreaterThanOrEqual(0.25);
  });

  it("tolere des valeurs hors bornes sans se bloquer", () => {
    let r = stepChime(armChime(-5), 12);
    expect(r.fire).toBe(true);
    r = stepChime(r.state, Number.NaN);
    expect(r.fire).toBe(false);
  });
});
