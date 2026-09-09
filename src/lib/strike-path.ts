import { STRIKE_SEQ } from "./strike-sequence";

/**
 * LA TRAJECTOIRE DE LA FRAPPE, en trois temps (09/09).
 *
 * Ce qu'elle remplace : une seule courbe de Bezier quadratique, du point ou
 * le serpent errait jusqu'au ciel, en passant par le point d'impact a la
 * moitie du parametre. Le parametre avancant uniformement, le seul moment
 * qui compte etait traverse au plus vite. Film image par image du 09/09,
 * retours de Sylvain confirmes par la mesure :
 *
 *  - « trop court » : depart a 33 unites du centre, avales en 0,6 s, soit
 *    55 unites par seconde pour un cerf de 2 unites. A t+0,32 il n'est pas
 *    au cadre ; a t+0,48 il en remplit la moitie, deja au-dessus de
 *    l'anneau.
 *  - « il devrait presque se poser au sol » : l'impact etait pose a
 *    y = 0,55 sur une courbe symetrique. Il RASAIT a l'horizontale sans
 *    jamais approcher la pierre.
 *
 * Desormais : il PLONGE de loin et vite, il RASE le sol en touchant
 * l'anneau au passage -- dans le SENS de l'anneau, comme une meche qu'on
 * allume -- puis il REPART vers le ciel.
 *
 * Pourquoi le rasement ne suit pas le cercle grave : a l'echelle 2,4 le
 * corps du serpent est plus long que le rayon de l'anneau (2,67 unites).
 * Lui faire suivre le cercle le ferait pivoter sur place au lieu d'avancer.
 * Le rasement est donc un arc de rayon BEAUCOUP plus large, tangent a
 * l'anneau a l'instant du contact : le cap file dans le sens du cercle, la
 * course s'incurve, et le corps traverse la scene au ras du sol.
 *
 * Raccords en HERMITE cubique avec vitesses appariees aux deux jonctions :
 * sans cette continuite, le corps se retourne d'un coup a l'entree ou a la
 * sortie du rasement, ce qui se verrait plus que le defaut d'origine.
 */

export type Pt = { x: number; y: number; z: number };
export type StrikePhase = "plongee" | "rasement" | "remontee";

export const STRIKE_PATH = {
  /** Instant du contact. Une seule source de verite avec le feu, la raideur
   * et la secousse, qui vivent dans strike-sequence. */
  hitAt: STRIKE_SEQ.hitAt,
  /** Duree du rasement, centree sur le contact. */
  skim: 0.95,
  /** Duree totale de la charge. */
  total: 4.4,
  /** Le point grave qu'il embrase, sur l'anneau (y ignore : il rase). */
  hit: { x: 2.6, y: 0, z: 0.6 },
  /**
   * Hauteur du corps pendant le rasement. Le modele fait environ 0,6 unite
   * d'epaisseur a l'echelle 2,4 : a 0,32 il effleure la pierre sans s'y
   * enfoncer.
   */
  groundY: 0.32,
  /** Rayon de l'arc de rasement : large, pour traverser au lieu de pivoter. */
  skimRadius: 9,
  /**
   * Vitesse au sol pendant le rasement, en unites par seconde. 10,5 -> 7
   * apres avoir allonge la plongee : a 10,5 le rapport plongee/rasement
   * tombait a 1,58, et le rasement ne se lisait plus comme un TEMPS. A 7,
   * le corps parcourt environ une fois et demie sa propre longueur en
   * rasant, l oeil suit, et la plongee reste deux fois plus rapide.
   */
  skimSpeed: 7,
  /** Ou il repart. */
  climb: { x: -6, y: 6.5, z: -9 },
  /** Vivacite du depart de la plongee (1 = vitesse de corde). */
  diveBoost: 1.5,
  /** Vivacite de la sortie vers le ciel. */
  climbBoost: 1.2,
} as const;

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

type Hermite = { p0: Pt; m0: Pt; p1: Pt; m1: Pt };

function hermite(h: Hermite, s: number): { pos: Pt; dds: Pt } {
  const s2 = s * s, s3 = s2 * s;
  const a = 2 * s3 - 3 * s2 + 1, b = s3 - 2 * s2 + s, c = -2 * s3 + 3 * s2, d = s3 - s2;
  const da = 6 * s2 - 6 * s, db = 3 * s2 - 4 * s + 1, dc = -6 * s2 + 6 * s, dd = 3 * s2 - 2 * s;
  return {
    pos: {
      x: a * h.p0.x + b * h.m0.x + c * h.p1.x + d * h.m1.x,
      y: a * h.p0.y + b * h.m0.y + c * h.p1.y + d * h.m1.y,
      z: a * h.p0.z + b * h.m0.z + c * h.p1.z + d * h.m1.z,
    },
    dds: {
      x: da * h.p0.x + db * h.m0.x + dc * h.p1.x + dd * h.m1.x,
      y: da * h.p0.y + db * h.m0.y + dc * h.p1.y + dd * h.m1.y,
      z: da * h.p0.z + db * h.m0.z + dc * h.p1.z + dd * h.m1.z,
    },
  };
}

