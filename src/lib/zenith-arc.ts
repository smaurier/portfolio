/**
 * L'ARC VERTICAL DU CENTRE (E1, 10/09).
 *
 * Le Centre est la seule page sans geste a elle : les quatre autres ont la
 * glace qui eclate, la frappe du serpent, la descente des porteuses, le
 * miroir. Ce qui lui revient n'est pas un evenement de plus, c'est son
 * axe : au Centre on ne va nulle part, on regarde en haut. La camera garde
 * son orbite et son 3/4 de repos, et son REGARD remonte l'axe du monde,
 * la ou monte la fumee du foyer.
 *
 * L'ECUEIL, nomme dans le plan pour ne pas le redecouvrir : camera.up
 * n'est jamais touche dans tout le projet. Viser la verticale fait
 * degenerer lookAt (la direction du regard devient colineaire a up) et se
 * lit comme un roulis brutal dans les derniers degres. Le depot a deja
 * pris cette licence ailleurs, le faisceau de l'Est plafonne a 62 degres.
 * Ici on plafonne a 78, jamais 90, et c'est un test qui le tient.
 *
 * La forme : l'elevation part de celle du repos -- negative, la camera est
 * a 2 u de haut et vise 1 u -- et monte jusqu'au plafond sur le dernier
 * cinquieme du defilement. Elle PART de l'elevation reelle et non de zero :
 * c'est ce qui garantit qu'aucun saut ne se voit au demarrage de l'arc.
 */

/** Debut de l'arc, en progression de defilement. Apres le climax (0,75) et
 *  la derive finale qui pose le 3/4 : on se pose, PUIS on leve les yeux. */
export const ZENITH_START = 0.8;

/** Plafond d'elevation, en degres. Garde contre la degenerescence de
 *  lookAt, pas un reglage esthetique. */
export const ZENITH_MAX_DEG = 78;

/** Rayon en deca duquel l'elevation n'a plus de sens (la camera est sur
 *  l'axe qu'elle vise). */
const RAYON_MIN = 0.05;

/** Debut de la montee de la colonne de fumee. AVANT le regard : quand
 *  l'oeil se leve, il doit avoir quelque chose a suivre, pas une colonne
 *  qui naitrait en meme temps que lui. */
export const COLUMN_START = 0.68;

function ease(t: number): number {
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  return c * c * (3 - 2 * c);
}

/**
 * L'elevation du regard, en radians, pour une progression donnee.
 * `radius` : distance horizontale de la camera a l'axe du monde.
 * `cameraY` : hauteur de la camera. `restY` : la cible de repos.
 */
/** La part du zenith dans le regard, 0 avant ZENITH_START, 1 au bas de la
 *  page, adoucie. Le post-traitement la lit aussi (11/09) : au zenith, le
 *  flou de profondeur doit s'eteindre, sinon la Voie lactee, a l'infini et
 *  hors du champ net, devient un semis de taches (retour Sylvain, capture
 *  du bas de l'accueil). */
export function zenithBlend(progress: number): number {
  return ease((progress - ZENITH_START) / (1 - ZENITH_START));
}

export function zenithElevation(progress: number, radius: number, cameraY: number, restY: number): number {
  const r = Math.max(RAYON_MIN, radius);
  const base = Math.atan2(restY - cameraY, r);
  const max = (ZENITH_MAX_DEG * Math.PI) / 180;
  return base + (max - base) * zenithBlend(progress);
}

/**
 * La hauteur a viser sur l'axe du monde pour tenir cette elevation. C'est
 * elle qu'on donne a lookAt : le regard glisse le long de l'axe, la ou se
 * trouvent la colonne de fumee et, au bout, le ciel.
 */
export function zenithTargetY(progress: number, radius: number, cameraY: number, restY: number): number {
  if (radius < RAYON_MIN) return restY;
  return cameraY + radius * Math.tan(zenithElevation(progress, radius, cameraY, restY));
}

/** La montee de la colonne, 0 avant son debut, 1 en fin d'arc. */
export function columnRise(progress: number): number {
  return ease((progress - COLUMN_START) / (1 - COLUMN_START));
}
