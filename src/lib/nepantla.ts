/**
 * Nepantla (nahuatl : « l'entre-deux ») : le passage entre deux
 * directions cardinales. Chantier transitions 03/09 : le monde 3D
 * (cerf + Piedra + montagnes) est persistant et ne doit JAMAIS etre
 * fige ni duplique : seul le contenu DOM voyage, emporte par Ehecatl
 * dans la direction cardinale cible. Ce module est la source unique
 * des offsets et du tempo : contexte de transition, frame de contenu
 * et (a terme) camera lisent tous la meme horloge.
 *
 * Convention spatiale (heritee du slide valide le 28/08) : aller vers
 * une direction = le contenu sortant part du cote OPPOSE a l'arrivee
 * du nouveau. Est : l'ancien sort a gauche, le nouveau arrive de
 * droite. Le Centre (jade) n'est pas un voyage lateral mais un retour
 * au foyer : implosion d'echelle, pas de glissement.
 */

export type NepantlaDirection = "jade" | "dore" | "turquoise" | "cendre" | "obsidienne";

/** Offset en fractions de viewport (x * innerWidth, y * innerHeight)
 *  + facteur d'echelle. scale === 1 pour les glissements. */
export type NepantlaOffset = { x: number; y: number; scale: number };

const EXIT_OFFSETS: Record<NepantlaDirection, NepantlaOffset> = {
  dore: { x: -1, y: 0, scale: 1 },
  turquoise: { x: 0, y: -1, scale: 1 },
  cendre: { x: 1, y: 0, scale: 1 },
  obsidienne: { x: 0, y: 1, scale: 1 },
  jade: { x: 0, y: 0, scale: 0.92 },
};

const ENTER_OFFSETS: Record<NepantlaDirection, NepantlaOffset> = {
  dore: { x: 1, y: 0, scale: 1 },
  turquoise: { x: 0, y: 1, scale: 1 },
  cendre: { x: -1, y: 0, scale: 1 },
  obsidienne: { x: 0, y: -1, scale: 1 },
  jade: { x: 0, y: 0, scale: 1.06 },
};

/** Ou part le contenu de la page quittee. */
export function exitOffset(direction: NepantlaDirection): NepantlaOffset {
  return EXIT_OFFSETS[direction];
}

/** D'ou arrive le contenu de la nouvelle page. */
export function enterOffset(direction: NepantlaDirection): NepantlaOffset {
  return ENTER_OFFSETS[direction];
}

/**
 * Sens d'orbite par direction (etage 2, plan-sequence). Le passage
 * cardinal n'est plus un aller-retour (whip pan) mais UN TOUR COMPLET
 * de la camera autour du cerf : le cerf est l'axe du monde, c'est le
 * monde qui tourne autour de lui. Un tour entier (2π) garantit que la
 * camera retombe EXACTEMENT sur sa position de repos (sin/cos
 * periodiques) : plan-sequence sans coupe ni recalage. Le Centre
 * (jade) ne voyage pas : on rentre au foyer par l'axe, pas d'orbite.
 * Signes choisis pour voyager VERS la direction (Est/Ouest opposes,
 * Nord/Sud opposes) : constantes a ajuster a l'oeil si besoin.
 */
const SWING_SIGN: Record<NepantlaDirection, number> = {
  dore: 1,
  turquoise: 1,
  cendre: -1,
  obsidienne: -1,
  jade: 0,
};

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

/** Ease lent-rapide-lent (easeInOutCubic) : le changement de vitesse
 *  est la signature du passage. */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Azimut (radians) ajoute a l'orbite de repos pendant le passage.
 *  0 au depart, 2π * sens a l'arrivee : jamais de retour en arriere. */
export function swingAzimuth(t: number, direction: NepantlaDirection): number {
  return SWING_SIGN[direction] * Math.PI * 2 * easeInOutCubic(clamp01(t));
}

/** Vitesse angulaire normalisee 0..1 (derivee de l'ease, pic a t=0.5,
 *  la ou la navigation se fait). Sert au FOV, au dolly de respiration
 *  et (etage 2b) au flou de mouvement directionnel. */
export function swingSpeed(t: number): number {
  const c = clamp01(t);
  if (c <= 0 || c >= 1) return 0;
  // Derivee d'easeInOutCubic : 12t² pour t<0.5, 12(1-t)² sinon ; pic 3.
  const d = c < 0.5 ? 12 * c * c : 12 * (1 - c) * (1 - c);
  return d / 3;
}

/**
 * Tempo unique du passage (secondes / noms d'ease GSAP). Le changement
 * de vitesse EST la signature : le vent accelere en emportant l'ancien
 * contenu (ease .in), la navigation se fait au coeur du mouvement, et
 * le nouveau contenu decelere longuement en se posant (ease .out).
 */
export const NEPANTLA_TIMING = {
  /** Duree du progress 0→1 : l'horloge du voyage complet (head-look du
   *  cerf + orbite camera). La sortie du contenu finit vers t=0.475,
   *  au pic de vitesse de l'orbite : la nav se fait au coeur du
   *  mouvement, masquee par la vitesse. */
  progressDuration: 2.0,
  /** Latence avant que le vent n'attrape le contenu : le cerf amorce d'abord. */
  exitDelay: 0.25,
  exitDuration: 0.7,
  enterDuration: 0.9,
  exitEase: "power3.in",
  enterEase: "power3.out",
  /** Reduced motion : fondu simple, aucun deplacement. */
  reducedFadeDuration: 0.2,
} as const;
