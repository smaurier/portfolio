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
 * Tempo unique du passage (secondes / noms d'ease GSAP). Le changement
 * de vitesse EST la signature : le vent accelere en emportant l'ancien
 * contenu (ease .in), la navigation se fait au coeur du mouvement, et
 * le nouveau contenu decelere longuement en se posant (ease .out).
 */
export const NEPANTLA_TIMING = {
  /** Duree du progress 0→1 lu par le cerf (head-look) et la camera (whip). */
  progressDuration: 1.2,
  /** Latence avant que le vent n'attrape le contenu : le cerf amorce d'abord. */
  exitDelay: 0.25,
  exitDuration: 0.7,
  enterDuration: 0.9,
  exitEase: "power3.in",
  enterEase: "power3.out",
  /** Reduced motion : fondu simple, aucun deplacement. */
  reducedFadeDuration: 0.2,
} as const;
