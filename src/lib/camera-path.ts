// Trajectoire de caméra pilotée par le scroll : palier 0 de la DA Nahual
// (cf memory project-nahual-da) : un tour complet à 360° autour du modèle,
// la hauteur descendant du "au-dessus" vers le niveau du regard pendant le
// même mouvement. Fonction pure, testable sans Three.js : la logique de
// trajectoire est découplée du rendu (cf principe posé dans le Codex Nahual
// sur le testable = comportement/logique, pas le pixel).

export type Vec3 = { x: number; y: number; z: number };

export type OrbitCameraOptions = {
  /** Distance caméra<->cible au tout début du scroll (progress = 0) : loin,
   * silhouette distante dans la pénombre. */
  startRadius: number;
  /** Distance caméra<->cible au climax (progress = climaxProgress) : proche,
   * intime : c'est le "face-à-face". Reste à cette distance ensuite (pas de
   * retour en arrière, même logique que la lumière de reveal-arc.ts). */
  endRadius: number;
  /** Hauteur de la caméra au tout début du scroll (progress = 0). */
  startHeight: number;
  /** Hauteur de la caméra à la fin du scroll (progress = 1). */
  endHeight: number;
  /** Nombre de tours complets sur toute la durée du scroll (défaut : 1). */
  turns?: number;
  /** Hauteur de la cible regardée : fixe, pas de teaser. */
  targetY: number;
  /** Progress où le rapprochement (startRadius -> endRadius) est terminé. */
  climaxProgress: number;
  /** Rotation résiduelle (radians) après climaxProgress, jusqu'à progress=1
   * : ajuste l'angle de repos final sans changer le rythme de l'orbite
   * avant le climax. */
  finalDrift: number;
};

const DEFAULT_OPTIONS: OrbitCameraOptions = {
  // Loin -> proche à mesure que la lumière monte (17/08, retour direct de
  // Sylvain : partir loin/sombre et se rapprocher vers le climax colle à la
  // DA du "face-à-face" ; l'inverse : partir proche puis reculer : allait
  // contre le sens de l'arc de reveal). Synchronisé sur climaxProgress,
  // la même borne que le plafond de lumière (reveal-arc.ts, 0.75).
  //
  // 9->7 / 4->3.2 (18/08, retour Sylvain après audit DA : cadrage trop
  // timide, sujet noyé dans le vide même une fois le décor ajouté) : rayons
  // resserrés d'environ 20% aux deux bornes, hauteurs volontairement pas
  // touchées (déjà réglées précisément contre un bug documenté : à
  // endRadius=4 la tête sortait du cadre, cf startHeight ci-dessous :
  // change isolé, une seule variable à la fois).
  // endRadius 3.2 → 4.5 (28/08 retour Sylvain "cerf entier visible
  // desktop bottom aussi") : 3.2 coupait les bois en haut du cadre
  // à progress=1. Recul + hauteur permet vue 3/4 complete avec bois.
  startRadius: 7,
  endRadius: 4.5,
  // 4 -> 2.6 (retour Sylvain palier 1) : à 4, la tête du cerf en
  // Idle_Headlow (posture "inconscient" de la pénombre, cf reveal-arc.ts)
  // sortait du cadre par le haut : le passage tête-basse -> tête-haute au
  // "prise de conscience" ne se voyait donc pas du tout. Partir loin (voir
  // startRadius) aide aussi : à distance, tout le corps rentre dans le
  // cadre même à hauteur de caméra modeste.
  startHeight: 2.6,
  endHeight: 2.0,
  turns: 1,
  targetY: 1,
  climaxProgress: 0.75,
  // Angle de repos final (18/08, retour Sylvain : "le cerf devrait être
  // tourné à 4h30, 5h") : climaxProgress=0.75 avec turns=1 donnait un
  // azimuth de 270° (un profil pur, "on n'y est pas côté DA" implicite :
  // pas la vue 3/4 demandée). Plutôt que de changer `turns` (aurait modifié
  // le rythme de l'orbite sur tout le scroll, pas juste la fin), une
  // rotation résiduelle sur le dernier quart (chemins révélés) amène
  // doucement l'azimuth à sa position de repos réelle, sans toucher au
  // reste déjà réglé. Valeur choisie à l'œil, à ajuster si besoin.
  finalDrift: Math.PI / 4,
};

/** Ramène une valeur dans [0, 1] : le scroll réel peut légèrement déborder. */
export function clampProgress(progress: number): number {
  if (Number.isNaN(progress)) return 0;
  return Math.min(1, Math.max(0, progress));
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/** Smoothstep : 0->1 avec dérivée nulle aux deux bornes, cohérent avec
 * l'easing de reveal-arc.ts plutôt qu'une droite brute. */
function ease(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

/**
 * Position de la caméra pour une progression de scroll donnée (0 = haut de
 * page, 1 = bas de la section scène). Orbite sur le plan XZ ; le rayon se
 * resserre (startRadius -> endRadius) jusqu'à climaxProgress puis reste au
 * plus proche, la hauteur descend (startHeight -> endHeight) sur la même
 * plage.
 *
 * Hauteur gelée à climaxProgress (rayon aussi, déjà le cas) : retour de
 * Sylvain le 18/08 : "pour la fin de la scène, on pourrait s'arrêter avec
 * une vue 3/4 pour le cerf" plutôt que continuer l'orbite jusqu'à revenir
 * pile à l'azimuth de départ (pensé pour la pénombre distante, pas pour une
 * pose finale). L'azimuth, lui, ne s'arrête pas net à climaxProgress : une
 * légère rotation résiduelle (`finalDrift`) continue jusqu'à progress=1
 * pour amener l'angle de repos exact demandé ("4h30, 5h") : précision
 * apportée après un premier essai en arrêt franc, jugé trop proche d'un
 * profil pur plutôt qu'une vraie vue 3/4.
 */
export function getOrbitCameraPosition(
  progress: number,
  options: Partial<OrbitCameraOptions> = {},
): Vec3 {
  const { startRadius, endRadius, startHeight, endHeight, turns, climaxProgress, finalDrift } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };
  const p = clampProgress(progress);
  const settledP = climaxProgress > 0 ? Math.min(p, climaxProgress) : p;
  const baseAzimuth = settledP * Math.PI * 2 * (turns ?? 1);
  const driftT =
    climaxProgress < 1 ? Math.min(1, Math.max(0, (p - climaxProgress) / (1 - climaxProgress))) : 0;
  const azimuth = baseAzimuth + ease(driftT) * finalDrift;

  const climaxT = climaxProgress > 0 ? ease(Math.min(1, p / climaxProgress)) : 1;
  const radius = lerp(startRadius, endRadius, climaxT);
  // Même climaxT que le rayon (pas settledP directement) : la hauteur doit
  // atteindre pleinement endHeight À climaxProgress, pas juste une
  // fraction proportionnelle au point d'arrêt.
  const height = lerp(startHeight, endHeight, climaxT);

  return {
    x: radius * Math.sin(azimuth),
    y: height,
    z: radius * Math.cos(azimuth),
  };
}

/** Cible regardée par la caméra : fixe au centre du modèle, légèrement
 * remontée pour cadrer le corps plutôt que les sabots. */
export function getOrbitCameraTarget(options: Partial<OrbitCameraOptions> = {}): Vec3 {
  const { targetY } = { ...DEFAULT_OPTIONS, ...options };
  return { x: 0, y: targetY, z: 0 };
}
