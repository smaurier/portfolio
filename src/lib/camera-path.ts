// Trajectoire de caméra pilotée par le scroll — palier 0 de la DA Nahual
// (cf memory project-nahual-da) : un tour complet à 360° autour du modèle,
// la hauteur descendant du "au-dessus" vers le niveau du regard pendant le
// même mouvement. Fonction pure, testable sans Three.js — la logique de
// trajectoire est découplée du rendu (cf principe posé dans le Codex Nahual
// sur le testable = comportement/logique, pas le pixel).

export type Vec3 = { x: number; y: number; z: number };

export type OrbitCameraOptions = {
  /** Distance constante entre la caméra et la cible (le centre du modèle). */
  radius: number;
  /** Hauteur de la caméra au tout début du scroll (progress = 0). */
  startHeight: number;
  /** Hauteur de la caméra à la fin du scroll (progress = 1). */
  endHeight: number;
  /** Nombre de tours complets sur toute la durée du scroll (défaut : 1). */
  turns?: number;
};

const DEFAULT_OPTIONS: OrbitCameraOptions = {
  radius: 6,
  // 4 -> 2.6 (17/08, retour Sylvain palier 1) : à 4, la tête du cerf en
  // Idle_Headlow (posture "inconscient" de la pénombre, cf reveal-arc.ts)
  // sortait du cadre par le haut — le passage tête-basse -> tête-haute au
  // "prise de conscience" ne se voyait donc pas du tout.
  startHeight: 2.6,
  endHeight: 1.4,
  turns: 1,
};

/** Ramène une valeur dans [0, 1] — le scroll réel peut légèrement déborder. */
export function clampProgress(progress: number): number {
  if (Number.isNaN(progress)) return 0;
  return Math.min(1, Math.max(0, progress));
}

/**
 * Position de la caméra pour une progression de scroll donnée (0 = haut de
 * page, 1 = bas de la section scène). Orbite sur le plan XZ, hauteur (Y)
 * interpolée linéairement entre startHeight et endHeight.
 */
export function getOrbitCameraPosition(
  progress: number,
  options: Partial<OrbitCameraOptions> = {},
): Vec3 {
  const { radius, startHeight, endHeight, turns } = { ...DEFAULT_OPTIONS, ...options };
  const p = clampProgress(progress);
  const azimuth = p * Math.PI * 2 * (turns ?? 1);

  return {
    x: radius * Math.sin(azimuth),
    y: startHeight + (endHeight - startHeight) * p,
    z: radius * Math.cos(azimuth),
  };
}

/** Cible regardée par la caméra — fixe au centre du modèle, légèrement
 * remontée pour cadrer le corps plutôt que les sabots. */
export function getOrbitCameraTarget(): Vec3 {
  return { x: 0, y: 1, z: 0 };
}
