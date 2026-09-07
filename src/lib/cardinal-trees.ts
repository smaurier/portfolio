import type { DirectionKey } from "@/app/components/stag-scene/direction-colors";

/**
 * Les quatre arbres cardinaux (07/09). Le Codex Fejervary-Mayer planche 1
 * place un arbre a chaque point et Xiuhtecuhtli, le feu, au centre ; la
 * Library of Congress, qui detient le manuscrit, nomme les essences (cf
 * docs/da/arbres-cardinaux.md). Toutes precolombiennes et mexicaines.
 *
 * Le Centre n'a pas d'arbre : c'est le foyer (et c'est le chantier suivant).
 *
 * Le feuillage pousse avec le scroll, comme la milpa ; a l'Est il attend le
 * degel : l'arbre reste nu sous la glace, le dard le fait feuiller.
 */

export type CardinalTree = {
  /** Nom du GLB : public/models/tree-<species>.glb */
  species: "pseudobombax" | "cacao" | "erythrina" | "ceiba";
  /** Nom nahuatl ou usuel, pour le Codex. */
  nahuatl: string;
  /** Position (monde) : en bordure, loin du cerf, hors du champ d'arrivee. */
  x: number;
  z: number;
  /** Echelle appliquee au modele (les GLB font 4,4 a 6 m). */
  scale: number;
  /** Rotation propre (rad) : deux pages ne montrent pas la meme face. */
  rotation: number;
};

/** Azimut et rayon choisis pour que l'arbre soit dans le champ SANS jamais
 * se planter dans l'axe des deux regards qui comptent : celui d'ouverture
 * (la camera part face a l'azimut 180) et celui d'arrivee en bas de page
 * (135). Il faut donc eviter ces deux azimuts : la zone utile va de 30 a 100
 * et de 220 a 320 degres. Les Cihuateteo tiennent 135 a l'Ouest, le lever de
 * l'Est est a 18 : rien ne se chevauche. Rayon 7 a 8 u : un arbre de
 * bordure, pas un arbre qui domine le cerf (constate le 07/09 : a 5,4 u le
 * cacao se dressait derriere le cerf en plein cadre).
 */
const at = (azimuthDeg: number, radius: number) => ({
  x: Math.sin((azimuthDeg * Math.PI) / 180) * radius,
  z: Math.cos((azimuthDeg * Math.PI) / 180) * radius,
});

export const CARDINAL_TREES: Record<Exclude<DirectionKey, "jade">, CardinalTree> = {
  dore: { species: "pseudobombax", nahuatl: "amapolli", ...at(75, 7.4), scale: 1, rotation: 0.4 },
  turquoise: { species: "cacao", nahuatl: "cacahuacuahuitl", ...at(58, 7), scale: 1.05, rotation: 1.2 },
  cendre: { species: "erythrina", nahuatl: "tzompancuahuitl", ...at(250, 7.6), scale: 1, rotation: 2.1 },
  obsidienne: { species: "ceiba", nahuatl: "pochotl", ...at(288, 8), scale: 0.95, rotation: 3.0 },
};

export function treeFor(direction: DirectionKey): CardinalTree | null {
  return direction === "jade" ? null : CARDINAL_TREES[direction];
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Le feuillage : 0,1 en haut de page, plein en bas ; rien sous le gel. */
export function foliageGrowth(progress: number, frost: number): number {
  const p = clamp01(progress);
  const grown = 0.1 + 0.9 * (p * (2 - p));
  return grown * (1 - clamp01(frost));
}
