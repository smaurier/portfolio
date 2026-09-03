/**
 * Cinematique inverse a deux segments (03/09, piste 1 choisie par
 * Sylvain : "on va tester sur la 1", poser reellement les pattes).
 *
 * C'est la technique standard des jeux pour un quadrupede sur terrain
 * accidente : au lieu de deviner l'attitude du corps, on POSE les pattes
 * sur leur appui reel et le reste suit. Un membre = hanche, genou,
 * cheville, donc deux segments, ce qui se resout en forme fermee par la
 * loi des cosinus : pas de solveur iteratif (le CCDIKSolver de three.js
 * exige des os "cible" ajoutes au squelette, ce qui redimensionne la
 * texture d'os et se paie au rendu).
 *
 * La fonction ne connait ni three.js ni le rig : elle prend trois points
 * et une cible, elle rend deux rotations et leurs axes, exprimes en
 * MONDE. Le composant se charge de les appliquer aux os. Pur, donc
 * testable sans WebGL.
 */

export type Vec3 = { x: number; y: number; z: number };

const EPS = 1e-4;

function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function length(a: Vec3): number {
  return Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function normalize(a: Vec3): Vec3 {
  const l = length(a);
  return l < 1e-9 ? { x: 0, y: 0, z: 0 } : { x: a.x / l, y: a.y / l, z: a.z / l };
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function angleBetween(a: Vec3, b: Vec3): number {
  const la = length(a);
  const lb = length(b);
  if (la < 1e-9 || lb < 1e-9) return 0;
  return Math.acos(clamp(dot(a, b) / (la * lb), -1, 1));
}

/** Butees articulaires (03/09, retour Sylvain : "il serait bon de bloquer
 * les articulations pour eviter certains angles impossibles").
 *
 * Un solveur en forme fermee permet de les exprimer en ANATOMIE plutot
 * qu'en bornes d'Euler par os (ce que propose le CCDIKSolver de three.js,
 * moins lisible et dependant de l'orientation de repos du rig) :
 *
 *  - l'angle interieur du genou est directement borne. Comme la distance
 *    hanche-cheville en decoule par la loi des cosinus, borner l'angle
 *    borne exactement l'allonge : le membre ne peut ni se replier plus
 *    qu'un vrai jarret, ni s'hyperextendre au-dela de la butee ;
 *  - la visee de la hanche est bornee par rapport a la POSE ANIMEE. La
 *    limite ne contraint donc pas l'amplitude de la foulee (qui vient du
 *    clip), seulement l'ecart que la correction peut y ajouter. */
export type LegLimits = {
  /** Angle interieur minimal au genou, en radians : repli maximal. */
  kneeMin: number;
  /** Angle interieur maximal : PI = tendu. En dessous, le membre garde
   * toujours une legere flexion, comme un vrai membre porteur. */
  kneeMax: number;
  /** Ecart de visee maximal par rapport a la pose animee, en radians. */
  maxAim: number;
};

/** Butees d'un membre de canide, calees sur une MESURE du clip de marche
 * du modele (trace instrumentee 03/09 : le genou anime va de 88 a 173
 * degres selon la patte). Les butees encadrent cette plage sans la
 * mordre, sinon la correction se battrait avec l'animation a chaque
 * frame, y compris sur terrain plat :
 *  - 70 degres de repli minimal (l'anime descend a 88) : empeche la
 *    correction de replier la patte dans le corps quand un coussinet
 *    doit se hisser haut sur la pierre ;
 *  - 174 degres d'extension maximale (l'anime monte a 173) : la patte ne
 *    se verrouille jamais tendue et le genou ne peut pas s'inverser. */
export const DOG_LEG_LIMITS: LegLimits = {
  kneeMin: 1.22,
  kneeMax: 3.04,
  maxAim: 0.45,
};

/** Aucune butee : le solveur nu, utile pour tester la geometrie seule. */
export const NO_LEG_LIMITS: LegLimits = { kneeMin: 0, kneeMax: Math.PI, maxAim: Math.PI };

export type TwoBoneSolution = {
  /** Axe de FLEXION (monde, unitaire) : la normale au plan du membre.
   * Les deux rotations de pliage tournent autour de lui, ce qui garantit
   * que le genou plie dans son plan et ne vrille jamais. */
  bendAxis: Vec3;
  /** Rotation a appliquer a la hanche autour de `bendAxis` (radians). */
  hipBend: number;
  /** Rotation a appliquer au genou autour de `bendAxis` (radians). */
  kneeBend: number;
  /** Axe de VISEE (monde, unitaire) : la hanche pivote autour de lui pour
   * pointer la cheville vers la cible. A appliquer apres le pliage. */
  aimAxis: Vec3;
  /** Angle de visee (radians). */
  aimAngle: number;
  /** Faux si une butee a mordu : la cible etait hors d'allonge, ou
   * demandait un repli ou une visee interdits. Le membre va alors aussi
   * loin que ses butees l'autorisent, jamais au-dela. */
  reachable: boolean;
};

/** Distance hanche-cheville pour un angle de genou donne (loi des
 * cosinus). Croissante : borner l'angle borne donc l'allonge. */
function reachAtKneeAngle(lab: number, lcb: number, kneeAngle: number): number {
  return Math.sqrt(Math.max(0, lab * lab + lcb * lcb - 2 * lab * lcb * Math.cos(kneeAngle)));
}

/**
 * Resout le membre pour amener `ankle` sur `target`.
 *
 * @param hip   position monde de la hanche (racine du membre, fixe)
 * @param knee  position monde du genou (articulation intermediaire)
 * @param ankle position monde de la cheville (effecteur)
 * @param target position monde visee pour la cheville
 */
export function twoBoneIK(
  hip: Vec3,
  knee: Vec3,
  ankle: Vec3,
  target: Vec3,
  limits: LegLimits = NO_LEG_LIMITS
): TwoBoneSolution {
  const upper = sub(knee, hip);
  const lower = sub(ankle, knee);
  const lab = length(upper);
  const lcb = length(lower);
  const toAnkle = sub(ankle, hip);
  const toTarget = sub(target, hip);

  const reach = lab + lcb;
  const folded = Math.abs(lab - lcb);
  const wanted = length(toTarget);
  // Allonge autorisee : bornee par la geometrie (jamais d'inversion du
  // genou, jamais d'hyperextension) ET par les butees articulaires.
  const distMin = Math.max(folded + EPS, reachAtKneeAngle(lab, lcb, limits.kneeMin));
  const distMax = Math.max(distMin, Math.min(reach - EPS, reachAtKneeAngle(lab, lcb, limits.kneeMax)));
  const dist = clamp(wanted, distMin, distMax);

  // Angles actuels du triangle hanche-genou-cheville.
  const hipAngleNow = angleBetween(toAnkle, upper);
  const kneeAngleNow = angleBetween(sub(hip, knee), lower);
  // Angles voulus pour que la cheville soit a `dist` de la hanche.
  const hipAngleWanted = Math.acos(clamp((lcb * lcb - lab * lab - dist * dist) / (-2 * lab * dist), -1, 1));
  const kneeAngleWanted = Math.acos(clamp((dist * dist - lab * lab - lcb * lcb) / (-2 * lab * lcb), -1, 1));

  // Normale au plan du membre. Si le membre est parfaitement tendu le
  // plan est indetermine : on prend une normale au segment, n'importe
  // laquelle, le pliage la definira des la premiere frame.
  let bendAxis = cross(toAnkle, upper);
  if (length(bendAxis) < 1e-6) {
    const seed = Math.abs(normalize(upper).y) > 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
    bendAxis = cross(upper, seed);
  }

  // Visee : amener la direction hanche-cheville sur hanche-cible, dans la
  // limite de l'ecart autorise a la pose animee.
  const aimWanted = angleBetween(toAnkle, toTarget);
  const aimAngle = Math.min(aimWanted, limits.maxAim);
  let aimAxis = cross(toAnkle, toTarget);
  if (length(aimAxis) < 1e-6) aimAxis = bendAxis;

  const reachable = wanted >= distMin && wanted <= distMax && aimWanted <= limits.maxAim;

  return {
    bendAxis: normalize(bendAxis),
    hipBend: hipAngleWanted - hipAngleNow,
    kneeBend: kneeAngleWanted - kneeAngleNow,
    aimAxis: normalize(aimAxis),
    aimAngle,
    reachable,
  };
}
