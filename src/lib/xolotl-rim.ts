/**
 * Xolotl et la margelle du bassin (03/09, retour Sylvain "l'entree et la
 * sortie sont catastrophiques, le chien traverse toute la margelle, il n'y
 * a pas d'impact physique"). Il ne traverse plus la pierre : elle est un
 * RELIEF sur lequel ses pattes se posent, et l'eau reagit quand il entre
 * dans le bassin et quand il en sort (eclaboussure).
 *
 * Pur et testable, le composant ne fait que lire.
 */

export type RimSpec = {
  /** Rayon interieur de la pierre (bord de l'eau). */
  inner: number;
  /** Rayon exterieur de la pierre. */
  outer: number;
  /** Hauteur monde du dessus de la margelle. */
  top: number;
};

/** Largeur du chanfrein aux deux aretes de la pierre. Une marche est un
 * ECHELON, mais un echelon parfait rend la hauteur d'appui discontinue :
 * le corps, qui en est deduit, sursauterait d'une frame a l'autre. Un
 * chanfrein court garde l'arete franche tout en restant derivable. */
const RIM_EDGE = 0.08;

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Hauteur de la SURFACE MARCHABLE a la distance `radius` du centre : le
 * sol partout, le dessus de la pierre au-dessus de la margelle (03/09).
 *
 * Remplace l'ancien `rimHop`, qui soulevait le corps en arc au-dessus de
 * la pierre. Cet arc etait une invention : il eloignait le corps de ses
 * appuis et mettait le sol hors de portee des pattes. Ici on ne decrit
 * que le relief reel, et la pose du corps s'en deduit. */
export function rimSurface(radius: number, groundY: number, rim: RimSpec): number {
  const onStone = Math.min(
    smoothstep(rim.inner - RIM_EDGE, rim.inner + RIM_EDGE, radius),
    1 - smoothstep(rim.outer - RIM_EDGE, rim.outer + RIM_EDGE, radius)
  );
  return groundY + Math.max(0, rim.top - groundY) * onStone;
}

/** Franchissement du bord de l'eau entre deux frames. */
export function rimCrossing(prevRadius: number, radius: number, rim: RimSpec): "enter" | "exit" | null {
  const wasIn = prevRadius < rim.inner;
  const isIn = radius < rim.inner;
  if (!wasIn && isIn) return "enter";
  if (wasIn && !isIn) return "exit";
  return null;
}

/** Largeur (u) de part et d'autre de la pierre ou le chien ralentit. */
export const RIM_SLOW_BAND = 0.45;
/** Vitesse au coeur de la bande, en fraction de la vitesse de traverse. */
export const RIM_SLOW_FACTOR = 0.68;

/** Le ralenti au bord (13/09, X9 de l'audit) : a la vitesse de traverse,
 * l'enjambement de la margelle se lisait comme un glissement. Facteur de
 * vitesse selon la distance au centre : 1 loin de la pierre, RIM_SLOW_FACTOR
 * dessus, et une pente douce (smoothstep) sur RIM_SLOW_BAND de chaque cote. */
export function rimSlowdown(radius: number, rim: RimSpec): number {
  const d = radius < rim.inner ? rim.inner - radius : radius > rim.outer ? radius - rim.outer : 0;
  const t = smoothstep(0, RIM_SLOW_BAND, d);
  return RIM_SLOW_FACTOR + (1 - RIM_SLOW_FACTOR) * t;
}

/**
 * La traverse ralentie (13/09, X9). Le chien avance d'un bout a l'autre
 * d'une droite (x de `startX` a `endX`, a la profondeur `z`) en un temps
 * fixe ; sa vitesse suit `rimSlowdown` le long du chemin. On integre une
 * fois la duree de chaque tranche (plus lent = plus long) et on renvoie la
 * fonction temps normalise -> x, par interpolation inverse. Le temps
 * total ne change pas : les fondus d'entree et de sortie restent caleds.
 */
export function makeRimWarp(startX: number, endX: number, z: number, rim: RimSpec, samples = 256): (t: number) => number {
  const cum = new Float64Array(samples + 1);
  for (let i = 1; i <= samples; i++) {
    const x = startX + ((endX - startX) * (i - 0.5)) / samples;
    cum[i] = cum[i - 1] + 1 / rimSlowdown(Math.hypot(x, z), rim);
  }
  const total = cum[samples];
  return (t: number) => {
    const target = Math.min(1, Math.max(0, t)) * total;
    let lo = 0;
    let hi = samples;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] < target) lo = mid;
      else hi = mid;
    }
    const span = cum[hi] - cum[lo] || 1;
    const k = (lo + (target - cum[lo]) / span) / samples;
    return startX + (endX - startX) * k;
  };
}
