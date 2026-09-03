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
  /** Faux si la cible etait hors d'allonge : le membre s'y tend au
   * maximum sans jamais s'hyperextendre ni s'inverser. */
  reachable: boolean;
};

/**
 * Resout le membre pour amener `ankle` sur `target`.
 *
 * @param hip   position monde de la hanche (racine du membre, fixe)
 * @param knee  position monde du genou (articulation intermediaire)
 * @param ankle position monde de la cheville (effecteur)
 * @param target position monde visee pour la cheville
 */
export function twoBoneIK(hip: Vec3, knee: Vec3, ankle: Vec3, target: Vec3): TwoBoneSolution {
  const upper = sub(knee, hip);
  const lower = sub(ankle, knee);
  const lab = length(upper);
  const lcb = length(lower);
  const toAnkle = sub(ankle, hip);
  const toTarget = sub(target, hip);

  const reach = lab + lcb;
  const folded = Math.abs(lab - lcb);
  const wanted = length(toTarget);
  // Distance realisable : ni au-dela de l'allonge (jambe hyperextendue),
  // ni en dessous du repliement maximal (le genou se retournerait).
  const dist = clamp(wanted, folded + EPS, reach - EPS);
  const reachable = wanted <= reach - EPS && wanted >= folded + EPS;

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

  // Visee : amener la direction hanche-cheville sur hanche-cible.
  const aimAngle = angleBetween(toAnkle, toTarget);
  let aimAxis = cross(toAnkle, toTarget);
  if (length(aimAxis) < 1e-6) aimAxis = bendAxis;

  return {
    bendAxis: normalize(bendAxis),
    hipBend: hipAngleWanted - hipAngleNow,
    kneeBend: kneeAngleWanted - kneeAngleNow,
    aimAxis: normalize(aimAxis),
    aimAngle,
    reachable,
  };
}
