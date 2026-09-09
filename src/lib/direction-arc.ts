/**
 * Arc de reveal inverse pour le Nord (01/09, arbitrage Sylvain :
 * option A + arrivee). Sur la home et les autres pages, scroller =
 * le monde s'eveille (reveal-arc.ts). Au Mictlan c'est un contresens :
 * scroller = DESCENDRE les niveaux (axe systemique 3 du Codex), la
 * lumiere doit baisser, jamais s'eveiller.
 *
 * Mais la traversee du Mictlan SE TERMINE : le Chicunamictlan, le lieu
 * du repos ou l'ame arrive. En toute fin de scroll, un "moment
 * d'arrivee" violet distinct (retour Sylvain : "l'avoir quand meme en
 * toute fin, de facon differente") : ce n'est pas le monde qui
 * s'eveille, c'est la lueur du puits qui s'intensifie et accueille :
 * arrivalGlow pilote ce boost dans RevealLighting.
 */

const DESCENT_START = 0.06;
const DESCENT_END = 0.8;
/** Depart de la descente : le Nord commence ECLAIRE (02/09, retour
 * Sylvain "on a l'arc inverse, mais justement cela signifie qu'il doit y
 * avoir plus de lumiere au depart"). Avant, le haut de page reprenait la
 * penombre de la home et l'arc descendait d'un noir vers un noir. */
const TOP_LIGHT = 0.6; // 0.85 delavait le cerf en gris sous la top light (capture 02/09)
/** Plancher de la descente : plus sombre que le haut de page, mais
 * LISIBLE. 0.04 -> 0.32 (02/09, retour Sylvain "la scene est globalement
 * sous-exposee, meme si c'est le Mictlan on peut baisser l'exposition mais
 * pas autant, on ne voit rien"). */
const DEPTH_FLOOR = 0.32;
const ARRIVAL_START = 0.82;
/** La lumiere remonte a l'arrivee, mais reste loin de l'eveil complet. */
const ARRIVAL_LIFT = 0.28;

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function remapNorthArc(progress: number): { lightP: number; arrivalGlow: number } {
  const p = Math.min(1, Math.max(0, progress));
  // Descente : de la lumiere du depart vers le plancher sombre.
  const descent = smoothstep(DESCENT_START, DESCENT_END, p);
  let lightP = TOP_LIGHT * (1 - descent) + DEPTH_FLOOR * descent;
  // Arrivee : remontee douce portee par le glow.
  const arrivalGlow = smoothstep(ARRIVAL_START, 1, p);
  lightP += arrivalGlow * ARRIVAL_LIFT;
  return { lightP: Math.min(1, Math.max(0, lightP)), arrivalGlow };
}

/**
 * LE HUITIEME NIVEAU (09/09) : *Izmictlan Apochcalolca*, les eaux noires ou
 * le mort est depouille de la derniere chose qui le retenait a la chair.
 *
 * Pourquoi ce niveau precisement, releve par le siege mythologie du panel :
 * la scene du Nord finissait sur Xolotl qui aide a traverser le PREMIER
 * fleuve, Chiconahuapan, c'est-a-dire l'etape 1 sur 9, utilisee a contresens
 * comme climax. La descente d'une page EST les neuf niveaux ; sa fin doit
 * donc etre une etape de fin.
 * <https://www.mexicolore.co.uk/aztecs/underworld/the-sinister-road-the-nine-levels-of-mictlan-10>
 *
 * Le geste, avec l'outil qu'on a deja : le tezcatl « ne reflete pas, il
 * revele ou il ment ». A cet endroit seulement, il PREND. La derniere
 * couleur chaude du reflet du cerf reste dans l'eau noire au lieu de
 * remonter avec lui.
 *
 * ⚠️ VOCABULAIRE, a ne pas casser en ecrivant au Codex : c'est **teyolia**
 * qui se depouille ici, ce qui voyage vers Mictlan et nomme la page Memoire.
 * Ce n'est PAS *tonalli*, la chaleur recue a la naissance, qui appartient au
 * Centre. Une source de reference confond les deux ; notre Codex, non.
 */
export const IZMICTLAN = {
  /**
   * Profondeur de page ou le depouillement commence. Mesure du 09/09 : avec
   * un debut a 0,76, la chaleur n'atteignait son plein qu'une fois le pied
   * de page arrive a l'ecran, donc le geste ne se voyait pas. La fenetre
   * couvre desormais le dernier TIERS de la descente, ce qui reste l'etage
   * des derniers niveaux, et le depouillement se lit avant le bas.
   */
  start: 0.62,
  /** ... et ou il est acquis : la chaleur est restee dans l'eau. */
  end: 0.92,
};

/** 0 avant le huitieme niveau, 1 quand la chaleur est restee dans l'eau. */
export function strippedWarmth(depth: number, spec = IZMICTLAN): number {
  if (!Number.isFinite(depth)) return 0;
  const t = (depth - spec.start) / (spec.end - spec.start);
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  return c * c * (3 - 2 * c);
}
