/**
 * MIXCOATL, LE CHEMIN BLANC (E2, 10/09).
 *
 * Au bout de l'arc du Centre, le regard arrive au zenith. Ce qu'il y
 * trouve est la Voie lactee : une arche d'un horizon a l'autre, qui passe
 * juste au-dessus de la tete. Ce n'est pas un evenement mais un ETAT, un
 * ciel qui est la n'importe quelle nuit, accorde a un feu qui ne s'eteint
 * jamais.
 *
 * ATTESTATION, a ne pas gommer : « Mixcoatl » veut dire serpent de nuages,
 * et son association a la Voie lactee est solidement attestee. La lecture
 * « route des ames », elle, ne l'est qu'au niveau secondaire dans nos
 * sources ; tant qu'elle n'est pas confirmee chez Leon-Portilla, elle ne
 * doit pas etre ecrite au Codex comme un fait. Ce module ne dessine qu'un
 * ciel.
 *
 * Partie pure : la geometrie de la bande. Le grand cercle est VERTICAL
 * (son plan contient l'axe du monde), ce qui est la seule facon de le
 * faire passer par le zenith, la ou la camera regarde en fin d'arc. Les
 * etoiles sont dispersees de part et d'autre par un ecart gaussien, plus
 * denses au coeur qu'aux bords : c'est ce qui fait lire une bande et non
 * un semis.
 */

export type MilkyWaySpec = {
  /** Nombre d'etoiles tirees (certaines sont rejetees sous l'horizon). */
  count: number;
  /** Part des tirages qui sont des GRAINS de poussiere : tres larges,
   *  tres faibles. C'est leur recouvrement qui fait le laiteux ; sans eux
   *  on ne voit qu'un semis de points. */
  dustShare: number;
  /** Rayon du ciel (u) : juste en deca du dome. */
  radius: number;
  /** Demi-largeur de la bande (degres) : l'ecart type de la dispersion. */
  spreadDeg: number;
  /** Azimut du plan de l'arche (degres). */
  azimuthDeg: number;
  /** Hauteur minimale gardee, en fraction du rayon : sous l'horizon, les
   *  montagnes cachent tout, autant ne rien poser. */
  minHeight: number;
  /** Graine. */
  seed: number;
};

export const MILKY_WAY: MilkyWaySpec = {
  count: 12000,
  dustShare: 0.02,
  radius: 78,
  spreadDeg: 7,
  azimuthDeg: 24,
  minHeight: 0.06,
  seed: 1519,
};

export type MilkyWayField = {
  /** xyz par etoile. */
  positions: Float32Array;
  /** Taille relative (0..1). */
  sizes: Float32Array;
  /** 1 = grain de poussiere (large et faible), 0 = etoile. */
  dust: Float32Array;
  /** Eclat relatif (0..1). */
  brightness: Float32Array;
  /** Nombre d'etoiles reellement posees. */
  kept: number;
};

function hash(i: number, salt: number): number {
  const v = Math.sin(i * 12.9898 + salt * 78.233 + 4.1) * 43758.5453;
  return v - Math.floor(v);
}

/** Deux gaussiennes independantes a partir de deux uniformes (Box-Muller). */
function gauss(u1: number, u2: number): number {
  const r = Math.sqrt(-2 * Math.log(Math.max(1e-9, u1)));
  return r * Math.cos(2 * Math.PI * u2);
}

export function makeMilkyWay(spec: MilkyWaySpec = MILKY_WAY): MilkyWayField {
  const az = (spec.azimuthDeg * Math.PI) / 180;
  const sigma = (spec.spreadDeg * Math.PI) / 180;
  // Normale du plan : horizontale, donc le plan contient l'axe vertical.
  const nx = Math.cos(az), nz = Math.sin(az);
  // Dans le plan : l'axe du monde, et l'horizontale qui lui est perpendiculaire.
  const vx = -Math.sin(az), vz = Math.cos(az);
  const pos: number[] = [];
  const sizes: number[] = [];
  const bright: number[] = [];
  const dust: number[] = [];
  for (let i = 0; i < spec.count; i++) {
    const theta = hash(i, 1) * Math.PI * 2;
    const ecart = gauss(hash(i, 2), hash(i, 3)) * sigma;
    // Point du grand cercle, puis bascule hors du plan de l'ecart gaussien.
    const cx = vx * Math.sin(theta), cy = Math.cos(theta), cz = vz * Math.sin(theta);
    const s = Math.sin(ecart), c = Math.cos(ecart);
    let x = cx * c + nx * s;
    let y = cy * c;
    let z = cz * c + nz * s;
    const l = Math.sqrt(x * x + y * y + z * z) || 1;
    x /= l;
    y /= l;
    z /= l;
    if (y < spec.minHeight) continue;
    pos.push(x * spec.radius, y * spec.radius, z * spec.radius);
    // La plupart minuscules, quelques-unes franches : une puissance deux
    // donne cette repartition sans table.
    const u = hash(i, 4);
    // Plus brillantes au coeur de la bande qu'a ses bords.
    const coeur = Math.exp(-((ecart / sigma) * (ecart / sigma)) / 2);
    // Les grains ne se tirent qu'au COEUR de la bande : c'est la que la
    // poussiere se voit, jamais sur les bords.
    const grain = hash(i, 6) < spec.dustShare * coeur ? 1 : 0;
    dust.push(grain);
    sizes.push(grain ? 0.45 + 0.55 * hash(i, 7) : u * u);
    bright.push(grain ? 0.02 + 0.02 * hash(i, 5) : 0.25 + 0.75 * coeur * (0.45 + 0.55 * hash(i, 5)));
  }
  return {
    positions: new Float32Array(pos),
    sizes: new Float32Array(sizes),
    brightness: new Float32Array(bright),
    dust: new Float32Array(dust),
    kept: sizes.length,
  };
}
