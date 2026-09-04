/**
 * Les Centzon Huitznahua, « les quatre cents du Sud » (04/09, lead du Sud).
 * A Coatepec, les 400 freres de Huitzilopochtli montent tuer leur mere
 * Coatlicue ; Huitzilopochtli nait arme, les met en deroute et les
 * disperse : ce sont les etoiles du ciel austral, chassees par le soleil
 * qui se leve. Ici : en haut de page, 400 etoiles scintillent sur le dome
 * de nuit ; a mesure que la lumiere monte au scroll, elles meurent, chacune
 * a son moment ; les unes s'eteignent sur place, les autres tombent en un
 * trait bref. En bas de page, plein midi, il n'en reste aucune.
 *
 * Pur et deterministe : le champ est engendre par une graine, l'etat de
 * chaque etoile est une fonction du progres (0..1) et du temps.
 */

export type Vec3 = { x: number; y: number; z: number };

export type Star = {
  /** Direction unitaire sur le dome (y = haut). */
  dir: Vec3;
  /** Taille relative (1 = moyenne). */
  size: number;
  /** Scintillement : phase et vitesse (rad, rad/s). */
  phase: number;
  speed: number;
  /** Progres (0..1) auquel elle meurt. */
  deathAt: number;
  /** Tombe (trait) ou s'eteint sur place. */
  falls: boolean;
  /** Direction unitaire de la chute (vers le bas, un peu de biais). */
  fall: Vec3;
};

export type StarState = {
  /** 0..1 */
  alpha: number;
  /** Deplacement (en unites de dome, a multiplier par le rayon) pendant la chute. */
  offset: Vec3;
  /** 0..1 : longueur du trait de chute (0 = pas de trait). */
  streak: number;
};

export const CENTZON_COUNT = 400;

export const CENTZON_SPEC = {
  minElevDeg: 5,
  maxElevDeg: 78,
  /** Fenetre des morts sur l'arc de revelation. */
  firstDeath: 0.12,
  lastDeath: 0.8,
  /** Duree (en progres) d'une extinction sur place et d'une chute. */
  fadeSpan: 0.03,
  fallSpan: 0.06,
  /** Longueur d'une chute, en fraction du rayon du dome. */
  fallLength: 0.16,
  /** Part des etoiles qui tombent. */
  fallShare: 0.28,
};

const RAD = Math.PI / 180;

function hash(seed: number, i: number, k: number): number {
  const v = Math.sin(seed * 91.7 + i * 12.9898 + k * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function makeStarField(seed: number): Star[] {
  const out: Star[] = [];
  const minY = Math.sin(CENTZON_SPEC.minElevDeg * RAD);
  const maxY = Math.sin(CENTZON_SPEC.maxElevDeg * RAD);
  for (let i = 0; i < CENTZON_COUNT; i++) {
    // Uniforme sur la calotte : y uniforme entre les bornes, azimut uniforme.
    const y = minY + (maxY - minY) * hash(seed, i, 1);
    const az = hash(seed, i, 2) * Math.PI * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const dir = { x: Math.cos(az) * r, y, z: Math.sin(az) * r };
    // Tailles : beaucoup de petites, quelques brillantes (loi en puissance).
    const size = 0.55 + 1.9 * Math.pow(hash(seed, i, 3), 3);
    // Chute : vers le bas, biais lateral, dans le plan tangent approximatif.
    const lat = (hash(seed, i, 6) - 0.5) * 0.9;
    const fx = -dir.x * 0.2 + Math.cos(az + Math.PI / 2) * lat;
    const fz = -dir.z * 0.2 + Math.sin(az + Math.PI / 2) * lat;
    const fy = -1;
    const fl = Math.hypot(fx, fy, fz);
    out.push({
      dir,
      size,
      phase: hash(seed, i, 4) * Math.PI * 2,
      speed: 0.8 + 2.4 * hash(seed, i, 5),
      deathAt: CENTZON_SPEC.firstDeath + (CENTZON_SPEC.lastDeath - CENTZON_SPEC.firstDeath) * hash(seed, i, 7),
      falls: hash(seed, i, 8) < CENTZON_SPEC.fallShare,
      fall: { x: fx / fl, y: fy / fl, z: fz / fl },
    });
  }
  return out;
}

const ZERO: Vec3 = { x: 0, y: 0, z: 0 };

/** Etat d'une etoile au progres p (0..1) et au temps t (s). */
export function starState(star: Star, p: number, t: number): StarState {
  const { fadeSpan, fallSpan, fallLength, firstDeath, lastDeath } = CENTZON_SPEC;
  const span = star.falls ? fallSpan : fadeSpan;
  const since = p - star.deathAt;
  if (since >= span) return { alpha: 0, offset: ZERO, streak: 0 };
  // Le jour qui monte affaiblit toutes les vivantes (le ciel s'eclaircit).
  const day = clamp01((p - firstDeath) / (lastDeath - firstDeath));
  const dayFade = 1 - 0.55 * day;
  const twinkle = 0.7 + 0.3 * Math.sin(t * star.speed + star.phase);
  if (since < 0) return { alpha: twinkle * dayFade, offset: ZERO, streak: 0 };
  const u = since / span; // 0..1 pendant la mort
  if (!star.falls) return { alpha: twinkle * dayFade * (1 - u), offset: ZERO, streak: 0 };
  // Chute : eclat bref au depart, puis extinction, glissement le long de fall.
  const flash = u < 0.15 ? 1 + 1.2 * (1 - u / 0.15) : 1;
  const d = fallLength * u;
  return {
    alpha: clamp01(flash * dayFade * (1 - u) * 1.2),
    offset: { x: star.fall.x * d, y: star.fall.y * d, z: star.fall.z * d },
    streak: Math.sin(u * Math.PI),
  };
}
