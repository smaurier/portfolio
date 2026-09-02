/**
 * Logique pure du vent d'obsidienne (02/09, Nord, sprint identites).
 * Mythologie verifiee (Wikipedia es "Itzehecayan", Mexicolore, UGTO "Las
 * moradas de los muertos") : Itzehecayan, 4e strate du Mictlan, "le lieu
 * ou vente l'obsidienne" : des vents glaces qui coupent comme des lames.
 * Un VENT, donc horizontal (Est -> Ouest), pas une pluie de fleches : les
 * fleches sont une autre strate, Temiminaloyan (7e), "ou l'on tire des
 * fleches sur les gens" : ici un evenement de profondeur de scroll.
 *
 * Testable sans GPU : trajectoire d'une lame, entaille du cerf (entree
 * dans son volume), volees de fleches.
 */

export type BladeState = {
  x: number;
  y: number;
  z: number;
  /** Vitesse de traversee (unites monde / s). */
  speed: number;
  /** Roulis en vol (radians). */
  roll: number;
  /** Tangage leger (radians). */
  pitch: number;
};

function hash(seed: number, k: number): number {
  const v = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

/**
 * Etat d'une lame a l'instant `time` pour une graine `seed` (0..1) : la
 * lame traverse `span` unites de +x vers -x en boucle, a sa propre hauteur,
 * sur sa propre voie (z), a sa propre vitesse, en tournant sur elle-meme.
 */
export function bladeState(time: number, seed: number, span: number): BladeState {
  const speed = 0.9 + hash(seed, 1) * 1.4;
  const x = span / 2 - ((time * speed + seed * span) % span + span) % span;
  const baseY = 0.5 + hash(seed, 2) * 1.8;
  const y = baseY + Math.sin(time * 0.7 + seed * 6.28) * 0.12;
  const z = (hash(seed, 3) - 0.5) * 5 + Math.cos(time * 0.4 + seed * 4.1) * 0.15;
  const roll = seed * 6.28 + time * (1.5 + hash(seed, 4) * 2.5);
  const pitch = Math.sin(time * 1.1 + seed * 9.0) * 0.18;
  return { x, y, z, speed, roll, pitch };
}

export type WorldPoint = { x: number; y: number; z: number };

/** Volume du cerf (ellipsoide) : corps centre a hauteur 1.05, plus long
 * en z (le cerf est de profil dans le repere monde, cf StagMirror bbox). */
export const DEER_VOLUME = {
  center: { x: 0, y: 1.05, z: 0 },
  radii: { x: 0.45, y: 0.7, z: 1.0 },
};

function ellipsoidDistance(p: WorldPoint): number {
  const { center, radii } = DEER_VOLUME;
  const dx = (p.x - center.x) / radii.x;
  const dy = (p.y - center.y) / radii.y;
  const dz = (p.z - center.z) / radii.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export type BladeHit = {
  /** 0..1, plus fort au coeur du corps. */
  strength: number;
  /** +1 : flanc z>0, -1 : flanc z<0 (le cerf recule du cote oppose). */
  side: 1 | -1;
};

/** Une lame entaille le cerf quand elle ENTRE dans son volume (jamais a
 * chaque frame passee dedans). */
export function bladeHit(prev: WorldPoint, next: WorldPoint): BladeHit | null {
  const dPrev = ellipsoidDistance(prev);
  const dNext = ellipsoidDistance(next);
  if (dPrev < 1 || dNext >= 1) return null;
  const strength = Math.min(1, Math.max(0.15, 1 - dNext));
  return { strength, side: next.z >= 0 ? 1 : -1 };
}

const ARROW_DEPTH_MIN = 0.6;
const VOLLEY_PERIOD = 9;
const VOLLEY_WINDOW = 0.5;

export type Arrow = { x: number; z: number; delay: number };
export type ArrowVolley = { id: number; arrows: Arrow[] };

/**
 * Temiminaloyan : au-dela de 60 % de profondeur, une volee de fleches
 * toutes les ~9 s. Retourne la volee pendant sa fenetre d'ouverture (0.5 s
 * apres le debut de la periode) avec un id stable pour ne la lancer
 * qu'une fois. Les fleches tombent dans le bassin autour du cerf, jamais
 * sur lui (rayon 1.6..4.8).
 */
export function arrowVolley(depth: number, time: number): ArrowVolley | null {
  if (depth < ARROW_DEPTH_MIN) return null;
  const k = Math.floor(time / VOLLEY_PERIOD);
  const tIn = time - k * VOLLEY_PERIOD;
  if (tIn >= VOLLEY_WINDOW) return null;
  const count = 4 + Math.floor(hash(k + 0.5, 7) * 3);
  const arrows: Arrow[] = [];
  for (let i = 0; i < count; i++) {
    const angle = hash(k + 0.5, 10 + i) * Math.PI * 2;
    const r = 1.6 + hash(k + 0.5, 20 + i) * 3.2;
    arrows.push({ x: Math.cos(angle) * r, z: Math.sin(angle) * r, delay: hash(k + 0.5, 30 + i) * 0.6 });
  }
  return { id: k, arrows };
}
