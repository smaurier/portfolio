/**
 * Géométrie des deux Xiuhcoatl (serpents de feu) qui encerclent le voile de
 * chargement : retour de Sylvain le 20/08 (cf memory project-nahual-da) :
 * référence directe à la Piedra del Sol (déjà présente sur la home,
 * piedra-del-sol.tsx), dont l'anneau extérieur réel est formé de deux
 * serpents de feu.
 *
 * Orientation vérifiée par recherche le 21/08 (Tenochtitlan/Fordham) : sur
 * la vraie pierre, les DEUX têtes (gueules ouvertes) sont en BAS, les deux
 * queues se rejoignent en HAUT : pas un unique point de rencontre "tête
 * contre tête". Chaque serpent est tracé tête d'abord (t=0, en bas) vers
 * queue (t=1, en haut) : l'animation de chargement fait donc littéralement
 * "partir du bas pour se rejoindre en haut" (retour de Sylvain), tout en
 * respectant l'iconographie réelle.
 *
 * Chaque serpent est un arc PARTIEL (pas fermé) d'une ellipse, perturbé par
 * deux ondulations sinusoïdales pour rester "irrégulier, pas ovale" (retour
 * de Sylvain) plutôt qu'un arc géométrique parfait. Les deux arcs se
 * chevauchent légèrement à leurs extrémités (haut et bas).
 *
 * Traits réels réutilisés pour dépasser la 1ère tentative jugée "nulle" (une
 * ligne fine sans épaisseur, sans tête reconnaissable, sans texture) : cf
 * recherche du 21/08 (Wikipedia, Xiuhcōātl) : museau "fortement recourbé
 * vers l'arrière" (buildSnoutHook), queue façon "signe trapèze-et-rayon" de
 * l'année (buildTailFlare), corps segmenté en écailles (buildSegmentTicks).
 * Le corps lui-même est maintenant un vrai RUBAN fermé (buildSerpentOutlinePath,
 * offset de part et d'autre de la centerline) plutôt qu'une ligne centrale :
 * rendu en contour (fill: none), pas en couleur pleine (choix de Sylvain :
 * linework minimal, pas un remplissage façon codex).
 *
 * Fonctions pures (pas de Math.random : les ondulations sont des sinusoïdes
 * à phase fixe) : déterministe, donc pas de désaccord SSR/client à
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

/** Liste de points échantillonnés le long de l'arc (t=0 = tête, t=1 =
 * queue) : base commune à toutes les fonctions de tracé ci-dessous, pour ne
 * pas dupliquer la trigonométrie. */
export function sampleSerpentArc(params: SerpentArcParams): Point[] {
  const points: Point[] = [];
  for (let i = 0; i <= params.steps; i++) {
    points.push(pointOnArc(params, i / params.steps));
  }
  return points;
}

/** Tangente locale (normalisée) au point d'indice i : moyenne avant/arrière
 * pour rester stable aux deux extrémités. */
