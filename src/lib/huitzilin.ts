/**
 * Huitzilin, le colibri (04/09, contre-chant du Sud). Huitzilopochtli est
 * « le colibri du Sud » (ou « colibri gaucher ») : l'oiseau qui porte son
 * nom est le guerrier du soleil, celui qui chasse les 400 etoiles. Ici,
 * quelques colibris de plusieurs especes vivent dans le ciel du Sud :
 * vol stationnaire vibrant, puis une FLECHE vers un autre point, puis
 * stationnaire a nouveau. De nuit ils volent haut, vers les etoiles ; a
 * midi ils descendent vers les fleurs.
 *
 * Pur et deterministe : un etat par oiseau, une fonction de pas, un bruit
 * a base de sinus dephases par la graine. Le composant ne fait que poser
 * le modele dessus.
 */

export type Vec3 = { x: number; y: number; z: number };

export type Species = {
  /** Nom d'usage (francais), nom nahuatl / scientifique. */
  fr: string;
  name: string;
  /** Rotation de teinte (degres) appliquee a la texture peinte du modele. */
  hueShift: number;
  /** Multiplicateur de saturation. */
  saturation: number;
  /** Echelle du corps (1 = modele). */
  scale: number;
};

/** Cinq especes, une par oiseau : la texture du modele est peinte (tete
 * bleue, corps vert, queue orange) ; chaque espece la decale en teinte. */
export const HUITZILIN_SPECIES: readonly Species[] = [
  { fr: "Colibri a tete bleue", name: "Huitzilin xoxouhqui", hueShift: 0, saturation: 1, scale: 1 },
  { fr: "Emeraude", name: "Chlorostilbon", hueShift: 40, saturation: 1.15, scale: 0.9 },
  { fr: "Gorge rubis", name: "Archilochus colubris", hueShift: -110, saturation: 1.1, scale: 0.95 },
  { fr: "Saphir", name: "Hylocharis", hueShift: -30, saturation: 1.2, scale: 1.05 },
  { fr: "Ariane a ventre roux", name: "Amazilia", hueShift: 95, saturation: 0.95, scale: 1.1 },
];

export type BirdSpec = {
  /** Boite de vol : x symetrique, z devant/derriere le cerf. */
  xHalf: number;
  zMin: number;
  zMax: number;
  /** Altitudes : de nuit (haut, vers les etoiles) et a midi (bas, vers les fleurs). */
  yMinNight: number;
  yMaxNight: number;
  yMinNoon: number;
  yMaxNoon: number;
  /** Vitesse d'une fleche (u/s) et duree du stationnaire (s, min/max). */
  dartSpeed: number;
  hoverMin: number;
  hoverMax: number;
  /** Amplitude de la vibration en stationnaire (u). */
  jitter: number;
  /** Longueur d'une fleche de chasse (u) : le colibri file vers l'etoile
   * visee sur cette distance, borne a la boite. */
  huntDart: number;
};

/** Une proie : l'etoile visee (index dans le champ) et sa direction
 * unitaire dans le ciel. */
export type Prey = { index: number; dir: Vec3 };

export const HUITZILIN_SPEC: BirdSpec = {
  xHalf: 9,
  zMin: -9,
  zMax: 3,
  yMinNight: 3.2,
  yMaxNight: 6.5,
  yMinNoon: 1.2,
  yMaxNoon: 3.4,
  dartSpeed: 9,
  hoverMin: 1.6,
  hoverMax: 4.2,
  jitter: 0.12,
  huntDart: 5,
};

export type BirdState = {
  x: number;
  y: number;
  z: number;
  mode: "hover" | "dart";
  /** Point d'ancrage du stationnaire courant ; cible de la fleche. */
  anchor: Vec3;
  target: Vec3;
  /** Temps restant dans le mode courant (s). */
  remaining: number;
  /** Cap (rad, plan xz, 0 = +x) et tangage courants, lisses. */
  heading: number;
  pitch: number;
  t: number;
  seed: number;
  /** Compteur de fleches (pour les tirages deterministes). */
  darts: number;
  /** Etoile visee par la fleche en cours (chasse), sinon null. */
  preyIndex: number | null;
  /** Etoile mise a mort a la fin de la derniere fleche (un seul pas), sinon null. */
  justKilled: number | null;
};

