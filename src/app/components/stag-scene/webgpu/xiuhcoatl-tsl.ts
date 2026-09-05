import { Color, DoubleSide, type Texture } from "three";
import { MeshBasicNodeMaterial, type Node } from "three/webgpu";
import { Fn, float, vec3, mix, smoothstep, fract, floor, sin, pow, max, positionGeometry, materialColor, materialOpacity } from "three/tsl";
import { NahualPhysicalMaterial } from "./nahual-material";
import { boundFloat } from "./tsl-bind";
import type { XiuhcoatlUniforms } from "../xiuhcoatl-materials";

/**
 * Le xiuhcoatl en TSL (05/09, migration WebGPU) : la mosaique de turquoise
 * polie a joints de braise, et les flammes. Traduction noeud a noeud de
 * xiuhcoatl-materials.ts (meme bruit, meme veines, meme crepitement),
 * sur le meme objet d'uniformes que le companion et l'anneau mutent.
 */

type F = Node<"float">;
type V3 = Node<"vec3">;

const hash3 = Fn(([p]: [V3]) => {
  const q = fract(vec3(p).mul(0.3183099).add(vec3(0.1, 0.2, 0.3))).mul(17).toVar();
  return fract(q.x.mul(q.y).mul(q.z).mul(q.x.add(q.y).add(q.z)));
});

const vnoise = Fn(([p]: [V3]) => {
  const i = floor(p).toVar();
  const f = fract(p).toVar();
  f.assign(f.mul(f).mul(float(3).sub(f.mul(2))));
  const c = (x: number, y: number, z: number) => hash3(i.add(vec3(x, y, z)));
  const x0 = mix(mix(c(0, 0, 0), c(1, 0, 0), f.x), mix(c(0, 1, 0), c(1, 1, 0), f.x), f.y);
  const x1 = mix(mix(c(0, 0, 1), c(1, 0, 1), f.x), mix(c(0, 1, 1), c(1, 1, 1), f.x), f.y);
  return mix(x0, x1, f.z);
});

/** Braise : veines chaudes qui montent lentement, crepitement fin. 0..1. */
const emberGlow = Fn(([local, t]: [V3, F]) => {
  const veins = vnoise(local.mul(5).add(vec3(0, t.mul(-0.5), 0)));
  const crackle = vnoise(local.mul(16).add(vec3(t.mul(0.35), 0, t.mul(-0.2))));
  return smoothstep(0.42, 0.88, veins.mul(0.65).add(crackle.mul(0.35)));
});

const emberColor = Fn(([glow, t, phase, crackle]: [F, F, F, F]) => {
  const slow = sin(t.mul(6).add(phase.mul(25)));
  const fast = sin(t.mul(23).add(phase.mul(61))).mul(sin(t.mul(17).add(phase.mul(37))));
  const flicker = float(0.85).add(slow.mul(0.15)).add(crackle.sub(1).mul(0.12).mul(fast));
  const col = mix(vec3(0.5, 0.09, 0.01), vec3(0.9, 0.38, 0.05), glow).mul(flicker).toVar();
  col.addAssign(vec3(1.0, 0.72, 0.35).mul(pow(glow, 5)).mul(float(0.25).add(crackle.sub(1).mul(0.2))).mul(float(0.7).add(max(0, fast).mul(0.3))));
  return col;
});

/** Mosaique : tesselles cubiques en espace local, joint = distance au bord. */
const mosaic = Fn(([local]: [V3]) => {
  const p = local.mul(13).toVar();
  p.x.addAssign(hash3(vec3(floor(p.y), floor(p.z), 7)).mul(0.7));
  const c = floor(p);
  const f = fract(p);
  const cellId = hash3(c);
  const tint = float(0.78).add(cellId.mul(0.34));
  const e = f.min(float(1).sub(f));
  const edge = e.x.min(e.y).min(e.z);
  const grout = float(1).sub(smoothstep(0.03, 0.09, edge));
  return vec3(tint, grout, cellId);
});

export type TurquoiseOptions = {
  /** Bande annulaire (rayon local min/max) hors de laquelle l'alpha est
   * nul : l'anneau des serpents graves de la Piedra. */
  ringBand?: { inner: number; outer: number };
};

/** Pierre turquoise polie en mosaique, feu dans les joints (physique). */
export function createTurquoiseNodeMaterial(base: Color, sky: Texture | null, uniforms: XiuhcoatlUniforms, options: TurquoiseOptions = {}): NahualPhysicalMaterial {
  const mat = new NahualPhysicalMaterial();
  mat.color = base.clone();
  mat.roughness = 0.3;
  mat.metalness = 0;
  mat.clearcoat = 0.85;
  mat.clearcoatRoughness = 0.2;
  mat.envMapIntensity = 1.1;
  mat.sheen = 0.35;
  mat.sheenRoughness = 0.6;
  mat.sheenColor = new Color("#8fe8e0");
  if (sky) mat.envMap = sky;

  const uTime = boundFloat(uniforms.uTime);
  const uEmber = boundFloat(uniforms.uEmber);
  const uCrackle = boundFloat(uniforms.uCrackle);
  // La couleur de base est lue sur le materiau (materialColor) : les
  // composants la font varier (le glyphe gris qui devient turquoise).
  mat.colorNode = Fn(() => {
    const m = mosaic(positionGeometry);
    return vec3(materialColor).mul(m.x).mul(float(1).sub(m.y.mul(0.7)));
  })();
  mat.emissiveNode = Fn(() => {
    const m = mosaic(positionGeometry);
    const glow = emberGlow(positionGeometry, uTime);
    const ember = emberColor(glow, uTime, glow, uCrackle);
    return ember.mul(uEmber).mul(m.y.mul(0.9).add(glow.mul(0.07)));
  })();
  if (options.ringBand) {
    const { inner, outer } = options.ringBand;
    mat.transparent = true;
    // materialOpacity = opacity du materiau x alphaMap (les traits graves),
    // que le composant continue de piloter ; la bande s'y multiplie.
    mat.opacityNode = Fn(() => {
      const r = positionGeometry.xz.length();
      const band = smoothstep(inner - 0.05, inner + 0.03, r).mul(float(1).sub(smoothstep(outer - 0.02, outer + 0.02, r)));
      return materialOpacity.mul(band);
    })();
  }
  return mat;
}

/** Les flammes : la braise seule, sur les coques de feu du serpent. */
export function createEmberFireNodeMaterial(uniforms: XiuhcoatlUniforms): MeshBasicNodeMaterial {
  const mat = new MeshBasicNodeMaterial();
  mat.transparent = true;
  mat.side = DoubleSide;
  // Comme le ShaderMaterial d'origine : pas de tone mapping (les flammes
  // sont ecrites telles quelles, orange franc, pas jaune lave).
  mat.toneMapped = false;
  const uTime = boundFloat(uniforms.uTime);
  const uEmber = boundFloat(uniforms.uEmber);
  const uCrackle = boundFloat(uniforms.uCrackle);
  const uOpacity = boundFloat(uniforms.uOpacity);
  mat.colorNode = Fn(() => {
    const glow = emberGlow(positionGeometry, uTime);
    return emberColor(glow, uTime, glow, uCrackle).mul(float(0.55).add(uEmber.mul(0.75)));
  })();
  mat.opacityNode = Fn(() => {
    const glow = emberGlow(positionGeometry, uTime);
    return uOpacity.mul(float(0.85).add(glow.mul(0.15)));
  })();
  return mat;
}