function tangentAt(points: Point[], i: number): Point {
  const p0 = points[Math.max(0, i - 1)];
  const p1 = points[Math.min(points.length - 1, i + 1)];
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

function easeOutCubic(x: number): number {
  return 1 - (1 - x) ** 3;
}

function easeInCubic(x: number): number {
  return x ** 3;
}

// ---------------------------------------------------------------------------
// Largeur du corps le long de t (0 = tête, 1 = queue).
// ---------------------------------------------------------------------------

export type BodyWidthOptions = {
  bodyWidth: number;
  headWidth: number;
  headTaperT: number;
  neckWidth: number;
  tailTaperStartT: number;
};

export const SERPENT_BODY_WIDTH: BodyWidthOptions = {
  bodyWidth: 2.6,
  headWidth: 5,
  headTaperT: 0.14,
  neckWidth: 1.4,
  tailTaperStartT: 0.86,
};

/** Largeur du ruban à t donné : bulbe large côté tête (t proche de 0),
 * largeur de corps constante au milieu, rétrécissement vers un "cou" fin
 * côté queue (t proche de 1, avant le motif décoratif de queue). */
export function widthAt(t: number, options: BodyWidthOptions = SERPENT_BODY_WIDTH): number {
  const ct = Math.min(1, Math.max(0, t));
  if (options.headTaperT > 0 && ct <= options.headTaperT) {
    return options.headWidth + (options.bodyWidth - options.headWidth) * easeOutCubic(ct / options.headTaperT);
  }
  if (options.tailTaperStartT < 1 && ct >= options.tailTaperStartT) {
    const localT = (ct - options.tailTaperStartT) / (1 - options.tailTaperStartT);
    return options.bodyWidth + (options.neckWidth - options.bodyWidth) * easeInCubic(localT);
  }
  return options.bodyWidth;
}

/** Ruban fermé (bord +normal de t=0 à t=1, cap plat, bord -normal de t=1 à
 * t=0, cap plat qui referme sur le point de départ) : se lit comme un vrai
 * corps de serpent en silhouette (contour, `fill: none` côté composant) au
 * lieu d'une ligne centrale sans épaisseur. Corrige le retour du 20/08
 * ("ligne fine... pas de vraie forme pleine"). */
export function buildSerpentOutlinePath(
  params: SerpentArcParams,
  widthOptions: BodyWidthOptions = SERPENT_BODY_WIDTH,
): string {
  const points = sampleSerpentArc(params);
  const last = points.length - 1;
  const forward: Point[] = [];
  const backward: Point[] = [];
  points.forEach((p, i) => {
    const tangent = tangentAt(points, i);
    const normal = { x: -tangent.y, y: tangent.x };
    const halfWidth = widthAt(i / last, widthOptions) / 2;
    forward.push({ x: p.x + normal.x * halfWidth, y: p.y + normal.y * halfWidth });
    backward.push({ x: p.x - normal.x * halfWidth, y: p.y - normal.y * halfWidth });
  });
  const toCommands = (pts: Point[]) => pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" L ");
  return `M ${toCommands(forward)} L ${toCommands([...backward].reverse())} Z`;
}

// ---------------------------------------------------------------------------
// Museau recourbé vers l'arrière, à la pointe tête (t=0).
// ---------------------------------------------------------------------------

export type SnoutHookOptions = { length: number; curlDeg: number; steps: number };

export const SNOUT_HOOK: SnoutHookOptions = { length: 4.5, curlDeg: 150, steps: 6 };

/** Petit tracé décoratif séparé (pas fondu dans le ruban fermé, pour éviter
 * tout risque d'auto-intersection du contour principal) : part de la pointe
 * tête vers l'avant puis recourbe progressivement vers l'arrière jusqu'à
 * `curlDeg` : approximation stylisée du "museau fortement recourbé vers
 * l'arrière" documenté (cf recherche du 21/08, Wikipedia). */
export function buildSnoutHook(params: SerpentArcParams, options: SnoutHookOptions = SNOUT_HOOK): string {
  const points = sampleSerpentArc(params);
  const head = points[0];
  const tangent = tangentAt(points, 0);
  // Direction "vers l'avant" (à l'opposé du sens de croissance de t, qui
  // pointe vers le corps) : c'est là que pointe le museau avant de recourber.
  const forward = { x: -tangent.x, y: -tangent.y };
  const coords = [`${head.x.toFixed(2)},${head.y.toFixed(2)}`];
  for (let i = 1; i <= options.steps; i++) {
    const localT = i / options.steps;
    const angleRad = (options.curlDeg * localT * Math.PI) / 180;
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    const rotated = {
      x: forward.x * cos - forward.y * sin,
      y: forward.x * sin + forward.y * cos,
    };
    const dist = options.length * localT;
    coords.push(`${(head.x + rotated.x * dist).toFixed(2)},${(head.y + rotated.y * dist).toFixed(2)}`);
  }
  return `M ${coords.join(" L ")}`;
}

// ---------------------------------------------------------------------------
// Motif trapèze-et-rayon, à la pointe queue (t=1).
// ---------------------------------------------------------------------------

export type TailFlareOptions = { tabWidths: number[]; tabLength: number; rayLength: number };

export const TAIL_FLARE: TailFlareOptions = { tabWidths: [3, 5, 7], tabLength: 1.8, rayLength: 3 };

/** Paliers de largeur croissante (le "trapèze") au-delà de la pointe queue,
 * plus un petit segment final (le "rayon") : approximation stylisée du
 * signe trapèze-et-rayon de l'année associé à la queue du vrai Xiuhcoatl
 * (cf recherche du 21/08, Wikipedia), plutôt qu'une pointe simple. */
