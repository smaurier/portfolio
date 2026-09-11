import { describe, expect, it } from "vitest";
import { shouldReduceMotion, shouldRenderContinuously } from "./reduced-motion";

describe("la pause du visiteur (11/09)", () => {
  it("gele le rendu quoi qu'il arrive, contemplation comprise", () => {
    expect(shouldRenderContinuously({ prefersReduced: false, cinematicRequested: true, documentHidden: false, paused: true })).toBe(false);
    expect(shouldRenderContinuously({ prefersReduced: false, cinematicRequested: false, documentHidden: false, paused: true })).toBe(false);
  });
  it("sans pause, rien ne change", () => {
    expect(shouldRenderContinuously({ prefersReduced: false, cinematicRequested: false, documentHidden: false, paused: false })).toBe(true);
  });
});

describe("mouvement reduit : qui decide", () => {
  it("la preference systeme gele la scene", () => {
    expect(shouldReduceMotion(true, false)).toBe(true);
    expect(shouldRenderContinuously({ prefersReduced: true, cinematicRequested: false, documentHidden: false })).toBe(false);
  });

  it("sans preference, la scene vit", () => {
    expect(shouldReduceMotion(false, false)).toBe(false);
    expect(shouldRenderContinuously({ prefersReduced: false, cinematicRequested: false, documentHidden: false })).toBe(true);
  });

  it("une demande EXPLICITE de contemplation gagne sur la preference", () => {
    // Le defaut du 09/09 : le bouton existait et ne faisait rien. C'est le
    // mecanisme meme que l'on doit fournir quand on supprime le mouvement.
    expect(shouldReduceMotion(true, true)).toBe(false);
    expect(shouldRenderContinuously({ prefersReduced: true, cinematicRequested: true, documentHidden: false })).toBe(true);
  });

  it("un onglet cache ne rend jamais, meme en contemplation", () => {
    // La raison d'etre premiere du mode « demand » : une boucle qui tourne
    // dans un onglet de fond vide la batterie pour personne.
    for (const cine of [false, true]) {
      for (const pref of [false, true]) {
        expect(shouldRenderContinuously({ prefersReduced: pref, cinematicRequested: cine, documentHidden: true })).toBe(false);
      }
    }
  });

  it("ne gele pas la scene d'un visiteur qui n'a rien demande", () => {
    // Garde-fou contre l'inversion : la contemplation seule ne doit pas
    // impliquer un gel, et l'absence de preference non plus.
    expect(shouldReduceMotion(false, true)).toBe(false);
  });
});
