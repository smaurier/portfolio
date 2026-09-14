import type { DirectionalLight, Object3D, PointLight, SpotLight, WebGLRenderTarget, WebGLRenderer } from "three";

/**
 * LES LUMIERES PERSISTANTES (11/09).
 *
 * three met le NOMBRE de lumieres visibles, et lesquelles portent une ombre,
 * dans la cle de chaque programme : quand une direction monte sa propre
 * lumiere (le spot du serpent au Sud, le rayon de soleil a l'Est, la braise
 * de Xolotl au Nord), tous les materiaux visibles recompilent, en synchrone,
 * a l'image suivante. Mesure du 11/09, production, bureau : 1,8 s de gel a
 * l'arrivee sur Memoire (22 programmes d'un coup), 2,6 s de Projets vers
 * Services.
 *
 * Les trois lumieres vivent donc ici, montees par RevealLighting sur toutes
 * les pages, a intensite zero hors de leur direction ; leurs composants les
 * PILOTENT (position, intensite, cible) sans les posseder. Le jeu de
 * lumieres ne change plus jamais, et les programmes restent valides d'une
 * page a l'autre.
 *
 * Les ombres suivent la meme regle : `castShadow` ne bascule plus, c'est
 * `shadow.autoUpdate` qui dit si la passe de profondeur tourne. Hors de sa
 * direction, la carte d'une ombre est VIDEE (profondeur a 1 : rien
 * n'ombre) puis gelee, pour qu'aucune ombre d'une autre page ne traine.
 */
export const persistentLights: {
  serpent: SpotLight | null;
  serpentTarget: Object3D | null;
  sun: SpotLight | null;
  sunTarget: Object3D | null;
  ember: PointLight | null;
  /** Pose par Xiuhcoatl : l'ombre du serpent est-elle voulue (Sud, la nuit) ? RevealLighting gele ou degele en consequence. */
  serpentShadowWanted: boolean;
} = { serpent: null, serpentTarget: null, sun: null, sunTarget: null, ember: null, serpentShadowWanted: false };

/** La braise de Xolotl : sa couleur et sa portee vivent avec la lumiere. */
export const EMBER_COLOR = "#ff8a1a";
export const EMBER_DISTANCE = 7;

/**
 * Gele l'ombre : plus de passe de profondeur, et la carte videe.
 *
 * Rend `false` si la carte n'existe pas ENCORE, sans rien geler. C'est le
 * defaut du 13/09, ouvert depuis l'audit et reproduit le 14 : la version
 * precedente coupait `needsUpdate` AVANT de regarder la carte, puis sortait
 * si elle etait absente. Le rendu de profondeur en attente etait donc
 * annule et la carte n'etait JAMAIS creee. Les materiaux, eux, avaient ete
 * compiles avec les ombres : ils echantillonnaient une carte qui n'existait
 * pas, et le pilote refusait le tracé (GL_INVALID_OPERATION, « mismatch
 * between texture format and sampler type (shadow) »). Resultat a l'ecran :
 * le sol, l'herbe, les montagnes et le cerf disparaissaient, pendant que
 * tout ce qui n'a pas de materiau standard continuait de s'afficher.
 *
 * La course ne se voyait qu'a densite 2 apres un saut de defilement, parce
 * que l'ordre des premieres images y change ; l'appelant ne bascule donc
 * son etat que si le gel a reellement eu lieu.
 */
export function freezeShadow(gl: WebGLRenderer, light: SpotLight | DirectionalLight): boolean {
  const map = light.shadow.map;
  if (!map) {
    // Pas encore rendue : on la RECLAME au lieu de l'annuler. On regelera
    // a une image suivante, quand elle existera.
    light.shadow.needsUpdate = true;
    return false;
  }
  light.shadow.autoUpdate = false;
  light.shadow.needsUpdate = false;
  const prev = gl.getRenderTarget();
  gl.setRenderTarget(map as WebGLRenderTarget);
  gl.clear(false, true, false);
  gl.setRenderTarget(prev);
  return true;
}

/** Reprend la passe de profondeur a chaque image. */
export function thawShadow(light: SpotLight | DirectionalLight): void {
  light.shadow.autoUpdate = true;
}
