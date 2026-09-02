// Logique pure de la nappe d'eau du Nord (02/09, sprint identites). La
// simulation elle-meme (equation des ondes sur GPU, ping-pong de render
// targets) vit dans tezcatl-ripple-sim.ts, non testable sans GPU. Ici :
// tout ce qui se decide sans GPU, testable comme camera-path.ts ou
// direction-arc.ts : projection sol -> grille, souris, sabots, gate.
// (Le nom "fluid" date de la fumee sur Navier-Stokes, retiree le 02/09 ;
// le simulateur et ses emetteurs ont ete retires avec elle, cf git.)

export type SimUv = { u: number; v: number };
export type Splat = SimUv & { du: number; dv: number };

/** Projette un point du sol (x, z monde) sur la grille de simulation, un
 * carre de demi-cote `extent` centre sur le cerf. D'abord le disque du
 * tezcatl (rayon 3), puis toute la surface (02/09, "on va etendre la fumee
 * a toute la surface") : la grille est carree, `inside` aussi. */
export function worldToSimUv(x: number, z: number, extent: number): SimUv & { inside: boolean } {
  const u = x / (2 * extent) + 0.5;
  const v = z / (2 * extent) + 0.5;
  return { u, v, inside: Math.abs(x) <= extent && Math.abs(z) <= extent };
}

const POINTER_MAX_SPEED = 1; // unites de grille / s
const POINTER_GAIN = 0.6;

/** La souris pousse la fumee : splat de vitesse le long du deplacement du
 * pointeur projete sur le disque. Null sans mouvement ou hors grille. */
export function pointerSplat(prev: SimUv, next: SimUv, dt: number): Splat | null {
  if (next.u < 0 || next.u > 1 || next.v < 0 || next.v > 1) return null;
  const dx = next.u - prev.u;
  const dy = next.v - prev.v;
  if (dt <= 0 || (dx === 0 && dy === 0)) return null;
  let du = (dx / dt) * POINTER_GAIN;
  let dv = (dy / dt) * POINTER_GAIN;
  const speed = Math.hypot(du, dv);
  if (speed > POINTER_MAX_SPEED) {
    du *= POINTER_MAX_SPEED / speed;
    dv *= POINTER_MAX_SPEED / speed;
  }
  return { u: next.u, v: next.v, du, dv };
}

const GATE_FLOOR = 0.3;

/** Meme regle que le reflet menteur : Nord seulement, et le Mictlan se
 * revele en descendant (axe systemique 3 du Codex). Reduced-motion ne
 * coupe pas la fumee (elle sera figee par le composant), elle reste
 * visible : un voile immobile est lisible, une absence ne l'est pas. */
export function smokeGate(input: { direction: string; scrollDepth: number; reducedMotion: boolean }): number {
  if (input.direction !== "obsidienne") return 0;
  const depth = Math.min(1, Math.max(0, input.scrollDepth));
  return GATE_FLOOR + (1 - GATE_FLOOR) * depth;
}

export type WorldPoint = { x: number; y: number; z: number };

const HOOF_SPEED_MIN = 0.05; // monde/s : sous ce seuil, bruit d'animation
// Calibre a la capture 02/09 : le sabot avant qui gratte (vitesse max
// ~1.7 monde/s, ~8 gouttes/s pendant le geste) : gain bas, sinon un disque
// blanc sous le sabot ; les anneaux fins se lisent tres bien a ce niveau.
const HOOF_DROP_GAIN = 0.04;
const HOOF_DROP_MAX = 0.06;
const HOOF_SPLASH = 0.06;
/** Marge au-dessus du niveau d'eau ou le sabot compte encore comme
 * "dedans" (le bout du sabot est sous l'os de la patte). */
const HOOF_WET_MARGIN = 0.1;

/** Le sabot du cerf qui bouge fait une onde (demande Sylvain 02/09).
 * Amplitude de goutte pour un sabot passe de `prev` a `next` en `dt` :
 * 0 s'il est en l'air ou immobile, proportionnelle a sa vitesse
 * horizontale s'il glisse dans l'eau (plafonnee), eclaboussure s'il
 * traverse le niveau d'eau vers le bas. */
export function hoofDrop(prev: WorldPoint, next: WorldPoint, dt: number, waterLevel: number): number {
  if (dt <= 0) return 0;
  const wet = next.y <= waterLevel + HOOF_WET_MARGIN;
  const entering = prev.y > waterLevel + HOOF_WET_MARGIN && wet;
  if (!wet) return 0;
  const speed = Math.hypot(next.x - prev.x, next.z - prev.z) / dt;
  const glide = speed >= HOOF_SPEED_MIN ? Math.min(HOOF_DROP_MAX, speed * HOOF_DROP_GAIN) : 0;
  return Math.min(HOOF_DROP_MAX, glide + (entering ? HOOF_SPLASH : 0));
}
