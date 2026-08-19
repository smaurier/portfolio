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

const GOLDEN_RATIO_CONJUGATE = 0.6180339887498949; // même suite que milpa.tsx

/**
 * Décale à quel niveau de pousse de LA LIANE (pas du scroll directement)
 * une fleur donnée commence à s'ouvrir — retour de Sylvain le 18/08 : les
 * fleurs ne doivent pas apparaître dès le début de la pousse de la liane
 * ("enlève les fleurs à la base"), chacune démarre à un seuil légèrement
 * différent dans une plage 33%-40%, jamais exactement synchronisées
 * ("les fleurs ne vont pas grandir à la même vitesse, fait une variation").
 */
export function getVineFlowerStartThreshold(index: number, vineSeed: number): number {
  const t = (index * GOLDEN_RATIO_CONJUGATE + vineSeed) % 1;
  return 0.33 + t * 0.07;
}

/**
 * Ouverture d'une fleur de liane (0 fermée -> 1 pleinement ouverte), en
 * fonction de la pousse de la liane elle-même — retour de Sylvain le
 * 18/08 : fermée tant que la liane n'a pas atteint `startAt` (33%-40%
 * selon la fleur, cf getVineFlowerStartThreshold), s'ouvre ensuite jusqu'à
 * ce que la liane atteigne `endAt` (80% par défaut), reste pleinement
 * ouverte après — pas de retour en arrière, même principe que
 * getMilpaGrowth. Varier `startAt` par fleur suffit à faire varier leur
 * vitesse d'ouverture perçue : celle qui démarre à 33% a plus de chemin à
 * parcourir avant 80% que celle qui démarre à 40%, donc s'ouvre plus
 * progressivement — pas besoin de faire varier `endAt` en plus.
 */
export function getVineFlowerBloom(vineGrowth: number, startAt: number, endAt: number = 0.8): number {
  if (endAt <= startAt) return vineGrowth >= endAt ? 1 : 0;
  const t = Math.min(1, Math.max(0, (vineGrowth - startAt) / (endAt - startAt)));
  return t * t * (3 - 2 * t);
}
