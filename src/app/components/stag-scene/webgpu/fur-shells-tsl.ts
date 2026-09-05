import type { Color } from "three";
import { MeshBasicNodeMaterial } from "three/webgpu";
import { Fn, float, vec3, dot, pow, clamp, normalize, floor, positionLocal, positionGeometry, positionView, normalLocal, normalView, modelScale, Discard } from "three/tsl";
import { boundFloat, boundRgb } from "./tsl-bind";
import { hash3 } from "./tsl-noise";

/**
 * Les coques de poil du cerf noir en TSL (05/09, migration WebGPU). Le
 * squelette est applique par three avant `positionNode` (setupPosition :
 * skinning puis positionNode), donc `positionLocal` et `normalLocal` sont
 * deja skinnes quand on extrude le long de la normale. Le bruit est ancre
 * sur `positionGeometry` (bind pose, stable sur la peau) a l'echelle
 * monde du maillage (`modelScale`), comme le GLSL de fur-shells.tsx.
 */

export type FurShellUniforms = {
  uLayer: { value: number };
  uLength: { value: number };
  uOpacity: { value: number };
  uFreq: { value: number };
  uBase: { value: Color };
  uSheen: { value: Color };
};

export function createFurShellNodeMaterial(u: FurShellUniforms): MeshBasicNodeMaterial & { uniforms: FurShellUniforms } {
  const mat = new MeshBasicNodeMaterial() as MeshBasicNodeMaterial & { uniforms: FurShellUniforms };
  const uLayer = boundFloat(u.uLayer);
  const uLength = boundFloat(u.uLength);
  const uOpacity = boundFloat(u.uOpacity);
  const uFreq = boundFloat(u.uFreq);
  const uBase = boundRgb(u.uBase);
  const uSheen = boundRgb(u.uSheen);
  // Extrusion et bruit en unites monde : le maillage porte une echelle
  // de ~36 dans sa matrice, sinon 5 cm de poil font 2 unites.
  const worldScale = modelScale.x;

  mat.positionNode = Fn(() => positionLocal.add(normalize(normalLocal).mul(uLayer.mul(uLength).div(worldScale))))();

  mat.colorNode = Fn(() => {
    // Un brin par cellule de bruit : la coque n'existe que la ou le brin
    // est plus long que la hauteur de la coque.
    const strand = hash3(floor(positionGeometry.mul(worldScale).mul(uFreq)));
    Discard(strand.lessThan(uLayer));
    const n = normalize(normalView);
    const v = normalize(positionView.negate());
    const fresnel = pow(float(1).sub(clamp(dot(n, v), 0, 1)), 2.2);
    // Velours : pointe plus claire que la base, sheen violet sur les bords.
    return uBase.mul(uLayer.mul(0.8).add(0.6)).add(uSheen.mul(fresnel).mul(uLayer.mul(0.5).add(0.35)));
  })();
  mat.opacityNode = uOpacity.mul(float(1).sub(uLayer.mul(0.75)));
  mat.transparent = true;
  mat.depthWrite = false;
  mat.fog = false;
  mat.uniforms = u;
  return mat;
}
