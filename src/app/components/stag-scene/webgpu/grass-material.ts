import { DoubleSide, type Color, type DataTexture } from "three";
import { Fn, float, vec2, vec3, mix, min, sin, fract, dot, texture, positionLocal, positionGeometry } from "three/tsl";
import { NahualStandardMaterial } from "./nahual-material";
import { boundColor, boundFloat } from "./tsl-bind";

/**
 * La prairie en TSL (05/09, migration WebGPU) : la traduction du patch
 * GLSL de grass.tsx. Chaque brin (instance) lit sa flexion dans la
 * texture de simulation a l'endroit ou il pousse, se courbe en h^2 et se
 * raccourcit un peu ; la couleur va du pied sombre a la pointe claire,
 * teintee par page, avec une pointe de vert au pied au Sud.
 *
 * En TSL, `positionLocal` est deja la position INSTANCIEE (repere du
 * mesh, donc du decor) et `positionGeometry` la position du brin de
 * reference (y = 0..1 = hauteur normalisee) : on n'a pas besoin de lire
 * la matrice d'instance a la main.
 */

export type GrassUniforms = {
  uTime: { value: number };
  uTint: { value: Color };
  uTintMix: { value: number };
  uGreenBase: { value: number };
};

export function createGrassNodeMaterial(bendMap: DataTexture, gridExtent: number, uniforms: GrassUniforms): NahualStandardMaterial {
  const mat = new NahualStandardMaterial();
  mat.color.set("#ffffff");
  mat.side = DoubleSide;
  mat.roughness = 0.92;
  mat.metalness = 0;

  const uTime = boundFloat(uniforms.uTime);
  const uTint = boundColor(uniforms.uTint);
  const uTintMix = boundFloat(uniforms.uTintMix);
  const uGreenBase = boundFloat(uniforms.uGreenBase);
  const bend = texture(bendMap);

  mat.positionNode = Fn(() => {
    const p = positionLocal.toVar();
    const h = positionGeometry.y;
    const hh = h.mul(h);
    // Flexion lue la ou le brin pousse (son propre xz suffit : la cellule
    // fait 0.5 u, le brin 0.03).
    const uv = p.xz.div(gridExtent * 2).add(0.5);
    const flex = bend.sample(uv).xy.mul(2).sub(1);
    const hash = fract(sin(dot(p.xz, vec2(12.9898, 78.233))).mul(43758.5453));
    const flut = sin(uTime.mul(float(2.4).add(hash.mul(2.2))).add(hash.mul(6.2831))).mul(0.035);
    const disp = flex.add(vec2(flut, flut.mul(-0.6)));
    // Hauteur de l'instance : y instancie / y de reference (le pied, h = 0,
    // ne bouge pas : hh = 0).
    const hy = p.y.div(h.max(0.001));
    p.x.addAssign(disp.x.mul(hh).mul(hy).mul(0.9));
    p.z.addAssign(disp.y.mul(hh).mul(hy).mul(0.9));
    p.y.mulAssign(float(1).sub(hh.mul(0.3).mul(min(1, disp.length()))));
    return p;
  })();

  mat.colorNode = Fn(() => {
    const h = positionGeometry.y;
    const tint = vec3(uTint.r, uTint.g, uTint.b);
    const c = vec3(mix(0.45, 1.15, h)).toVar();
    c.assign(mix(c, c.mul(tint), uTintMix));
    c.assign(mix(c, vec3(0.34, 0.48, 0.2), uGreenBase.mul(float(1).sub(h)).mul(0.6)));
    return c;
  })();
  return mat;
}
