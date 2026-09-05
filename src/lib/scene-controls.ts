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
 *  - CONTEMPLATION : la scene deroule seule, du soir au midi, sans
 *    toucher a la souris (pour regarder, ou pour filmer) ;
 *  - PHOTO : l'image de la scene telle quelle, sans interface ;
 *  - ECO : le profil de rendu leger (pas de post-traitement, pas d'ombre,
 *    DPR 1, moins d'herbe), aussi sur ordi.
 * Ce module est la partie PURE : le deroule de la contemplation, la
 * resolution du profil de qualite, la table des raccourcis. Le composant
 * (scene-controls.tsx) ne fait que brancher le navigateur dessus.
 */

export type SceneAction = "text" | "fullscreen" | "cinematic" | "photo" | "eco" | "link";

/** Raccourcis de scene : lettres LIBRES (la navigation cardinale prend
 * WASD / ZQSD / C, et Echap ramene a l'accueil). */
export const SCENE_SHORTCUTS: Record<string, SceneAction> = {
  h: "text",
  f: "fullscreen",
  t: "cinematic",
  p: "photo",
  e: "eco",
  l: "link",
};

export function shortcutAction(key: string): SceneAction | null {
  return SCENE_SHORTCUTS[key.toLowerCase()] ?? null;
}

export const CINEMATIC = {
  /** Duree du deroule complet, du progres courant a la fin de l'arc (s). */
  seconds: 75,
};

function smooth(u: number): number {
  const c = u < 0 ? 0 : u > 1 ? 1 : u;
  return c * c * (3 - 2 * c);
}

/** Progres de l'arc (0..1) a `elapsed` secondes apres le depart, en
 * partant de `from` : ease-in-out jusqu'a 1 (le midi), puis, EN BOUCLE
 * (05/09, Sylvain : « la contemplation en boucle »), retour vers 0 (la
 * nuit) en `seconds`, et ainsi de suite, jusqu'au geste qui l'arrete. Un
 * ecran de salon, une video : la journee se rejoue sans fin. */
export function cinematicProgress(elapsed: number, from: number, seconds: number = CINEMATIC.seconds): number {
  const start = from < 0 ? 0 : from > 1 ? 1 : from;
  if (elapsed <= 0) return start;
  // Premiere montee : de `start` a 1.
  if (elapsed < seconds) return start + (1 - start) * smooth(elapsed / seconds);
  // Puis des allers-retours complets 1 -> 0 -> 1 -> ...
  const rest = elapsed - seconds;
  const leg = Math.floor(rest / seconds);
  const u = smooth((rest - leg * seconds) / seconds);
  return leg % 2 === 0 ? 1 - u : u;
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
};

const QUALITY_DESKTOP: QualityProfile = { dprCap: 2, postFx: true, shadows: true, bladeCount: 26000 };
const QUALITY_MOBILE: QualityProfile = { dprCap: 1.5, postFx: false, shadows: false, bladeCount: 9000 };
const QUALITY_ECO: QualityProfile = { dprCap: 1, postFx: false, shadows: false, bladeCount: 7000 };

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
} as const;
