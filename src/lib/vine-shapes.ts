// Géométrie procédurale des lianes — palier 3 de la DA Nahual (cf memory
// project-nahual-da). Contrairement au maïs/agave/nopal (assets CC0
// trouvés, cf Sylvain "va chercher des modèles"), aucun asset ne colle à
// "liane qui s'enroule autour d'une patte de cerf" — le procédural garde
// tout son sens ici. Fonctions pures, même principe que camera-path.ts/
// reveal-arc.ts : testables sans Three.js, le rendu (TubeGeometry) se
// construit à partir des points dans le composant r3f.

export type VinePoint = { x: number; y: number; z: number };

export type VineHelixOptions = {
  /** Hauteur totale de la liane. */
  height: number;
  /** Rayon de l'enroulement — doit rester petit pour "coller" à une patte. */
  radius: number;
  /** Nombre de tours complets sur la hauteur totale. */
  turns: number;
  /** Nombre de points le long de la liane. */
  segments: number;
  /** Décale la phase de départ — deux lianes avec des seeds différentes ne
   * démarrent jamais au même angle (déterministe, pas Math.random). */
  seed: number;
  /** Décalage horizontal atteint au sommet (accéléré vers le haut, pas
   * linéaire) — permet à une liane de grimper une patte puis de "dériver"
   * vers le corps/le cou en montant, comme une vigne vierge qui grimpe puis
   * s'étale, plutôt que de rester parfaitement verticale sur toute sa
   * hauteur. 0 par défaut = enroulement vertical pur (une patte seule). */
  driftX: number;
  driftZ: number;
};

const DEFAULT_HELIX_OPTIONS: VineHelixOptions = {
  height: 0.75,
  radius: 0.08,
  turns: 2.5,
  segments: 28,
  seed: 0,
  driftX: 0,
  driftZ: 0,
};

/**
 * Spline d'une liane en hélice autour d'un axe globalement vertical (une
 * patte, puis le corps si driftX/driftZ sont fournis) : part du sol (y=0),
 * s'enroule à rayon constant, et dérive horizontalement vers le sommet si
 * demandé — la dérive s'accélère avec la hauteur (t²), donc la base reste
 * bien plantée sur la patte et c'est le haut de la liane qui part vers le
 * corps, pas l'inverse.
 */
export function generateVineHelixPath(options: Partial<VineHelixOptions> = {}): VinePoint[] {
  const { height, radius, turns, segments, seed, driftX, driftZ } = {
    ...DEFAULT_HELIX_OPTIONS,
    ...options,
  };

  const points: VinePoint[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = seed + t * Math.PI * 2 * turns;
    const driftEnvelope = t * t;
    points.push({
      x: radius * Math.cos(angle) + driftX * driftEnvelope,
      y: t * height,
      z: radius * Math.sin(angle) + driftZ * driftEnvelope,
    });
  }
  return points;
}

export type VineFlowerPlacement = {
  /** Position le long de la liane, 0 (sol) -> 1 (sommet). */
  t: number;
};

const DEFAULT_FLOWER_COUNT = 4;

/**
 * Où accrocher les fleurs le long d'une liane : réparties entre 25% et 95%
 * de la hauteur (jamais au ras du sol, la liane a besoin de "prendre" avant
 * de fleurir), espacement régulier — suffisant ici, contrairement aux
 * feuilles de tige (generateLeafPlacements) qui avaient besoin d'un angle
 * doré pour éviter l'alignement (la position le long de la courbe suffit
 * à les distinguer visuellement, l'angle autour de la liane est déjà fixé
 * par l'hélice elle-même).
 */
export function generateVineFlowerPlacements(
  count: number = DEFAULT_FLOWER_COUNT,
): VineFlowerPlacement[] {
  const placements: VineFlowerPlacement[] = [];
  for (let i = 0; i < count; i++) {
    const t = 0.25 + (i / Math.max(1, count - 1)) * 0.7;
    placements.push({ t });
  }
  return placements;
}
