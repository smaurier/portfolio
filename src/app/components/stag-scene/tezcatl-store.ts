import { DataTexture, FloatType, RGBAFormat, type Texture } from "three";

/**
 * Etat partage de la nappe d'eau du Nord (02/09). TezcatlWater fait
 * tourner le simulateur d'eau (tezcatl-ripple-sim.ts, equation des ondes)
 * et publie ici son champ de hauteur ; le reflet menteur (StagMirror) le
 * LIT pour se refracter sous les ondes. Un singleton de scene plutot qu'un
 * contexte React : texture ping-pong qui change a 60 fps hors du cycle
 * React, tout le monde la lit dans useFrame.
 *
 * Historique 02/09 : la scene a d'abord eu une fumee puis une eau sur
 * simulateur de fluide (Navier-Stokes, tezcatl-fluid-sim.ts), retirees
 * ("mais c'est de la fumee en bas ? moi je voulais un simulateur d'eau").
 * Le simulateur de fluide et lib/tezcatl-fluid.ts restent dans le repo,
 * testes, debranches.
 *
 * Le placeholder 1x1 a zero evite un sampler nul le temps que la sim
 * monte (un sampler nul rend noir ou log un warning selon les drivers).
 */

function zeroTexture(): DataTexture {
  const tex = new DataTexture(new Float32Array([0, 0, 0, 0]), 1, 1, RGBAFormat, FloatType);
  tex.needsUpdate = true;
  return tex;
}

export const ZERO_TEXTURE = zeroTexture();

/** Demi-cote (monde) du carre couvert par la nappe et sa simulation,
 * centre sur le cerf. 7 : toute la surface visible du sol depuis la camera
 * du site, sans dilapider la grille sur du hors-champ. */
export const TEZCATL_EXTENT = 7;

/** Hauteur de la nappe d'eau. Le cerf fait 2 unites pour ~1,5 m : 0.25
 * unite, c'est a peu pres 20 cm d'eau (demande Sylvain 02/09). */
export const WATER_LEVEL = 0.25;

/** Entaille du cerf par une lame d'obsidienne (02/09, publiee par
 * ObsidianBlades, lue par StagModel qui reagit : recul + eclair froid). */
export type StagHit = { at: number; strength: number; side: 1 | -1 };

export const tezcatlStore: {
  /** Champ de hauteur des ondes (x = hauteur courante). */
  ripple: Texture;
  /** 1/resolution de la grille des ondes (pour les gradients). */
  rippleTexel: number;
  /** Derniere entaille (temps de l'horloge de scene), null au repos. */
  stagHit: StagHit | null;
  /** Impacts a faire onduler dans l'eau (monde x/z), pousses par
   * ObsidianArrows, consommes par TezcatlWater a chaque frame. */
  impacts: { x: number; z: number; amount: number }[];
  /** Xolotl en train de traverser (monde x/z), null sinon. Publie par
   * XolotlCompanion, lu par la couronne de cempasuchil qui converge vers
   * lui quand il est dans le bassin (03/09). */
  xolotl: { x: number; z: number } | null;
  /** La braise de Xolotl (monde) : reflet chaud sur l'eau (03/09). */
  ember: { x: number; y: number; z: number; intensity: number };
} = {
  ripple: ZERO_TEXTURE,
  rippleTexel: 1,
  stagHit: null,
  impacts: [],
  xolotl: null,
  ember: { x: 0, y: 0, z: 0, intensity: 0 },
};
