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

/** Gele l'ombre : plus de passe de profondeur, et la carte videe. Sans
 *  carte (jamais rendue), rien a vider : RevealLighting force un premier
 *  rendu au montage pour que la carte existe toujours. */
export function freezeShadow(gl: WebGLRenderer, light: SpotLight | DirectionalLight): void {
  light.shadow.autoUpdate = false;
  light.shadow.needsUpdate = false;
  const map = light.shadow.map;
  if (!map) return;
  const prev = gl.getRenderTarget();
  gl.setRenderTarget(map as WebGLRenderTarget);
  gl.clear(false, true, false);
  gl.setRenderTarget(prev);
}

/** Reprend la passe de profondeur a chaque image. */
export function thawShadow(light: SpotLight | DirectionalLight): void {
  light.shadow.autoUpdate = true;
}
