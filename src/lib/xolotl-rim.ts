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
