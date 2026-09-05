import { DoubleSide, type Color, type Matrix4, type Texture, type Vector3 } from "three";
import { MeshBasicNodeMaterial } from "three/webgpu";
import { Fn, float, vec2, vec3, vec4, uniform, dot, max, pow, length, clamp, step, normalize, smoothstep, positionWorld, cameraPosition } from "three/tsl";
import { boundFloat, boundTexture, boundVec3, boundRgb } from "./tsl-bind";
import { ZERO_TEXTURE } from "../tezcatl-store";

/**
 * La nappe d'eau du puits (tezcatl-water.tsx) en TSL (05/09, migration
 * WebGPU) : normale reconstruite du champ de hauteur, fresnel, speculaire
 * de la top light, rive, reflet de braise de Xolotl et reflet planaire
 * projectif deforme par les ondes. Memes uniformes que le ShaderMaterial.
 */

export type TezcatlWaterUniforms = {
  uHeight: { value: Texture | null };
  uTexel: { value: number };
  uOpacity: { value: number };
  uColor: { value: Color };
  uSpec: { value: Color };
  uRim: { value: Color };
  uLightDir: { value: Vector3 };
  uNormalGain: { value: number };
  uEmberPos: { value: Vector3 };
  uEmberStrength: { value: number };
  uEmberColor: { value: Color };
  uReflection: { value: Texture | null };
  uTextureMatrix: { value: Matrix4 };
  uReflStrength: { value: number };
  uReflRefract: { value: number };
};

export function createTezcatlWaterNodeMaterial(u: TezcatlWaterUniforms, extent: number, radius: number): MeshBasicNodeMaterial & { uniforms: TezcatlWaterUniforms } {
  const mat = new MeshBasicNodeMaterial() as MeshBasicNodeMaterial & { uniforms: TezcatlWaterUniforms };
  const height = boundTexture(u.uHeight, ZERO_TEXTURE);
  const reflection = boundTexture(u.uReflection, ZERO_TEXTURE);
  const uTexel = boundFloat(u.uTexel);
  const uOpacity = boundFloat(u.uOpacity);
  const uColor = boundRgb(u.uColor);
  const uSpec = boundRgb(u.uSpec);
  const uRim = boundRgb(u.uRim);
  const uLightDir = boundVec3(u.uLightDir);
  const uNormalGain = boundFloat(u.uNormalGain);
  const uEmberPos = boundVec3(u.uEmberPos);
  const uEmberStrength = boundFloat(u.uEmberStrength);
  const uEmberColor = boundRgb(u.uEmberColor);
  const uTextureMatrix = uniform(u.uTextureMatrix.value);
  const uReflStrength = boundFloat(u.uReflStrength);
  const uReflRefract = boundFloat(u.uReflRefract);

  const shading = Fn(() => {
    const uv = positionWorld.xz.div(2 * extent).add(0.5);
    const hL = height.sample(uv.sub(vec2(uTexel, 0))).x;
    const hR = height.sample(uv.add(vec2(uTexel, 0))).x;
    const hB = height.sample(uv.sub(vec2(0, uTexel))).x;
    const hT = height.sample(uv.add(vec2(0, uTexel))).x;
    const n = normalize(vec3(hR.sub(hL).mul(uNormalGain).negate(), 1, hT.sub(hB).mul(uNormalGain).negate()));
    const view = normalize(cameraPosition.sub(positionWorld));
    const fresnel = pow(float(1).sub(max(dot(n, view), 0)), 3);
    const h = normalize(uLightDir.add(view));
    const spec = pow(max(dot(n, h), 0), 90);
    // Les cretes accrochent un peu de lumiere diffuse.
    const slope = clamp(float(1).sub(n.y).mul(4), 0, 1);
    const d = length(positionWorld.xz).div(radius);
    // Bassin net : coupe franche contre la margelle, bande de rive plus claire.
    const mask = float(1).sub(smoothstep(0.985, 1, d));
    const shore = smoothstep(0.9, 0.985, d);
    // Reflet de la braise de Xolotl : speculaire chaud deforme par les ondes.
    const toEmber = uEmberPos.sub(positionWorld);
    const emberDist = length(toEmber);
    const hEmber = normalize(normalize(toEmber).add(view));
    const emberSpec = pow(max(dot(n, hEmber), 0), 40).mul(uEmberStrength).div(emberDist.mul(emberDist).mul(0.15).add(1));
    const emberGlow = uEmberStrength.mul(0.35).div(emberDist.mul(emberDist).mul(0.6).add(1));
    const col = uColor.add(uRim.mul(fresnel).mul(0.35)).add(uSpec.mul(spec.mul(0.5).add(slope.mul(0.18)))).add(uRim.mul(shore).mul(0.55)).add(uEmberColor.mul(emberSpec.add(emberGlow))).toVar();
    const a = uOpacity.add(fresnel.mul(0.15)).add(spec.mul(0.3)).add(slope.mul(0.15)).add(shore.mul(0.35)).add(emberSpec.mul(0.8)).add(emberGlow.mul(0.6)).mul(mask).toVar();
    // Reflet planaire : echantillonnage projectif decale par la pente des
    // ondes. Couleur premultipliee ; nul quand uReflStrength = 0.
    const reflUv4 = uTextureMatrix.mul(vec4(positionWorld, 1));
    const ruv = reflUv4.xy.div(reflUv4.w).add(vec2(hR.sub(hL), hT.sub(hB)).mul(uReflRefract));
    const inside = step(0, ruv.x).mul(step(ruv.x, 1)).mul(step(0, ruv.y)).mul(step(ruv.y, 1));
    const refl = reflection.sample(ruv).mul(inside).mul(uReflStrength);
    col.addAssign(refl.rgb);
    a.addAssign(refl.a.mul(0.9));
    return vec4(col, clamp(a, 0, 0.9));
  })();

  mat.colorNode = shading.rgb;
  mat.opacityNode = shading.a;
  mat.transparent = true;
  mat.depthWrite = false;
  mat.side = DoubleSide;
  mat.fog = false;
  mat.uniforms = u;
  return mat;
}
