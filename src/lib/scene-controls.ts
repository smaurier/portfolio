/**
 * Les controles de scene (05/09, idee de Sylvain : « une icone qui
 * permettrait de cacher le texte pour mieux apprecier la scene webgl »,
 * puis « regarde comment c'est fait et utilise le meilleur »). Les sites
 * primes exposent presque toujours un petit bloc de controles de
 * l'experience a cote du son : masquer l'interface, plein ecran, un
 * reglage de qualite (le folio 2025 de Bruno Simon a un systeme
 * d'options avec des paliers de qualite qui reglent la chaine de
 * post-traitement), et des raccourcis clavier. Ici, cinq gestes :
 *  - TEXTE : masquer / afficher tout ce qui n'est pas la scene ;
 *  - PLEIN ECRAN : l'API Fullscreen du navigateur ;
 *  - CONTEMPLATION : le texte s'efface, la scene se pose sur l'heure vraie
 *    de Tenochtitlan puis deroule le jour entier en boucle, la camera
 *    orbite (lib contemplation) ; a la fin, le texte revient comme avant ;
 *  - PHOTO : l'image de la scene telle quelle, sans interface ;
 *  - ECO : le profil de rendu leger (pas de post-traitement, pas d'ombre,
 *    DPR 1, moins d'herbe), aussi sur ordi.
 * Ce module est la partie PURE : la resolution du profil de qualite, la
 * table des raccourcis (le deroule de la contemplation vit dans
 * lib/contemplation.ts). Le composant
 * (scene-controls.tsx) ne fait que brancher le navigateur dessus.
 */

export type SceneAction = "text" | "fullscreen" | "cinematic" | "photo" | "eco" | "link" | "pause";

/** Raccourcis de scene : lettres LIBRES (la navigation cardinale prend
 * WASD / ZQSD / C, et Echap ramene a l'accueil). */
export const SCENE_SHORTCUTS: Record<string, SceneAction> = {
  h: "text",
  f: "fullscreen",
  t: "cinematic",
  p: "photo",
  e: "eco",
  l: "link",
  // G comme geler : la pause du mouvement (11/09, WCAG 2.2.2 : tout
  // mouvement automatique de plus de cinq secondes doit pouvoir etre mis en
  // pause par le visiteur, quelle que soit sa preference systeme).
  g: "pause",
};

export function shortcutAction(key: string): SceneAction | null {
  return SCENE_SHORTCUTS[key.toLowerCase()] ?? null;
}

export type QualityProfile = {
  /** Plafond de devicePixelRatio. */
  dprCap: number;
  /** Post-traitement (bloom, aberration, vignette, chaleur, flash). */
  postFx: boolean;
  /** Ombres portees (directionnelle du Sud, projecteur du serpent). */
  shadows: boolean;
  /** Brins d'herbe de la prairie. */
  bladeCount: number;
  /**
   * Meches de cheveux par porteuse, a l'Ouest (10/09). Chaque meche est
   * une chaine de Verlet relachee quatre fois par image ; a quatre
   * porteuses, c'etait le premier poste processeur de la page Contact,
   * 171 ms par seconde avec l'ecriture des rubans, sur un budget de 16,7
   * ms par image. Meme palier que l'herbe : le telephone en pose moins.
   */
  hairStrands: number;
  /** Feuilles portees par le vent de l'Ouest (11/09) : chaque feuille est
   * un pas de simulation par image (deux lectures de hauteur de dune, cinq
   * sinus). Mesure sur Contact, CPU x4 : 75 ms par seconde pour 240. Le
   * telephone en pose un tiers de moins, le bureau garde tout. */
  leafCount: number;
  /** Bandes de la jupe des porteuses (11/09) : 52 au bureau, 32 sur
   * telephone, ou le tissu est petit a l'ecran. */
  skirtStrips: number;
  /** Distance au-dela de laquelle les bandelettes se relachent moins ;
   * 0 sur telephone : toujours (l'Ouest y etait a 45 % d'images en retard). */
  clothFar: number;
  /** Les simulateurs du bassin (ondes, fluide des nappes) font un pas une
   * image sur deux sur telephone (11/09 : le Nord y etait a 17 % d'images
   * en retard). */
  simEveryOtherFrame: boolean;
};

const QUALITY_DESKTOP: QualityProfile = { dprCap: 2, postFx: true, shadows: true, bladeCount: 26000, hairStrands: 90, leafCount: 240, skirtStrips: 52, clothFar: 7, simEveryOtherFrame: false };
const QUALITY_MOBILE: QualityProfile = { dprCap: 1.5, postFx: false, shadows: false, bladeCount: 9000, hairStrands: 40, leafCount: 160, skirtStrips: 32, clothFar: 0, simEveryOtherFrame: true };
const QUALITY_ECO: QualityProfile = { dprCap: 1, postFx: false, shadows: false, bladeCount: 7000, hairStrands: 28, leafCount: 120, skirtStrips: 24, clothFar: 0, simEveryOtherFrame: true };

/** Le profil effectif : eco force le repli, sinon le profil de l'ecran. */
export function resolveQuality(eco: boolean, isMobile: boolean): QualityProfile {
  if (eco) return QUALITY_ECO;
  return isMobile ? QUALITY_MOBILE : QUALITY_DESKTOP;
}

/** Cles de persistance : le texte masque vaut pour la session (on
 * navigue entre les directions sans le revoir), l'eco pour de bon. */
export const STORAGE_KEYS = {
  sceneOnly: "nahual-scene-only",
  eco: "nahual-eco",
  paused: "nahual-paused",
} as const;
