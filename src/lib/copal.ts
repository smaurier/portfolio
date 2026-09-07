/**
 * Le COPAL (07/09, Sylvain : les lianes fleuries sont retirees, « j'aimerais
 * bien quelque chose qui reagit au scroll a la place et qui fonctionne
 * narrativement »). Des braseros au bord de la Piedra ; la fumee de copalli,
 * la resine brulee dans tous les rites mesoamericains, monte plus haut a
 * mesure qu'on descend la page : l'offrande monte avec le jour. Teintee par
 * direction. A l'Est, les feux sont ETEINTS sous le gel et se rallument au
 * degel (le dard rallume le feu, cf project_nahual_da : la piste du Feu
 * Nouveau). Partie pure.
 */

export const COPAL = {
  /** Nombre de braseros. */
  count: 5,
  /** Rayon (u) : juste au-dela du disque de la Piedra (3 u). */
  radius: 3.35,
  /** Azimut du premier brasero (deg) : aucun dans l'axe d'arrivee de la
   * camera (azimut 0), sinon un brasero masque le cerf a l'ouverture. */
  firstAzimuthDeg: 40,
  /** Bouffees de fumee par brasero. */
  puffs: 7,
  /** Duree de vie d'une bouffee (s). */
  puffLife: 4.5,
  /** Hauteur atteinte a pleine offrande (u). */
  riseHeight: 2.6,
  /** Derive laterale en montant (u). */
  drift: 0.5,
};

export type Brazier = { x: number; z: number };

export function brazierPositions(c = COPAL): Brazier[] {
  return Array.from({ length: c.count }, (_, i) => {
    // Repartis sur le cercle, en partant hors de l'axe de la camera.
    const a = ((c.firstAzimuthDeg + (i * 360) / c.count) * Math.PI) / 180;
    return { x: Math.sin(a) * c.radius, z: Math.cos(a) * c.radius };
  });
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** L'offrande : 0,15 au haut de la page, pleine en bas ; eteinte tant que
 * le monde est gele (`frost` : 1 gele, 0 degele). */
export function copalIntensity(progress: number, frost: number, c = COPAL): number {
  void c;
  const rise = 0.15 + 0.85 * clamp01(progress);
  return rise * (1 - clamp01(frost));
}

function hash(i: number): number {
  const v = Math.sin(i * 12.9898 + 4.1) * 43758.5453;
  return v - Math.floor(v);
}

export type Puff = { x: number; y: number; z: number; size: number; opacity: number };

/** Une bouffee : `age` en secondes depuis son emission, `intensity` la force
 * de l'offrande. Elle monte, derive toujours du meme cote (sa graine),
 * grossit et s'efface. */
export function puffPose(index: number, age: number, intensity: number, c = COPAL): Puff {
  const k = age / c.puffLife;
  if (k >= 1 || k < 0) return { x: 0, y: 0, z: 0, size: 0, opacity: 0 };
  const seed = hash(index);
  const seed2 = hash(index * 7 + 1);
  const a = seed * Math.PI * 2;
  const spread = c.drift * k * (0.5 + seed2);
  return {
    x: Math.cos(a) * spread,
    y: c.riseHeight * intensity * k * (0.7 + 0.6 * seed2),
    z: Math.sin(a) * spread,
    size: 0.18 + 0.55 * k * (0.7 + 0.6 * seed),
    // Elle apparait vite, tient, puis s'efface.
    opacity: intensity * Math.min(1, k * 6) * (1 - k) ** 1.6,
  };
}
