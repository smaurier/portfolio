/**
 * LES TROIS COUCHES (02/11/2026). Design :
 * docs/superpowers/specs/2026-11-02-trois-couches-design.md.
 *
 * Trois mediums par lesquels le site se presente : la scene (WebGL),
 * l'amatl (SVG, repli 2D), la parole (le document sr-only existant).
 * Cette regle dit laquelle des deux premieres s'ouvre a l'arrivee ; la
 * parole n'est jamais un defaut, elle est toujours a un geste.
 *
 * Pure : ne touche a rien du document. La detection (WebGL, connexion,
 * mouvement reduit) vit dans couche-store.ts (tache 2) -- meme separation
 * que theme.ts (pur) / theme-store.ts (impur).
 */
export type Couche = "scene" | "amatl" | "parole";

export type CoucheContexte = {
  /** `matchMedia("(prefers-reduced-motion: reduce)").matches`. */
  prefersReducedMotion: boolean;
  /** Un contexte WebGL (1 ou 2) a pu etre cree sur cette machine. */
  webglDisponible: boolean;
  /** `navigator.connection.saveData` ou `effectiveType` slow-2g/2g -- meme
   *  lecture que `prelectureBienvenue` (stag-scene/mount-for-direction.tsx). */
  connexionDegradee: boolean;
};

/**
 * La couche d'ouverture. Le WebGL absent l'emporte sur tout : sans lui,
 * rien d'autre n'a de sens a verifier.
 */
export function coucheParDefaut(contexte: CoucheContexte): Couche {
  if (!contexte.webglDisponible) return "amatl";
  if (contexte.prefersReducedMotion) return "amatl";
  if (contexte.connexionDegradee) return "amatl";
  return "scene";
}
