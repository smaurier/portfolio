import { DataTexture, FloatType, RGBAFormat, type Texture } from "three";

/**
 * Etat partage de la nappe d'eau du Nord (02/09). TezcatlWater fait
 * tourner le simulateur de fluide (tezcatl-fluid-sim.ts, Navier-Stokes,
 * arbitrage Sylvain "l'eau est geree par le simulateur de fluide") et
 * publie ici ses champs ; le reflet menteur (StagMirror) les LIT pour se
 * refracter sous la surface. Un singleton de scene plutot qu'un contexte
 * React : textures ping-pong qui changent a 60 fps hors du cycle React,
 * tout le monde les lit dans useFrame.
 *
 * Historique : la scene a d'abord eu une fumee sur le meme simulateur,
 * retiree le 02/09 ("enleve la fumee, ne met qu'une nappe d'eau").
 * lib/tezcatl-fluid.ts garde les emetteurs (testes), debranches.
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

export const tezcatlStore: {
  /** Champ de vitesse du fluide (xy, unites de grille/s). */
  velocity: Texture;
  /** Champ de pression du fluide (x) : ses fronts dessinent la surface. */
  pressure: Texture;
  /** 1/resolution de la grille vitesse/pression (pour les gradients). */
  texel: number;
} = {
  velocity: ZERO_TEXTURE,
  pressure: ZERO_TEXTURE,
  texel: 1,
};
