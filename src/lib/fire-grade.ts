/**
 * LA DESATURATION PAR LE FEU (08/09, chantier du Centre).
 *
 * Idee de Sylvain, confirmee par la passe de sources : au Centre, ce n'est
 * pas la distance a la CAMERA qui retire la couleur, c'est la distance au
 * FOYER. Le sens tombe juste : la couleur est le tonalli que le feu donne.
 * Le rite du nouveau-ne le dit en toutes lettres — on pose l'enfant quatre
 * jours pres du feu pour rechauffer son tonalli — et c'est le meme foyer
 * qui accueille le visiteur a l'arrivee (cf lib/foyer).
 *
 * Techniquement c'est depth-fade.ts avec une autre origine : le meme
 * melange vers le gris de luminance, mesure depuis un point du monde passe
 * en espace camera plutot que depuis la camera elle-meme. Aucune varying en
 * plus, aucun cout par fragment, un seul uniform mis a jour par image.
 *
 * Trois conditions, posees a la conception et verifiees par les tests :
 *  1. au Centre elle REMPLACE la desaturation par la camera au lieu de s'y
 *     ajouter, sinon les deux degrades se battent (d'ou blendGrade, un
 *     fondu et non une somme) ;
 *  2. le melange se plafonne (`cap`), sinon la peripherie vire au gris
 *     complet et se lit comme un bug plutot que comme une intention ;
 *  3. le cerf reste exclu : il se tient pres du feu et garde sa couleur.
 *     Rien a faire pour ca, la desaturation ne s'applique deja qu'au decor
 *     (EnvironmentDepthFade), jamais au sujet.
 *
 * Partie pure : les valeurs servent a initialiser les uniforms, et les
 * fonctions fixent le contrat que le GLSL de depth-fade.ts applique.
 */

export type FireGradeOptions = {
  /** Rayon autour du foyer ou la couleur est intacte (unites monde). */
  near: number;
  /** Distance au-dela de laquelle la desaturation est a son maximum. */
  far: number;
  /** Desaturation maximale. JAMAIS 1 : cf condition 2. */
  cap: number;
};

export const FIRE_GRADE: FireGradeOptions = {
  /** Le disque de la Piedra fait 3 u de rayon : il reste entierement
   *  colore, c'est le sol du foyer. Les braseros sont a 3,35. */
  near: 3,
  /** Au-dela, on est dans l'herbe puis les montagnes : le feu n'y porte
   *  plus. Regle a l'oeil, comme le reste du rig. */
  far: 16,
  /** 0,85 : il reste toujours un souffle de couleur au bord du monde. */
  cap: 0.85,
};

function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Meme courbe que le `smoothstep` du GLSL, pour que le test porte sur la
 *  vraie forme et pas sur une approximation. */
function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge1 === edge0) return x < edge0 ? 0 : 1;
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/**
 * Combien de couleur le feu a retiree a `distance` du foyer (0 = intacte,
 * `cap` = aussi gris que le monde ira).
 */
export function fireDesaturation(distance: number, o: FireGradeOptions = FIRE_GRADE): number {
  return smoothstep(o.near, o.far, distance) * o.cap;
}

/**
 * Le fondu entre les deux desaturations. C'est un MELANGE, jamais une
 * somme : a `fireBlend` = 1 (au Centre) la desaturation par le feu remplace
 * entierement celle par la camera. Le GLSL fait le meme `mix`.
 */
export function blendGrade(cameraGrade: number, fireGrade: number, fireBlend: number): number {
  const b = clamp01(fireBlend);
  return cameraGrade + (fireGrade - cameraGrade) * b;
}
