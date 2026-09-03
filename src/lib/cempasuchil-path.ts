/**
 * Le chemin de cempasuchil (02/09, Nord). La fleur des morts, celle qui
 * guide les ames par sa couleur et son parfum (tradition du Dia de
 * Muertos, chemins de petales de l'autel a la porte). Ici des fleurs
 * entieres qui flottent sur la nappe du Mictlan, depuis le cerf vers le
 * Nord (-z, la direction des morts), et le chemin s'ALLONGE en
 * descendant la page (axe systemique 3 du Codex). Seule couleur chaude
 * autorisee contre le violet du Nord (cf direction-colors, glint).
 *
 * Pur et deterministe (pas de Math.random dans le rendu) : testable.
 */

// 64 -> 44 fleurs (03/09, retour Sylvain "les fleurs font encore tout un
// tas, plus eparpille pour faire un chemin") : espacees regulierement
// jusqu'a la margelle, peu de dispersion laterale.
// 44 -> 56 (03/09, "on doit etendre encore les fleurs") : chemin plus
// long et plus large, jusqu'a la margelle.
export const CEMPASUCHIL_COUNT = 56;
const PATH_START_Z = -1.6;
const PATH_LENGTH = 4.3;

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

/** Les fleurs du chemin a la profondeur `depth` (0..1) et au temps `time`
 * (secondes). L'ordre est celui du chemin : index 0 pres du cerf. */
export function cempasuchilFlowers(depth: number, time: number): CempasuchilFlower[] {
  const d = Math.min(1, Math.max(0, depth));
  const visibleCount = Math.max(6, Math.round(CEMPASUCHIL_COUNT * (0.25 + 0.75 * d)));
  const out: CempasuchilFlower[] = [];
  for (let i = 0; i < CEMPASUCHIL_COUNT; i++) {
    const s = i / (CEMPASUCHIL_COUNT - 1);
    // Colonne vertebrale du chemin : part a cote du cerf, serpente
    // doucement vers -z.
    const spineX = 0.6 + Math.sin(s * 3.2) * 1.0;
    const spineZ = PATH_START_Z - s * PATH_LENGTH;
    // Eparpillement autour de la colonne, propre a chaque fleur.
    // Chemin : dispersion laterale faible, pas de doublons le long.
    const side = (hash(i, 1) - 0.5) * 0.9;
    const along = (hash(i, 2) - 0.5) * 0.1;
    // Derive lente : les fleurs flottent, le vent d'Ouest les pousse et
    // l'eau les ramene (oscillation), jamais un deplacement net.
    const drift = 0.16 * Math.sin(time * 0.35 + i * 1.7) + 0.08 * Math.sin(time * 0.9 + i * 0.6);
    const x = spineX + side - drift;
    const z = spineZ + along + 0.06 * Math.cos(time * 0.4 + i * 2.1);
    out.push({
      x,
      z,
      yaw: hash(i, 3) * Math.PI * 2 + time * 0.05 * (hash(i, 4) - 0.5),
      scale: 0.7 + hash(i, 5) * 0.5,
      visible: i < visibleCount,
      phase: hash(i, 6) * Math.PI * 2,
    });
  }
  return out;
}