function hash(seed: number, i: number, k: number): number {
  const v = Math.sin(seed * 91.7 + i * 12.9898 + k * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function wrapAngle(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

/** Un point de la boite, a l'altitude du moment (p = progres 0..1). */
function pickAnchor(seed: number, k: number, p: number, spec: BirdSpec): Vec3 {
  const yMin = spec.yMinNight + (spec.yMinNoon - spec.yMinNight) * p;
  const yMax = spec.yMaxNight + (spec.yMaxNoon - spec.yMaxNight) * p;
  return {
    x: -spec.xHalf + 2 * spec.xHalf * hash(seed, k, 1),
    y: yMin + (yMax - yMin) * hash(seed, k, 2),
    z: spec.zMin + (spec.zMax - spec.zMin) * hash(seed, k, 3),
  };
}

export function initialBird(seed: number, spec: BirdSpec = HUITZILIN_SPEC, p = 0): BirdState {
  const anchor = pickAnchor(seed, 0, p, spec);
  return {
    x: anchor.x,
    y: anchor.y,
    z: anchor.z,
    mode: "hover",
    anchor,
    target: anchor,
    remaining: spec.hoverMin + (spec.hoverMax - spec.hoverMin) * hash(seed, 0, 4),
    heading: hash(seed, 0, 5) * Math.PI * 2,
    pitch: 0,
    t: 0,
    seed,
    darts: 0,
    preyIndex: null,
    justKilled: null,
  };
}

/** Un pas : en stationnaire, vibration autour de l'ancre et cap qui derive
 * doucement ; en fleche, ligne droite vers la cible a vitesse constante,
 * cap sur la cible ; a l'arrivee, nouveau stationnaire. L'altitude de
 * l'ancre suit le progres (les fleurs a midi). */
/**
 * Un pas de vol. `pickPrey` (05/09, le geste du mythe) : appele quand un
 * stationnaire se termine ; s'il rend une proie, la fleche part vers ELLE
 * (le colibri file dans la direction de l'etoile sur huntDart, borne a la
 * boite) et l'etoile est marquee tuee a l'arrivee (`justKilled`, un pas).
 * Sans proie : une fleche ordinaire vers une nouvelle ancre.
 */
export function stepBird(s: BirdState, dt: number, p: number, spec: BirdSpec = HUITZILIN_SPEC, pickPrey?: (s: BirdState) => Prey | null): BirdState {
  const t = s.t + dt;
  const pp = clamp(p, 0, 1);
  if (s.justKilled !== null) s = { ...s, justKilled: null };
  if (s.mode === "hover") {
    const remaining = s.remaining - dt;
    // Vibration : trois sinus incommensurables autour de l'ancre.
    const ph = s.seed * 3.1 + s.darts;
    const jx = Math.sin(t * 7.3 + ph) * 0.6 + Math.sin(t * 11.9 + ph * 1.7) * 0.4;
    const jy = Math.sin(t * 9.1 + ph * 0.7) * 0.6 + Math.sin(t * 13.7 + ph * 2.3) * 0.4;
    const jz = Math.sin(t * 6.7 + ph * 1.3) * 0.6 + Math.sin(t * 10.3 + ph * 0.4) * 0.4;
    // L'ancre glisse vers l'altitude du moment (le jour descend l'oiseau).
    const yMin = spec.yMinNight + (spec.yMinNoon - spec.yMinNight) * pp;
    const yMax = spec.yMaxNight + (spec.yMaxNoon - spec.yMaxNight) * pp;
    const anchor = { x: s.anchor.x, y: clamp(s.anchor.y, yMin, yMax), z: s.anchor.z };
    const x = clamp(anchor.x + jx * spec.jitter, -spec.xHalf, spec.xHalf);
    const y = clamp(anchor.y + jy * spec.jitter, spec.yMinNoon, spec.yMaxNight);
    const z = clamp(anchor.z + jz * spec.jitter, spec.zMin, spec.zMax);
    const heading = wrapAngle(s.heading + Math.sin(t * 0.9 + ph) * 0.35 * dt);
    const pitch = s.pitch + (0.25 - s.pitch) * Math.min(1, dt * 3); // cabre en stationnaire
    if (remaining > 0) return { ...s, x, y, z, anchor, remaining, heading, pitch, t };
    // Fin du stationnaire : une fleche, vers une proie si on en a une,
    // sinon vers une nouvelle ancre.
    const darts = s.darts + 1;
    const prey = pickPrey ? pickPrey(s) : null;
    if (prey) {
      const yMin = spec.yMinNight + (spec.yMinNoon - spec.yMinNight) * pp;
      const yMax = spec.yMaxNight + (spec.yMaxNoon - spec.yMaxNight) * pp;
      const target = {
        x: clamp(x + prey.dir.x * spec.huntDart, -spec.xHalf, spec.xHalf),
        y: clamp(y + prey.dir.y * spec.huntDart, yMin, yMax),
        z: clamp(z + prey.dir.z * spec.huntDart, spec.zMin, spec.zMax),
      };
      return { ...s, x, y, z, anchor, mode: "dart", target, remaining: 0, heading, pitch, t, darts, preyIndex: prey.index };
    }
    const target = pickAnchor(s.seed, darts, pp, spec);
    return { ...s, x, y, z, anchor, mode: "dart", target, remaining: 0, heading, pitch, t, darts, preyIndex: null };
  }
  // Fleche : droit vers la cible.
  const dx = s.target.x - s.x, dy = s.target.y - s.y, dz = s.target.z - s.z;
  const dist = Math.hypot(dx, dy, dz);
  const step = spec.dartSpeed * dt;
  const heading = dist > 1e-6 ? Math.atan2(dz, dx) : s.heading;
  const pitch = dist > 1e-6 ? Math.asin(clamp(dy / dist, -1, 1)) * 0.6 : s.pitch;
  if (dist <= step) {
    return {
      ...s,
      x: s.target.x,
      y: s.target.y,
      z: s.target.z,
      mode: "hover",
      anchor: s.target,
      remaining: spec.hoverMin + (spec.hoverMax - spec.hoverMin) * hash(s.seed, s.darts, 4),
      heading,
      pitch,
      t,
      preyIndex: null,
      justKilled: s.preyIndex,
    };
  }
  const k = step / dist;
  return { ...s, x: s.x + dx * k, y: s.y + dy * k, z: s.z + dz * k, heading, pitch, t };
}

/** Direction du regard (unitaire) : cap + tangage. */
export function birdTangent(s: BirdState): Vec3 {
  const c = Math.cos(s.pitch);
  return { x: Math.cos(s.heading) * c, y: Math.sin(s.pitch), z: Math.sin(s.heading) * c };
}
