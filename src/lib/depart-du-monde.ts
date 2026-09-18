/**
 * UN MONDE RENTRE SOUS LA TERRE (18/09).
 *
 * Arbitrage de Sylvain : le monde qui part s'enfonce, celui qui arrive en
 * sort. L'etat de l'art et les sources sont dans `docs/da/depart-vertical.md`
 * -- le geste est atteste et c'est celui du soleil lui-meme : Tlaltecuhtli
 * « avale le soleil entre ses machoires au crepuscule et le rend a l'aube »
 * (Sahagun, Codex de Florence VI). Notre arc EST le voyage du soleil, donc
 * un monde qui descend quand on le quitte ne fait pas un geste de plus, il
 * fait celui-la.
 *
 * CE N'EST PLUS UNE CORRECTION DE DEFAUT. Les sauts de luminance du passage
 * sont traites depuis le 17/09 (le givre qui rattrapait le temps perdu, les
 * booleens de route). Ici on veut VOIR un monde partir, au lieu de cesser de
 * le voir -- la difference que `dispersion-etat-de-l-art.md` nomme en
 * section 0 : « une pierre qui rapetisse jusqu'a zero ne part pas, elle est
 * supprimee ».
 *
 * POURQUOI LE VERTICAL. Le sol fait le masque : ni brume a regler direction
 * par direction, ni transparence, ni tri de transparents, ni shader. C'est
 * la famille F, la seule dont le tableau des couts dise « rien ».
 */

/** Meme seuil que `approachFog` et `arc-fondu` : sans lui, l'approche
 *  exponentielle n'atteint jamais sa cible, et le monde ne serait jamais
 *  tout a fait pose ni tout a fait parti. */
const SNAP_EPSILON = 0.01;

export const DEPART = {
  /**
   * De combien un monde absent est enfonce, en unites monde. Assez pour que
   * le plus haut du decor cardinal passe sous le sol, pas plus : un monde
   * qui plonge trop loin met trop longtemps a revenir, et l'arrivee doit
   * rester immediate. A regler a l'oeil, c'est le genre de valeur qu'aucune
   * mesure ne donne.
   */
  profondeur: 14,
};

/**
 * Un pas de presence. `cible` vaut 1 quand la direction est celle de la
 * route et que ses nuanceurs sont chauds, 0 sinon ; `alpha` a 1 pose la
 * cible tout de suite (mouvement reduit, convention du site).
 */
export function avancerPresenceMonde(courante: number, cible: number, alpha: number): number {
  const suivante = courante + (cible - courante) * Math.min(1, Math.max(0, alpha));
  if (Math.abs(cible - suivante) < SNAP_EPSILON) return cible;
  return Math.min(1, Math.max(0, suivante));
}

/** Adoucit les deux bouts : un monde ne demarre pas a pleine vitesse, et il
 *  ne se pose pas en heurtant. */
function adoucir(t: number): number {
  const u = Math.min(1, Math.max(0, t));
  return u * u * (3 - 2 * u);
}

/**
 * De combien le monde est encore sous la terre, en unites monde, a ecrire
 * dans la position du groupe racine de la direction.
 */
export function enfoncementMonde(presence: number, d = DEPART): number {
  return (1 - adoucir(presence)) * d.profondeur;
}

/**
 * Un monde entierement sous la terre n'est pas dessine du tout : c'est ce
 * qui garde le gain du gel du decor dormant (17/09) au lieu de payer un
 * sous-arbre cache sous le sol.
 */
export function mondeSeDessine(presence: number): boolean {
  return presence > 0.001;
}
