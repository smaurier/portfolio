/**
 * Géométrie des deux Xiuhcoatl (serpents de feu) qui encerclent le voile de
 * chargement — retour de Sylvain le 20/08 (cf memory project-nahual-da) :
 * référence directe à la Piedra del Sol (déjà présente sur la home,
 * piedra-del-sol.tsx), dont l'anneau extérieur réel est formé de deux
 * serpents de feu qui se rejoignent museau contre museau, symbole du cycle
 * de destruction/renaissance — pas une spirale ou un cercle abstrait.
 *
 * Chaque serpent est un arc PARTIEL (pas fermé) d'une ellipse, perturbé par
 * deux ondulations sinusoïdales pour rester "irrégulier, pas ovale" (retour
 * de Sylvain) plutôt qu'un arc géométrique parfait. Les deux arcs se
 * chevauchent légèrement à leurs extrémités (haut et bas) : c'est là qu'ils
 * "se rejoignent" une fois entièrement tracés.
 *
 * Fonction pure (pas de Math.random — les ondulations sont des sinusoïdes à
 * phase fixe) : déterministe, donc pas de désaccord SSR/client à
 * l'hydratation, et testable.
 */

export type Point = { x: number; y: number };

export type SerpentArcParams = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  /** Degrés, convention mathématique standard (0° = est, sens horaire à
   * l'écran puisque l'axe Y de SVG pointe vers le bas). */
  startDeg: number;
  endDeg: number;
  wobbleAmp1: number;
  wobbleFreq1: number;
  wobblePhase1: number;
  wobbleAmp2: number;
  wobbleFreq2: number;
  wobblePhase2: number;
  steps: number;
};

function pointOnArc(params: SerpentArcParams, t: number): Point {
  const deg = params.startDeg + (params.endDeg - params.startDeg) * t;
  const rad = (deg * Math.PI) / 180;
  const wobble =
    1 +
    params.wobbleAmp1 * Math.sin(params.wobbleFreq1 * rad + params.wobblePhase1) +
    params.wobbleAmp2 * Math.sin(params.wobbleFreq2 * rad + params.wobblePhase2);
  return {
    x: params.cx + params.rx * wobble * Math.cos(rad),
    y: params.cy + params.ry * wobble * Math.sin(rad),
  };
}

/** Liste de points échantillonnés le long de l'arc — utile pour dériver la
 * position/orientation de la tête (dernier point) sans dupliquer la
 * trigonométrie de buildSerpentPath. */
export function sampleSerpentArc(params: SerpentArcParams): Point[] {
  const points: Point[] = [];
  for (let i = 0; i <= params.steps; i++) {
    points.push(pointOnArc(params, i / params.steps));
  }
  return points;
}

/** `d` d'un <path> SVG en polyligne (assez de points pour lire comme une
 * courbe lisse à la taille d'affichage réelle — un voile de chargement, pas
 * un rendu plein écran) plutôt qu'une spline Catmull-Rom : plus simple, pas
 * de dépendance, différence invisible ici. */
export function buildSerpentPath(params: SerpentArcParams): string {
  const points = sampleSerpentArc(params);
  const [first, ...rest] = points;
  const moveTo = `M ${first.x.toFixed(2)},${first.y.toFixed(2)}`;
  const lines = rest.map((p) => `L ${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
  return `${moveTo} ${lines}`;
}

// Les deux serpents, dans un viewBox 200x100 (ratio 2:1, adapté à un bloc de
// texte plus large que haut). Chacun couvre un peu plus d'un demi-tour
// (200°) pour se chevaucher aux deux points de jonction (haut et bas),
// comme sur la Piedra del Sol réelle. Le tracé commence à la queue et finit
// à la tête (cf loading-cycle.tsx : stroke-dashoffset dessine dans ce sens)
// — le serpent "voyage" vers son point de rencontre à mesure que la scène
// charge, plutôt que d'apparaître d'un bloc.
const SHARED: Pick<
  SerpentArcParams,
  "cx" | "cy" | "rx" | "ry" | "wobbleAmp1" | "wobbleFreq1" | "wobbleAmp2" | "wobbleFreq2" | "steps"
> = {
  cx: 100,
  cy: 50,
  rx: 94,
  ry: 46,
  wobbleAmp1: 0.05,
  wobbleFreq1: 4,
  wobbleAmp2: 0.03,
  wobbleFreq2: 7,
  steps: 64,
};

// Serpent A : queue en haut (260°, légèrement avant le sommet), tête en bas
// (100°, légèrement après le point bas) — couvre le côté droit de l'anneau.
export const SERPENT_A: SerpentArcParams = {
  ...SHARED,
  startDeg: 260,
  endDeg: 460, // 460 = 100 + 360, pour balayer par valeurs croissantes
  wobblePhase1: 0.4,
  wobblePhase2: 2.1,
};

// Serpent B : queue en bas (80°), tête en haut (280°) — couvre le côté
// gauche, phases différentes pour ne pas être le simple miroir de A (retour
// de Sylvain : "irrégulier", pas symétrique).
export const SERPENT_B: SerpentArcParams = {
  ...SHARED,
  startDeg: 80,
  endDeg: 280,
  wobblePhase1: 1.6,
  wobblePhase2: 4.3,
};