export function buildTailFlare(params: SerpentArcParams, options: TailFlareOptions = TAIL_FLARE): string {
  const points = sampleSerpentArc(params);
  const tail = points[points.length - 1];
  const tangent = tangentAt(points, points.length - 1);
  const normal = { x: -tangent.y, y: tangent.x };
  const segments: string[] = [];
  let cursor = tail;
  for (const width of options.tabWidths) {
    const center = { x: cursor.x + tangent.x * options.tabLength, y: cursor.y + tangent.y * options.tabLength };
    const left = { x: center.x - normal.x * (width / 2), y: center.y - normal.y * (width / 2) };
    const right = { x: center.x + normal.x * (width / 2), y: center.y + normal.y * (width / 2) };
    segments.push(`M ${left.x.toFixed(2)},${left.y.toFixed(2)} L ${right.x.toFixed(2)},${right.y.toFixed(2)}`);
    cursor = center;
  }
  const rayTip = { x: cursor.x + tangent.x * options.rayLength, y: cursor.y + tangent.y * options.rayLength };
  segments.push(`M ${cursor.x.toFixed(2)},${cursor.y.toFixed(2)} L ${rayTip.x.toFixed(2)},${rayTip.y.toFixed(2)}`);
  return segments.join(" ");
}

// ---------------------------------------------------------------------------
// Traits de segmentation le long du corps.
// ---------------------------------------------------------------------------

export type SegmentTickOptions = { count: number; startT: number; endT: number; tickWidthFrac: number };

export const SEGMENT_TICKS: SegmentTickOptions = { count: 9, startT: 0.18, endT: 0.82, tickWidthFrac: 0.9 };

/** Traits perpendiculaires réguliers le long du corps : évoque les écailles
 * carrées segmentées du vrai Xiuhcoatl (diagnostic du 20/08 : "pas de
 * texture segmentée") sans recourir à un remplissage. Exclut les zones
 * tête/queue, déjà traitées par leurs propres motifs. */
export function buildSegmentTicks(
  params: SerpentArcParams,
  widthOptions: BodyWidthOptions = SERPENT_BODY_WIDTH,
  options: SegmentTickOptions = SEGMENT_TICKS,
): string {
  const points = sampleSerpentArc(params);
  const last = points.length - 1;
  const segments: string[] = [];
  for (let i = 0; i < options.count; i++) {
    const t = options.startT + ((options.endT - options.startT) * i) / (options.count - 1);
    const index = Math.round(t * last);
    const p = points[index];
    const tangent = tangentAt(points, index);
    const normal = { x: -tangent.y, y: tangent.x };
    const halfWidth = (widthAt(t, widthOptions) / 2) * options.tickWidthFrac;
    const from = { x: p.x - normal.x * halfWidth, y: p.y - normal.y * halfWidth };
    const to = { x: p.x + normal.x * halfWidth, y: p.y + normal.y * halfWidth };
    segments.push(`M ${from.x.toFixed(2)},${from.y.toFixed(2)} L ${to.x.toFixed(2)},${to.y.toFixed(2)}`);
  }
  return segments.join(" ");
}

// ---------------------------------------------------------------------------
// Les deux serpents, dans un viewBox 200x100 (ratio 2:1, adapté à un bloc de
// texte plus large que haut).
// ---------------------------------------------------------------------------

// Chacun couvre un peu plus d'un demi-tour (200°) pour se chevaucher aux
// deux points de jonction (haut et bas), comme sur la Piedra del Sol réelle.
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

// Serpent A : tête en bas (100°, légèrement après le point bas, t=0), queue
// en haut (260°, légèrement avant le sommet, t=1) : couvre le côté droit de
// l'anneau (via 360°/0° au passage). Le tracé va tête -> queue : l'animation
// de chargement fait "partir du bas" (retour de Sylvain).
export const SERPENT_A: SerpentArcParams = {
  ...SHARED,
  startDeg: 460, // 460 = 100 + 360, pour balayer par valeurs décroissantes vers 260
  endDeg: 260,
  wobblePhase1: 0.4,
  wobblePhase2: 2.1,
};

// Serpent B : tête en bas (80°, t=0), queue en haut (280°, t=1) : couvre le
// côté gauche, phases différentes de A pour ne pas être un simple miroir
// (retour de Sylvain : "irrégulier", pas symétrique).
export const SERPENT_B: SerpentArcParams = {
  ...SHARED,
  startDeg: 80,
  endDeg: 280,
  wobblePhase1: 1.6,
  wobblePhase2: 4.3,
};