/** Geometrie du rasement, deduite du point d'impact et du point de depart. */
function arcRasement(from: Pt) {
  const s = STRIKE_PATH;
  const rRing = Math.hypot(s.hit.x, s.hit.z) || 1;
  // Tangente de l'anneau au point grave, dans le sens antihoraire.
  const tccw = { x: -s.hit.z / rRing, z: s.hit.x / rRing };
  // Sens de parcours : celui qui prolonge l'arrivee, pour qu'il ne fasse
  // pas demi-tour au contact.
  const vers = { x: s.hit.x - from.x, z: s.hit.z - from.z };
  const proj = tccw.x * vers.x + tccw.z * vers.z;
  const sens = proj < 0 ? -1 : 1;
  // Centre de l'arc : du cote du centre de la pierre, pour que la course
  // s'incurve AU-DESSUS du disque et non vers le dehors.
  const k = 1 - s.skimRadius / rRing;
  const cx = s.hit.x * k, cz = s.hit.z * k;
  const thetaHit = Math.atan2(s.hit.z - cz, s.hit.x - cx);
  const omega = s.skimSpeed / s.skimRadius;
  const at = (t: number) => {
    const theta = thetaHit + sens * omega * (t - s.hitAt);
    return {
      pos: { x: cx + s.skimRadius * Math.cos(theta), y: s.groundY, z: cz + s.skimRadius * Math.sin(theta) },
      // Vitesse physique le long de l'arc (unites par seconde).
      vel: { x: -Math.sin(theta) * s.skimSpeed * sens, y: 0, z: Math.cos(theta) * s.skimSpeed * sens },
    };
  };
  return at;
}

/**
 * Position et tangente du serpent a l'instant `t` de la charge, parti de
 * `from`. La tangente est une VITESSE (unites par seconde) : son sens sert
 * a orienter le corps, sa norme n'est jamais nulle.
 */
export function strikePathAt(t: number, from: Pt): { pos: Pt; tan: Pt; phase: StrikePhase } {
  const s = STRIKE_PATH;
  const tc = clamp(t, 0, s.total);
  const t0 = s.hitAt - s.skim / 2;
  const t1 = s.hitAt + s.skim / 2;
  const arc = arcRasement(from);

  if (tc >= t0 && tc <= t1) {
    const e = arc(tc);
    return { pos: e.pos, tan: e.vel, phase: "rasement" };
  }

  if (tc < t0) {
    const debut = arc(t0);
    const T = Math.max(1e-3, t0);
    const dx = debut.pos.x - from.x, dy = debut.pos.y - from.y, dz = debut.pos.z - from.z;
    const corde = Math.hypot(dx, dy, dz);
    // Depart degenere (il errait deja au-dessus de l'anneau) : on prend la
    // vitesse du rasement plutot qu'une tangente nulle, qui donnerait un
    // quaternion NaN et un squelette entier perdu.
    const m0 = corde < 0.5
      ? { x: debut.vel.x * T, y: debut.vel.y * T, z: debut.vel.z * T }
      : { x: (dx / corde) * corde * s.diveBoost, y: (dy / corde) * corde * s.diveBoost, z: (dz / corde) * corde * s.diveBoost };
    const h: Hermite = {
      p0: from,
      m0,
      p1: debut.pos,
      m1: { x: debut.vel.x * T, y: debut.vel.y * T, z: debut.vel.z * T },
    };
    const { pos, dds } = hermite(h, tc / T);
    const tan = { x: dds.x / T, y: dds.y / T, z: dds.z / T };
    // Garde-fou : une plongee vive peut passer sous le sol juste avant la
    // jonction. On la pose au sol plutot que de la laisser traverser.
    if (pos.y < s.groundY) {
      pos.y = s.groundY;
      tan.y = Math.max(0, tan.y);
    }
    return { pos, tan, phase: "plongee" };
  }

  const fin = arc(t1);
  const T = Math.max(1e-3, s.total - t1);
  const dx = s.climb.x - fin.pos.x, dy = s.climb.y - fin.pos.y, dz = s.climb.z - fin.pos.z;
  const corde = Math.hypot(dx, dy, dz) || 1;
  const h: Hermite = {
    p0: fin.pos,
    m0: { x: fin.vel.x * T, y: fin.vel.y * T, z: fin.vel.z * T },
    p1: s.climb,
    m1: { x: (dx / corde) * corde * s.climbBoost, y: (dy / corde) * corde * s.climbBoost, z: (dz / corde) * corde * s.climbBoost },
  };
  const { pos, dds } = hermite(h, (tc - t1) / T);
  const tan = { x: dds.x / T, y: dds.y / T, z: dds.z / T };
  if (pos.y < s.groundY) {
    pos.y = s.groundY;
    tan.y = Math.max(0, tan.y);
  }
  return { pos, tan, phase: "remontee" };
}
