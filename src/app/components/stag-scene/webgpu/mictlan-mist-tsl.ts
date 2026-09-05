import { DoubleSide, type Color, type Texture } from "three";
import { MeshBasicNodeMaterial } from "three/webgpu";
import { Fn, float, vec3, abs, max, length, mix, smoothstep, positionWorld } from "three/tsl";
import { boundColor, boundFloat, boundTexture } from "./tsl-bind";
import { ZERO_TEXTURE } from "../tezcatl-store";

/**
 * La brume du Mictlan (mictlan-mist.tsx) en TSL (05/09, migration WebGPU) :
 * une nappe qui lit l'encre du fluide en espace sol, centre net autour du
 * cerf, bords fondus. Une couche = un materiau (uLayer).
 */

export type MictlanMistUniforms = {
  uDye: { value: Texture | null };
  uOpacity: { value: number };
  uLayer: { value: number };
  uColor: { value: Color };
  uShadow: { value: Color };
};

export function createMictlanMistNodeMaterial(u: MictlanMistUniforms, extent: number, clearRadius: number): MeshBasicNodeMaterial & { uniforms: MictlanMistUniforms } {
  const mat = new MeshBasicNodeMaterial() as MeshBasicNodeMaterial & { uniforms: MictlanMistUniforms };
  const dye = boundTexture(u.uDye, ZERO_TEXTURE);
  const uOpacity = boundFloat(u.uOpacity);
  const uLayer = boundFloat(u.uLayer);
  const c = boundColor(u.uColor);
  const s = boundColor(u.uShadow);
  const uColor = vec3(c.r, c.g, c.b);
  const uShadow = vec3(s.r, s.g, s.b);

  const dens = dye.sample(positionWorld.xz.div(2 * extent).add(0.5)).r;
  mat.colorNode = mix(uShadow, uColor, smoothstep(0.1, 0.9, dens));
  mat.opacityNode = Fn(() => {
    const body = smoothstep(0.02, 0.7, dens);
    const r = length(positionWorld.xz);
    // Centre net (le cerf), nappe qui monte vers les bords.
    const ring = smoothstep(clearRadius, clearRadius + 1.6, r);
    const edge = float(1).sub(smoothstep(0.86, 0.99, max(abs(positionWorld.x), abs(positionWorld.z)).div(extent)));
    return uOpacity.mul(uLayer).mul(body).mul(ring).mul(edge);
  })();
  mat.transparent = true;
  mat.depthWrite = false;
  mat.side = DoubleSide;
  mat.fog = false;
  mat.uniforms = u;
  return mat;
}
