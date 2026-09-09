/**
 * L'ARC DU SUD (09/09) : la nuit de Coatepec, puis midi.
 *
 * Arbitrage de Sylvain du 08/09, apres que la mesure a montre le Sud a 5/10,
 * la plus faible des quatre directions vivantes : « l'arrivee du Sud garde la
 * nuit de Coatepec puis monte vers midi ».
 *
 * LE MYTHE, verifie. Coatlicue est enceinte d'une boule de plumes de colibri.
 * Coyolxauhqui et les quatre cents Huitznahua, les etoiles du ciel austral,
 * montent a Coatepec pour la tuer. Huitzilopochtli nait ARME, decapite sa
 * soeur, qui devient la lune, et disperse les quatre cents. C'est l'allegorie
 * du lever du soleil : le soleil tue la lune et chasse les etoiles.
 * <https://en.wikipedia.org/wiki/Centzonhu%C4%ABtzn%C4%81hua>
 *
 * LE PIEGE DE COHERENCE, et c'est ce que cette lib existe pour tenir :
 * Coatepec est un lever de soleil, or l'Est en est deja un, et **deux scenes
 * sur cinq ne peuvent pas etre une aurore**. La distinction qui nous sauve :
 *  - l'Est est l'aurore comme LIEU et comme HEURE. Tlahuizcalpan, la maison
 *    de l'aube, Venus avant le soleil, un soleil rasant qui teinte tout. Ce
 *    qui s'y passe, c'est la lumiere qui ARRIVE.
 *  - le Sud est l'aurore comme BATAILLE. Le soleil est deja ne et arme ; ce
 *    qui s'y passe, c'est la nuit qui est VAINCUE, la lune decapitee et les
 *    etoiles jetees du haut de la montagne.
 *
 * Consequence tenue par un test : le soleil du Sud **ne s'attarde pas aux
 * elevations basses**. Il ne monte pas doucement comme a l'Est, il surgit
 * deja haut, parce qu'il nait arme. C'est pour cela que la bande d'horizon
 * (`uDusk` dans sud-sky) n'est pas cablee pour turquoise : ce n'est pas un
 * oubli a corriger, c'est le bon choix.
 */

export const SUD_ARC = {
  /** La bande d'elevations « aube » que le soleil doit traverser vite. */
  dawnBand: [0.05, 0.45] as const,
  /** La bataille : de la montee a Coatepec a la dispersion des quatre cents. */
  battleStart: 0.28,
  battleEnd: 0.52,
  /** Progres de reveal-arc en tete (la nuit) et en bas de page (midi). */
  lightNight: 0.18,
  lightNoon: 1,
} as const;

export type SouthArc = {
  /** Hauteur du soleil, 0 la nuit .. 1 le zenith. */
  day: number;
  /** L'inverse utile : 1 la nuit .. 0 a midi (la lune, les etoiles). */
  night: number;
  /** 0 avant la bataille, 1 apres : la lune tombe, les quatre cents sont jetees. */
  battle: number;
  /** Le progres a donner aux courbes de reveal-arc (ambiante, directionnelle). */
  lightP: number;
};

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function smooth(u: number): number {
  const c = clamp01(u);
  return c * c * (3 - 2 * c);
}

/** Rampe lisse de `a` a `b` sur [start, end]. */
function ramp(p: number, start: number, end: number): number {
  if (end <= start) return p >= end ? 1 : 0;
  return smooth((p - start) / (end - start));
}

export function remapSouthArc(progress: number): SouthArc {
  const p = clamp01(progress);
  const battle = ramp(p, SUD_ARC.battleStart, SUD_ARC.battleEnd);

  // Le soleil : rien tant que Huitzilopochtli n'est pas ne, puis il SURGIT
  // pendant la bataille, en franchissant la bande d'aube d'un trait, et
  // finit sa montee jusqu'au zenith. Trois segments, pas une courbe douce :
  // c'est un coup, pas un lever progressif.
  const born = SUD_ARC.battleStart + (SUD_ARC.battleEnd - SUD_ARC.battleStart) * 0.35;
  const armed = born + (SUD_ARC.battleEnd - born) * 0.45;
  let day: number;
  if (p <= born) {
    // Avant la naissance : la nuit, a peine une lueur derriere la montagne.
    day = 0.02 * ramp(p, 0, born);
  } else if (p <= armed) {
    // Il nait arme : la traversee de la bande d'aube, franche et courte.
    day = 0.02 + (SUD_ARC.dawnBand[1] + 0.08 - 0.02) * ramp(p, born, armed);
  } else {
    // Puis la montee tranquille jusqu'au zenith.
    day = SUD_ARC.dawnBand[1] + 0.08 + (1 - (SUD_ARC.dawnBand[1] + 0.08)) * ramp(p, armed, 1);
  }
  day = clamp01(day);

  return {
    day,
    night: clamp01(1 - day),
    battle,
    lightP: clamp01(SUD_ARC.lightNight + (SUD_ARC.lightNoon - SUD_ARC.lightNight) * smooth(day)),
  };
}
