/**
 * La milpa de l'Est (07/09, Sylvain : « pour les milpa qu'on aura en
 * bordure, on ne les fait pas grandir pendant le gel, ils restent couches et
 * geles, encore petits, ils ne se relevent et grandissent qu'ensuite »).
 *
 * Itztlacoliuhqui, le dieu que le dard change en gel, s'appelle
 * litteralement le gel qui tue les plantes (« tout s'est courbe sous le
 * froid », Andrews 2003, cf docs/da/est-sources.md) : l'Est est le seul
 * endroit du site ou la milpa est morte, et c'est le soleil qui la releve.
 * Ailleurs elle pousse avec le scroll, comme avant.
 *
 * Ici aussi la milpa quitte le centre pour la bordure de la Piedra (a l'Est
 * SEULEMENT : ailleurs les plants du centre habillent le cerf, ce qui etait
 * l'intention de depart).
 */

export const EAST_MILPA = {
  /** Rayon de la bordure (u) : juste au-dela du disque de la Piedra (3 u),
   * la ou se tiennent deja les deux plants de premier plan. */
  ringRadius: 3.25,
  /** Taille sous le gel : elle n'a pas pousse. */
  frozenGrowth: 0.22,
  /** Inclinaison sous le gel (rad) : couchee vers le sol. */
  frozenBend: 1.15,
};

/** Les positions du centre, reportees sur la bordure : meme azimut, rayon
 * de la bordure (on garde la repartition d'origine, on l'ecarte). */
export function milpaRing(positions: [number, number][], c = EAST_MILPA): [number, number][] {
  return positions.map(([x, z]) => {
    const r = Math.hypot(x, z) || 1;
    return [(x / r) * c.ringRadius, (z / r) * c.ringRadius];
  });
}

export type MilpaPose = { growth: number; bend: number };

/** La pose d'un plant, PARTOUT. Un seul chemin de code : hors de l'Est la
 * flexion vaut 0, elle n'est pas « laissee de cote ». La scene 3D persiste
 * d'une page a l'autre (navigation SPA) : une rotation ecrite a l'Est et
 * seulement ignoree ailleurs restait en place, et le mais restait couche sur
 * toutes les pages visitees ensuite (bug trouve le 07/09, signale par
 * Sylvain). Regle : dans une scene persistante, on ECRIT toujours la valeur
 * neutre, on ne se contente jamais de sauter le calcul. */
export function milpaPose(growth: number, frost: number, east: boolean, c = EAST_MILPA): MilpaPose {
  return east ? eastMilpaPose(growth, frost, c) : { growth, bend: 0 };
}

/** La pose d'un plant a l'Est. `growth` : la pousse du scroll (0..1, lib
 * reveal-arc) ; `frost` : le gel du monde (1 gele, 0 degele). Sous le gel
 * la pousse du scroll est ignoree : le plant reste petit et couche ; au
 * degel il se releve et rattrape sa pousse. */
export function eastMilpaPose(growth: number, frost: number, c = EAST_MILPA): MilpaPose {
  const f = frost < 0 ? 0 : frost > 1 ? 1 : frost;
  const thawed = growth < c.frozenGrowth ? c.frozenGrowth : growth;
  return {
    growth: c.frozenGrowth + (thawed - c.frozenGrowth) * (1 - f),
    bend: c.frozenBend * f,
  };
}

/**
 * LA COURBE, ET NON LA PERCHE (18/09).
 *
 * Retour de Sylvain, 07/09 : « je n'aime pas du tout comment il se
 * dedresse, il devrait avoir une vraie courbe en se redressant, pas rester
 * droit comme une perche de sauteur a la perche ».
 *
 * Il avait raison sur le fond ET sur le mot. La flexion etait ecrite
 * `groupRef.rotation.set(...)` : le plant entier pivotait autour de sa base,
 * donc une tige rigide qui bascule. Or le dieu qui gele ce monde s'appelle
 * Itztlacoliuhqui, et son nom dit litteralement que « tout s'est courbe sous
 * le froid » (Andrews 2003, cf docs/da/est-sources.md). Une perche qui
 * s'incline contredit le nom de celui qui l'a couchee.
 *
 * L'ANGLE EST DONC UNE FONCTION DE LA HAUTEUR. A la base, rien : le plant
 * est plante, il ne se deracine pas. Au sommet, toute la flexion. Entre les
 * deux, un carre plutot qu'une droite, pour que la courbure parte de zero :
 * une rampe lineaire ferait un coude au ras du sol, ce qui est un autre
 * defaut, pas une courbe.
 *
 * `t` est la hauteur normalisee du sommet le long de la tige (0 a la base,
 * 1 a la pointe) ; la rotation se fait autour de la base, donc la longueur
 * de la tige est conservee -- elle se courbe, elle ne s'etire pas.
 *
 * ⚠️ CETTE FONCTION EST TRANSCRITE EN GLSL dans `milpa.tsx`
 * (`uCourbe * t * t`), parce qu'un nuanceur ne peut pas appeler du
 * TypeScript. C'est elle qui porte les tests ; les deux se citent pour que
 * personne n'en change une sans l'autre.
 */
export function angleCourbure(t: number, bend: number): number {
  const u = t < 0 ? 0 : t > 1 ? 1 : t;
  return bend * u * u;
}
