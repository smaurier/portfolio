/**
 * L'assiette d'un quadrupede DEDUITE de ses appuis (03/09, retour Sylvain :
 * "lorsque Xolotl descend la margelle, les pattes avant doivent toucher le
 * sol, comme lorsqu'il la monte, les pattes arriere doivent encore
 * toucher").
 *
 * Pourquoi il faut un basculement, et pourquoi celui-ci n'a rien a voir
 * avec celui qui a ete retire ce matin : un chien a cheval sur une marche
 * a ses appuis avant et arriere a des hauteurs differentes. Si le corps
 * reste horizontal, une des deux paires doit s'etirer de toute la hauteur
 * de la marche, ce qui depasse l'allonge d'un membre : la patte decolle.
 * En inclinant le corps de l'angle de la marche, chaque paire retrouve
 * une extension normale et les quatre pattes touchent.
 *
 * Le basculement n'est donc pas un effet ajoute : c'est la condition
 * geometrique pour que les pattes puissent atteindre le sol. Il se DEDUIT
 * des appuis, il ne se regle pas.
 *
 * Pur et testable : le composant echantillonne le sol et pose le resultat.
 */

export type Stance = {
  /** Hauteur du corps : la moyenne des deux appuis. */
  y: number;
  /** Assiette en radians, positif = museau haut (il grimpe). */
  pitch: number;
};

/**
 * @param frontSupport hauteur du sol sous les appuis avant
 * @param rearSupport  hauteur du sol sous les appuis arriere
 * @param wheelbase    distance entre appui avant et appui arriere
 * @param maxPitch     garde-fou : au-dela, la marche est trop haute pour
 *                     ce corps et on prefere une patte qui s'etire a un
 *                     chien a la verticale.
 */
export function bodyFromFeet(
  frontSupport: number,
  rearSupport: number,
  wheelbase: number,
  maxPitch = 0.5
): Stance {
  const rise = frontSupport - rearSupport;
  const angle = rise === 0 || wheelbase <= 0 ? 0 : Math.atan2(rise, wheelbase);
  return {
    y: (frontSupport + rearSupport) / 2,
    pitch: Math.max(-maxPitch, Math.min(maxPitch, angle)),
  };
}

/**
 * Le ROULIS, deduit des appuis lateraux (03/09, suite : quand une seule
 * patte arriere est sur la pierre, l'autre demande plus que son allonge).
 * Meme raisonnement que l'assiette, applique a l'autre axe : si les deux
 * cotes n'ont pas le meme appui, un corps qui reste a plat oblige un cote
 * a s'etirer de toute la difference ; en s'inclinant de l'angle du devers,
 * chaque cote n'en prend que la moitie.
 *
 * Le resultat est directement l'angle a appliquer AUTOUR DE L'AXE DE
 * MARCHE avec la convention de three.js : une rotation positive autour de
 * +X abaisse le cote +Z et remonte le cote -Z. Le signe est donc porte
 * ici, teste, et non laisse au composant.
 */
export function rollFromFeet(
  supportPlusZ: number,
  supportMinusZ: number,
  track: number,
  maxRoll = 0.4
): number {
  const devers = supportPlusZ - supportMinusZ;
  if (devers === 0 || track <= 0) return 0;
  // Signe negatif : pour REMONTER le cote +Z, il faut tourner negativement.
  const angle = -Math.atan2(devers, track);
  return Math.max(-maxRoll, Math.min(maxRoll, angle));
}

export type SupportPoint = { x: number; z: number; y: number };

export type PlaneStance = Stance & {
  /** Roulis a appliquer autour de l'axe de marche (convention three.js,
   * la meme que `rollFromFeet`). */
  roll: number;
  /** Faux si les appuis ne definissent pas un plan (alignes) : on est
   * alors retombe sur la moyenne, sans inclinaison. */
  planar: boolean;
};

/**
 * Le PLAN DES APPUIS (04/09, dernier cran du franchissement) : la hauteur
 * et les deux pentes du plan qui passe au mieux, au sens des moindres
 * carres, par les quatre coussinets. Remplace le couple assiette + roulis
 * calcule par paires (avant/arriere, gauche/droite) : ce couple ne savait
 * pas lire une configuration en DIAGONALE (une seule patte avant sur la
 * pierre, l'autre au sol), mesuree a 4.6 cm d'ecart residuel. Un plan
 * ajuste sur les quatre points la lit naturellement : il s'incline dans
 * les deux axes a la fois, comme un chien qui reporte son poids en
 * diagonale.
 *
 * y = a.x + b.z + c, resolu par les equations normales (3x3). Assiette
 * = atan(a) (positif = museau haut, la marche etant le long de +X),
 * roulis = -atan(b) (meme signe que `rollFromFeet`). Le plan est evalue
 * au centre du corps pour la hauteur.
 */
export function fitSupportPlane(
  points: SupportPoint[],
  centerX: number,
  centerZ: number,
  maxPitch = 0.6,
  maxRoll = 0.35
): PlaneStance {
  const n = points.length;
  const mean = n > 0 ? points.reduce((s, p) => s + p.y, 0) / n : 0;
  if (n < 3) return { y: mean, pitch: 0, roll: 0, planar: false };
  // Coordonnees centrees sur le corps : mieux conditionne, et c = hauteur au centre.
  let sxx = 0, sxz = 0, szz = 0, sx = 0, sz = 0, sxy = 0, szy = 0, sy = 0;
  for (const p of points) {
    const dx = p.x - centerX;
    const dz = p.z - centerZ;
    sxx += dx * dx; sxz += dx * dz; szz += dz * dz; sx += dx; sz += dz;
    sxy += dx * p.y; szy += dz * p.y; sy += p.y;
  }
  // Systeme normal : [sxx sxz sx; sxz szz sz; sx sz n] . [a b c] = [sxy szy sy]
  const det =
    sxx * (szz * n - sz * sz) - sxz * (sxz * n - sz * sx) + sx * (sxz * sz - szz * sx);
  if (!Number.isFinite(det) || Math.abs(det) < 1e-9) return { y: mean, pitch: 0, roll: 0, planar: false };
  const inv = 1 / det;
  const a = inv * (sxy * (szz * n - sz * sz) - sxz * (szy * n - sz * sy) + sx * (szy * sz - szz * sy));
  const b = inv * (sxx * (szy * n - sz * sy) - sxy * (sxz * n - sz * sx) + sx * (sxz * sy - szy * sx));
  const c = inv * (sxx * (szz * sy - sz * szy) - sxz * (sxz * sy - sx * szy) + sxy * (sxz * sz - szz * sx));
  return {
    y: c,
    pitch: Math.max(-maxPitch, Math.min(maxPitch, Math.atan(a))),
    roll: Math.max(-maxRoll, Math.min(maxRoll, -Math.atan(b))),
    planar: true,
  };
}
