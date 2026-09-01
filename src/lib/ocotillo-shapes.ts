// Géométrie procédurale de l'ocotillo (Fouquieria splendens) : palier 3 de
// la DA Nahual (cf memory project-nahual-da), remplacement de
// elephant-tree.glb dans le fond fixe (background-flora.tsx).
//
// Aucun asset CC0 étiqueté mesquite/huizache/palo verde/ocotillo n'existe
// dans les bibliothèques low-poly usuelles (poly.pizza, Sketchfab : recherche
// faite en direct le 18/08) : soit un asset générique reteinté, soit du
// procédural. Sylvain a tranché pour le procédural, comme pour les lianes
// (vine-shapes.ts) : même raison ici : aucun asset ne colle précisément à
// "gerbe de tiges fines qui rayonnent depuis un pied commun", et le
// procédural garantit l'exactitude de la silhouette (espèce précolombienne
// mexicaine, désertique, distincte du nopal/agave déjà en scène) plutôt
// qu'un compromis générique.
//
// Une tige d'ocotillo part quasi verticale à la base puis penche
// progressivement vers l'extérieur en s'élevant (même principe que la
// dérive t² des lianes : la base reste plantée, l'écart s'accélère vers le
// sommet) : pas de spirale/enroulement ici, contrairement aux lianes.
// Plusieurs tiges réparties en éventail autour d'un pied commun (angle doré,
// même patron que flora-placement.ts) forment le buisson complet.

export type OcotilloPoint = { x: number; y: number; z: number };

export type OcotilloWandPathOptions = {
  /** Hauteur totale de la tige. */
  height: number;
  /** Dérive horizontale totale atteinte au sommet : direction du penchant. */
  leanX: number;
  leanZ: number;
  /** Amplitude d'un léger balancement organique perpendiculaire au
   * penchant : une tige naturelle n'est jamais parfaitement droite. */
  wobbleAmplitude: number;
  wobbleFrequency: number;
  /** Nombre de points le long de la tige. */
  segments: number;
  /** Décale la phase du balancement : déterministe, pas Math.random (même
   * principe que vine-shapes/flora-placement). */
  seed: number;
};

const DEFAULT_WAND_PATH_OPTIONS: OcotilloWandPathOptions = {
  height: 2,
  leanX: 0.3,
  leanZ: 0.2,
  wobbleAmplitude: 0.02,
  wobbleFrequency: 2.5,
  segments: 20,
  seed: 0,
};

/**
 * Spline d'une tige d'ocotillo : part du sol (y=0, x=z=0), monte droite,
 * penche vers (leanX, leanZ) en accélérant avec la hauteur (t², la base
 * reste plantée), avec un léger balancement organique perpendiculaire au
 * penchant plutôt que dans une direction arbitraire.
 */
export function generateOcotilloWandPath(
  options: Partial<OcotilloWandPathOptions> = {},
): OcotilloPoint[] {
  const { height, leanX, leanZ, wobbleAmplitude, wobbleFrequency, segments, seed } = {
    ...DEFAULT_WAND_PATH_OPTIONS,
    ...options,
  };

  const leanAngle = Math.atan2(leanZ, leanX);
  const points: OcotilloPoint[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const leanEnvelope = t * t;
    const wobble = wobbleAmplitude * t * Math.sin(seed + t * wobbleFrequency * Math.PI * 2);
    // Le balancement est perpendiculaire à la direction du penchant (pas
    // dans toutes les directions à la fois), sinon la tige zigzague au lieu
    // de simplement "trembler" légèrement autour de sa courbe.
    const perpX = -Math.sin(leanAngle) * wobble;
    const perpZ = Math.cos(leanAngle) * wobble;
    points.push({
      x: leanX * leanEnvelope + perpX,
      y: t * height,
      z: leanZ * leanEnvelope + perpZ,
    });
  }
  return points;
}

export type OcotilloWandConfig = {
  leanX: number;
  leanZ: number;
  height: number;
  seed: number;
};

export type OcotilloClusterOptions = {
  /** Nombre de tiges dans la gerbe. */
  wandCount: number;
  minHeight: number;
  maxHeight: number;
  /** Rayon horizontal maximal atteint par l'éventail au sommet des tiges. */
  spread: number;
  seed: number;
};

const DEFAULT_CLUSTER_OPTIONS: OcotilloClusterOptions = {
  wandCount: 10,
  minHeight: 1.6,
  maxHeight: 2.3,
  spread: 0.5,
  seed: 0,
};

const GOLDEN_ANGLE = 2.399963229728653; // même angle que flora-placement.ts

/**
 * Répartit les tiges d'un buisson d'ocotillo autour d'un pied commun :
 * angle doré pour une répartition homogène (comme flora-placement.ts),
 * hauteur et rayon d'ouverture variés par tige (pseudo-déterministe, basé
 * sur l'index) pour éviter l'effet "copié-collé en rotation".
 */
export function generateOcotilloCluster(
  options: Partial<OcotilloClusterOptions> = {},
): OcotilloWandConfig[] {
  const { wandCount, minHeight, maxHeight, spread, seed } = {
    ...DEFAULT_CLUSTER_OPTIONS,
    ...options,
  };

  const configs: OcotilloWandConfig[] = [];
  for (let i = 0; i < wandCount; i++) {
    const angle = seed + i * GOLDEN_ANGLE;
    const heightT = (Math.sin(i * 0.531 + seed) + 1) / 2;
    const radialT = 0.6 + 0.4 * ((Math.cos(i * 0.317 + seed) + 1) / 2);
    const radius = spread * radialT;
    configs.push({
      leanX: radius * Math.cos(angle),
      leanZ: radius * Math.sin(angle),
      height: minHeight + (maxHeight - minHeight) * heightT,
      seed: angle,
    });
  }
  return configs;
}

const DEFAULT_TIP_FLOWER_COUNT = 3;

/**
 * Où accrocher les fleurs sur une tige : contrairement aux lianes (fleurs
 * réparties sur toute la hauteur), l'ocotillo les concentre en petite
 * grappe tout en pointe : cf le vrai Fouquieria splendens.
 */
export function generateOcotilloFlowerPlacements(
  count: number = DEFAULT_TIP_FLOWER_COUNT,
): Array<{ t: number }> {
  const placements: Array<{ t: number }> = [];
  for (let i = 0; i < count; i++) {
    const t = 0.88 + (i / Math.max(1, count - 1)) * 0.12;
    placements.push({ t });
  }
  return placements;
}
