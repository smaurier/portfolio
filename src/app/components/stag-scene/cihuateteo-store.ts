/**
 * L'ATTERRISSAGE DES CIHUATETEO (09/09). Elles ecrivent, l'herbe lit : meme
 * motif que `xiuhcoatlStore.strikeHit` et `frostStore.impulse`, parce que
 * c'est le composant de l'herbe qui possede la grille de simulation et qui
 * seul peut y appliquer une impulsion.
 *
 * `landing` est un COMPTEUR et non une date : le lecteur compare avec la
 * derniere valeur qu'il a vue, ce qui est exact meme si l'horloge saute (la
 * lecon du 09/09 sur la frappe) et meme si deux atterrissages se suivent.
 */

export type LandingSpot = { x: number; z: number };

export const cihuateteoStore: {
  /** Incremente a chaque contact au sol. */
  landing: number;
  /** Ou elles ont touche, en monde, une entree par porteuse. */
  spots: LandingSpot[];
} = {
  landing: 0,
  spots: [],
};

// Lecture externe (verifications Playwright, console), meme motif que les
// autres stores de la scene.
if (typeof window !== "undefined") {
  (window as unknown as { __nahualCihuateteo?: unknown }).__nahualCihuateteo = cihuateteoStore;
}
