// Placement de la végétation de fond — palier 3 de la DA Nahual (cf memory
// project-nahual-da). Fonction pure : répartit N emplacements sur un anneau
// autour de la scène, en spirale à angle doré (comme les feuilles d'une
// vraie plante) plutôt qu'un pas régulier qui lirait comme une grille, ou
// un tirage aléatoire qui casserait le déterminisme/testabilité.

export type FloraPlacement = {
  x: number;
  z: number;
  /** Orientation autour de l'axe Y, en radians — évite que tous les
   * spécimens fassent face à la même direction. */
  rotationY: number;
  /** Multiplicateur de taille, varie légèrement d'un spécimen à l'autre
   * pour éviter l'effet "copié-collé". */
  scale: number;
};

const GOLDEN_ANGLE = 2.399963229728653; // ~137.5°, cf reveal-arc/camera-path

export type RingPlacementOptions = {
  /** Distance minimale au centre — les fonds ne doivent jamais empiéter sur
   * la zone où la caméra évolue (cf camera-path.ts, endRadius du climax). */
  minRadius: number;
  /** Distance maximale au centre. */
  maxRadius: number;
  /** Échelle minimale/maximale des spécimens. */
  minScale: number;
  maxScale: number;
  /** Décale toute la distribution — deux appels avec des seeds différentes
   * ne retombent jamais sur les mêmes emplacements. */
  seed: number;
};

const DEFAULT_OPTIONS: RingPlacementOptions = {
  minRadius: 5.5,
  maxRadius: 9,
  minScale: 0.75,
  maxScale: 1.3,
  seed: 0,
};

/**
 * Répartit `count` emplacements en anneau autour du centre de la scène.
 * Utilise le nombre d'or pour l'angle (répartition homogène, jamais deux
 * points alignés) et une variation pseudo-déterministe (basée sur l'index,
 * pas Math.random) pour le rayon/l'échelle/la rotation propre — reproductible
 * à chaque rendu, donc testable.
 */
export function generateRingPlacements(
  count: number,
  options: Partial<RingPlacementOptions> = {},
): FloraPlacement[] {
  const { minRadius, maxRadius, minScale, maxScale, seed } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const placements: FloraPlacement[] = [];
  for (let i = 0; i < count; i++) {
    const angle = seed + i * GOLDEN_ANGLE;
    // Un second angle (fréquence différente) pilote la variation de rayon —
    // évite que les rayons suivent un motif visible corrélé à l'angle.
    const radiusT = (Math.sin(i * 0.618 + seed) + 1) / 2; // 0..1
    const scaleT = (Math.cos(i * 0.427 + seed) + 1) / 2; // 0..1

    const radius = minRadius + (maxRadius - minRadius) * radiusT;
    placements.push({
      x: radius * Math.sin(angle),
      z: radius * Math.cos(angle),
      rotationY: (angle * 1.3) % (Math.PI * 2),
      scale: minScale + (maxScale - minScale) * scaleT,
    });
  }
  return placements;
}
