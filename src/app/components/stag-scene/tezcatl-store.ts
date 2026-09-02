import { DataTexture, FloatType, RGBAFormat, type Texture } from "three";

/**
 * Etat partage des simulations du Nord (02/09). UN SEUL simulateur de
 * fluide (tezcatl-fluid-sim.ts, Navier-Stokes) pilote tout, arbitrage
 * Sylvain "utilise le simulateur de fluide pour tout cela" : la fumee est
 * advectee par son champ de vitesse, la nappe d'eau lit sa pression et sa
 * vitesse pour incliner sa surface, le reflet menteur est deforme par la
 * meme vitesse ("air chaud") et refracte par la meme pression. La souris
 * pousse le fluide, donc tout a la fois. TezcatlSmoke PRODUIT, les autres
 * LISENT dans useFrame : un singleton de scene plutot qu'un contexte React
 * (textures ping-pong qui changent a 60 fps hors du cycle React).
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

/** Demi-cote (monde) du carre couvert par la simulation, centre sur le
 * cerf. 7 : toute la surface visible du sol depuis la camera du site, sans
 * dilapider la grille sur du hors-champ. */
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
