/**
 * Les cempasuchil du Nord (02/09, refonte 03/09). La fleur des morts, celle
 * qui guide les ames par sa couleur et son parfum (tradition du Dia de
 * Muertos). D'abord un chemin du cerf vers le Nord ; retour Sylvain 03/09
 * "etaler encore, suivre tout le contour de la Piedra del Sol, de maniere
 * irreguliere, en surface de l'eau" : les fleurs ENCERCLENT la Piedra
 * (rayon 3) en couronne irreguliere qui flotte sur la nappe, et la
 * couronne se COMPLETE en descendant la page (axe systemique 3 du Codex).
 * Seule couleur chaude autorisee contre le violet du Nord.
 *
 * Pur et deterministe (pas de Math.random dans le rendu) : testable.
 */

export const CEMPASUCHIL_COUNT = 72;
/** Rayon de la Piedra del Sol (PiedraGround GROUND_RADIUS). */
const PIEDRA_RADIUS = 3;
const RING_MIN = PIEDRA_RADIUS + 0.15;
const RING_MAX = PIEDRA_RADIUS + 0.75;

export type CempasuchilFlower = {
  x: number;
  z: number;
  /** Cap (radians) de la fleur, derive lente. */
  yaw: number;
  /** Echelle relative 0.7..1.2. */
  scale: number;
  /** Visible a cette profondeur de page. */
  visible: boolean;
  /** Phase de flottaison (bob), pour le composant. */
  phase: number;
};

function hash(i: number, k: number): number {
  const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

/** Les fleurs de la couronne a la profondeur `depth` (0..1) et au temps
 * `time` (secondes). Ordre : angle croissant autour de la Piedra. */
export function cempasuchilFlowers(depth: number, time: number): CempasuchilFlower[] {
  const d = Math.min(1, Math.max(0, depth));
  const fraction = 0.3 + 0.7 * d;
  const out: CempasuchilFlower[] = [];
  for (let i = 0; i < CEMPASUCHIL_COUNT; i++) {
    // Contour irregulier : angle regulier + gigue, rayon qui ondule
    // (grands lobes) + eparpillement propre a chaque fleur.
    const baseAngle = (i / CEMPASUCHIL_COUNT) * Math.PI * 2;
    const angle = baseAngle + (hash(i, 1) - 0.5) * 0.12;
    const lobes = Math.sin(baseAngle * 5 + 1.3) * 0.16 + Math.sin(baseAngle * 2 + 0.4) * 0.08;
    const r = RING_MIN + (RING_MAX - RING_MIN) * (0.35 + 0.65 * hash(i, 2)) + lobes;
    // Derive lente : le vent pousse, l'eau ramene, jamais un deplacement net.
    const drift = 0.1 * Math.sin(time * 0.35 + i * 1.7) + 0.05 * Math.sin(time * 0.9 + i * 0.6);
    const x = Math.cos(angle) * r - drift;
    const z = Math.sin(angle) * r + 0.05 * Math.cos(time * 0.4 + i * 2.1);
    out.push({
      x,
      z,
      yaw: hash(i, 3) * Math.PI * 2 + time * 0.05 * (hash(i, 4) - 0.5),
      scale: 0.7 + hash(i, 5) * 0.5,
      // La couronne se complete en descendant : chaque fleur a son seuil.
      visible: hash(i, 7) < fraction,
      phase: hash(i, 6) * Math.PI * 2,
    });
  }
  return out;
}
