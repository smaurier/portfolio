import { AdditiveBlending, BackSide, type Color } from "three";
import { MeshBasicNodeMaterial } from "three/webgpu";
import { Fn, float, vec3, dot, abs, pow, normalize, normalView, positionView } from "three/tsl";
import { boundColor, boundFloat } from "./tsl-bind";

/**
 * Le halo du cerf en TSL (05/09, migration WebGPU) : sphere englobante en
 * face arriere, fresnel tres large (puissance 4), additif, dont l'opacite
 * respire avec `uIntensity`. Memes uniformes que stag-aura.tsx.
 */

export type StagAuraUniforms = { uColor: { value: Color }; uIntensity: { value: number } };

export function createStagAuraNodeMaterial(u: StagAuraUniforms): MeshBasicNodeMaterial & { uniforms: StagAuraUniforms } {
  const mat = new MeshBasicNodeMaterial() as MeshBasicNodeMaterial & { uniforms: StagAuraUniforms };
  const c = boundColor(u.uColor);
  const uIntensity = boundFloat(u.uIntensity);
  // abs(dot) : la normale d'une face arriere pointe vers l'interieur ; le
  // fresnel « silhouette » doit etre symetrique quel que soit le cote rendu.
  const alpha = Fn(() => {
    const fres = pow(float(1).sub(abs(dot(normalize(normalView), normalize(positionView.negate())))), 4);
    return fres.mul(uIntensity).mul(0.9);
  })();
  mat.colorNode = vec3(c.r, c.g, c.b).mul(alpha);
  mat.opacityNode = alpha;
  mat.transparent = true;
  mat.depthWrite = false;
  mat.blending = AdditiveBlending;
  mat.side = BackSide;
  mat.fog = false;
  mat.uniforms = u;
  return mat;
}
