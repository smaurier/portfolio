// Relief du sol — retour de Sylvain le 18/08 : "la ligne d'horizon reste
// plate, est-ce qu'on ne pourrait pas faire un sol un peu sculpté plutôt ?"
// Fonction pure, testable — le rendu (déplacement des sommets d'un
// PlaneGeometry) se construit à partir de cette fonction dans ground.tsx,
// même principe que camera-path.ts/reveal-arc.ts.
//
// **Retouche même soirée** : les montagnes (génériques + Popocatépetl/
// Iztaccíhuatl, ex-mountains.tsx en meshes séparés) sont maintenant des
// bosses ajoutées à ce même champ de hauteur — retour de Sylvain : "les
// montagnes autour doivent être faites avec le sol sculpté, popo et izta
// inclus". Plus de meshes flottants posés sur le sol : un seul terrain
// continu, garanti raccordé à sa base (même mesh).

import { generateMountainRangePlacements } from "./mountain-range";

/** Rayon autour du centre où le sol reste parfaitement plat — le cerf, le
 * maïs et les lianes sont tous ancrés à y=0 sans connaître ce relief,
 * sculpter sous leurs pieds les ferait flotter ou s'enfoncer. */
const FLAT_RADIUS = 4;
/** Au-delà de ce rayon, l'ondulation de dunes est à pleine amplitude —
 * entre FLAT_RADIUS et ce rayon, une transition progressive. Les bosses de
 * montagne (bien plus loin) ne sont pas concernées par cette transition,
 * seul le bruit de dunes proche l'est. */
const BLEND_RADIUS = 9;
/** Amplitude maximale de l'ondulation de dunes, en unités de scène. */
const DUNE_AMPLITUDE = 1.6;

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function getDuneHeight(x: number, z: number): number {
  const distance = Math.sqrt(x * x + z * z);
  const blend = smoothstep(FLAT_RADIUS, BLEND_RADIUS, distance);

  const noise =
    Math.sin(x * 0.15 + z * 0.11) * 0.5 +
    Math.sin(x * 0.37 - z * 0.29 + 1.7) * 0.2 +
    Math.sin(x * 0.08 + z * 0.21 + 4.1) * 0.3;

  return noise * DUNE_AMPLITUDE * blend;
}

type PeakBump = { x: number; z: number; height: number; radius: number };

/** Bosse radiale lisse (compacte, nulle au-delà de radius, C1 aux bords) —
 * plusieurs bosses qui se chevauchent fusionnent naturellement en une
 * crête continue dans un champ de hauteur, contrairement à des meshes
 * séparés qui se touchaient avec une jointure visible (ex-mountains.tsx). */
function bumpHeight(x: number, z: number, bump: PeakBump): number {
  const dx = x - bump.x;
  const dz = z - bump.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  if (dist >= bump.radius) return 0;
  const t = dist / bump.radius;
  const falloff = (1 - t * t) ** 2;
  return bump.height * falloff;
}

// Rotation Y (convention three.js) — utilitaire local, pas de dépendance
// three.js dans ce fichier (garde terrain-height.ts pur/testable).
function rotateY(x: number, z: number, angle: number): { x: number; z: number } {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: x * cos + z * sin, z: -x * sin + z * cos };
}

// Chaîne générique, tout autour, à distance non homogène (cf
// mountain-range.ts) — calculée une seule fois au chargement du module
// (déterministe, pas de dépendance à x/z), pas à chaque appel de
// getTerrainHeight qui tourne par sommet du maillage.
const GENERIC_PEAK_COUNT = 16;
const GENERIC_BUMPS: PeakBump[] = generateMountainRangePlacements(GENERIC_PEAK_COUNT).map((p) => ({
  x: p.radius * Math.sin(p.azimuth),
  z: p.radius * Math.cos(p.azimuth),
  height: 3.2 * p.heightScale,
  radius: 3.5 * p.widthScale,
}));

function getGenericRangeHeight(x: number, z: number): number {
  let height = 0;
  for (const bump of GENERIC_BUMPS) {
    height = Math.max(height, bumpHeight(x, z, bump));
  }
  return height;
}

// Popocatépetl + Iztaccíhuatl — une seule fois, à l'azimuth exactement
// opposé à la caméra au climax du face-à-face (climaxProgress=0.75, cf
// camera-path.ts) : "on doit voir le Popo et l'Izta seulement lorsqu'on
// regarde de face l'animal" (retour Sylvain). Repris tel quel de
// l'ex-mountains.tsx, reformulé en bosses plutôt qu'en silhouette 2D
// extrudée (chaque bosse correspond à un point haut du profil dessiné à la
// main avant ce refactor : sommet/épaulements du volcan, tête/poitrine/
// genoux/pieds de la princesse).
const NAMED_AZIMUTH = 0.75 * Math.PI * 2 + Math.PI;
const NAMED_RADIUS = 16;
const NAMED_ROTATION = NAMED_AZIMUTH + Math.PI;
const NAMED_CENTER_X = NAMED_RADIUS * Math.sin(NAMED_AZIMUTH);
const NAMED_CENTER_Z = NAMED_RADIUS * Math.cos(NAMED_AZIMUTH);

const POPO_OFFSET = { x: -6.5, z: 0 };
const POPO_BUMPS: PeakBump[] = [
  { x: 0, z: 0, height: 5.6, radius: 3.2 }, // sommet
  { x: -1.8, z: 0.4, height: 3.2, radius: 2.3 }, // épaulement gauche
  { x: 1.5, z: -0.3, height: 3, radius: 2 }, // bord du cratère
];

const IZTA_OFFSET = { x: 5, z: 0 };
const IZTA_BUMPS: PeakBump[] = [
  { x: -6.5, z: 0.2, height: 2.4, radius: 2 }, // pieds
  { x: -3.6, z: 0.3, height: 4, radius: 2.4 }, // poitrine, point culminant
  { x: -0.6, z: -0.2, height: 3.5, radius: 2.1 }, // tête
  { x: 2.2, z: 0.1, height: 1.8, radius: 1.8 }, // genoux
];

function getNamedMountainsHeight(x: number, z: number): number {
  const dx = x - NAMED_CENTER_X;
  const dz = z - NAMED_CENTER_Z;
  const local = rotateY(dx, dz, -NAMED_ROTATION);

  let height = 0;
  for (const bump of POPO_BUMPS) {
    height = Math.max(height, bumpHeight(local.x - POPO_OFFSET.x, local.z - POPO_OFFSET.z, bump));
  }
  for (const bump of IZTA_BUMPS) {
    height = Math.max(height, bumpHeight(local.x - IZTA_OFFSET.x, local.z - IZTA_OFFSET.z, bump));
  }
  return height;
}

/**
 * Hauteur du sol en un point (x,z) — dunes proches (bruit multi-fréquence
 * déterministe, gentil) + chaîne générique + Popo/Izta, tous additionnés :
 * les deux couches de montagnes vivent à des rayons bien plus grands que
 * les dunes (16-30 contre 4-9), se chevauchent rarement, l'addition reste
 * sûre.
 */
export function getTerrainHeight(x: number, z: number): number {
  return getDuneHeight(x, z) + getGenericRangeHeight(x, z) + getNamedMountainsHeight(x, z);
}

export { BLEND_RADIUS, FLAT_RADIUS };
