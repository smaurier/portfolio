import { AdditiveBlending, Color, DoubleSide } from "three";
import { MeshBasicNodeMaterial } from "three/webgpu";
import { Fn, float, vec3, vec4, uv, dot, abs, pow, sin, length, normalize, smoothstep, mix, normalView, positionView, positionLocal, positionWorld, screenCoordinate, screenSize, Discard } from "three/tsl";
import { boundFloat, boundRgb } from "./tsl-bind";
import { vnoise } from "./tsl-noise";

/**
 * Les trois matieres de Xolotl en TSL (05/09, migration WebGPU) : la
 * silhouette fresnel d'obsidienne (le chien et son afterimage), le reflet
 * de braise skinne rendu sur la couche du reflet planaire, et le halo au
 * sol. Memes uniformes que xolotl-companion.tsx.
 */

export type FresnelUniforms = { uPower: { value: number }; uBoost: { value: number }; uOpacity: { value: number }; uTime: { value: number } };
export type EmberMirrorUniforms = { uOpacity: { value: number }; uTime: { value: number } };
export type HaloUniforms = { uColor: { value: Color }; uOpacity: { value: number }; uPulse: { value: number } };

export function createFresnelNodeMaterial(u: FresnelUniforms, color: string): MeshBasicNodeMaterial {
  const mat = new MeshBasicNodeMaterial();
  const uPower = boundFloat(u.uPower);
  const uBoost = boundFloat(u.uBoost);
  const uOpacity = boundFloat(u.uOpacity);
  const uTime = boundFloat(u.uTime);
  const diffuse = boundRgb({ value: new Color(color) });
  const shading = Fn(() => {
    const N = normalize(normalView);
    const V = normalize(positionView.negate());
    const dotNV = abs(dot(N, V));
    const fresnelR = pow(float(1).sub(dotNV), uPower.mul(0.85));
    const fresnelG = pow(float(1).sub(dotNV), uPower);
    const fresnelB = pow(float(1).sub(dotNV), uPower.mul(1.15));
    // Battement lent (0.5 Hz) et balayage fin : la silhouette respire.
    const phase = uTime.mul(0.5 * 6.2831);
    const pulse = smoothstep(-0.2, 0.6, sin(phase)).mul(0.25).add(0.75);
    // gl_FragCoord.y a l'origine en bas ; screenCoordinate en haut.
    const fragY = screenSize.y.sub(screenCoordinate.y);
    const scan = sin(fragY.mul(0.35).sub(uTime.mul(2))).mul(0.25).add(0.75);
    const fresnelMod = fresnelG.mul(pulse).mul(scan);
    Discard(fresnelMod.lessThan(0.22));
    const col = diffuse.mul(fresnelG.mul(uBoost).add(1)).toVar();
    col.r.addAssign(fresnelR.sub(fresnelG).mul(uBoost).mul(0.6));
    col.b.addAssign(fresnelB.sub(fresnelG).mul(uBoost).mul(0.6));
    col.mulAssign(pulse.mul(scan));
    return vec4(col, fresnelMod.mul(uOpacity));
  })();
  mat.colorNode = shading.rgb;
  mat.opacityNode = shading.a;
  mat.transparent = true;
  mat.depthWrite = false;
  mat.fog = false;
  return mat;
}

/** Le reflet de braise : skinne par three avant le fragment ; rien sous
 * la ligne d'eau (`clipY`) ne se reflete. */
export function createEmberMirrorNodeMaterial(u: EmberMirrorUniforms, clipY: number): MeshBasicNodeMaterial {
  const mat = new MeshBasicNodeMaterial();
  const uOpacity = boundFloat(u.uOpacity);
  const uTime = boundFloat(u.uTime);
  const shading = Fn(() => {
    Discard(positionWorld.y.lessThan(clipY));
    // Veines chaudes qui montent dans le corps (espace local : la braise
    // suit la marche), crepitement fin par-dessus.
    const veins = vnoise(positionLocal.mul(5).add(vec3(0, uTime.mul(-0.5), 0)));
    const crackle = vnoise(positionLocal.mul(16).add(vec3(uTime.mul(0.35), 0, uTime.mul(-0.2))));
    const glow = smoothstep(0.42, 0.88, veins.mul(0.65).add(crackle.mul(0.35)));
    const flicker = sin(uTime.mul(6).add(veins.mul(25))).mul(0.15).add(0.85);
    const col = mix(vec3(0.5, 0.09, 0.01), vec3(0.9, 0.38, 0.05), glow).mul(flicker).add(vec3(1, 0.72, 0.35).mul(pow(glow, 5)).mul(0.25));
    const a = uOpacity.mul(glow.mul(0.25).add(0.75));
    return vec4(col, a);
  })();
  mat.colorNode = shading.rgb;
  mat.opacityNode = shading.a;
  mat.transparent = true;
  mat.depthWrite = false;
  mat.side = DoubleSide;
  mat.fog = false;
  return mat;
}

/** Le halo au sol : anneau additif qui pulse sous les pattes. */
export function createHaloNodeMaterial(u: HaloUniforms): MeshBasicNodeMaterial {
  const mat = new MeshBasicNodeMaterial();
  const uColor = boundRgb(u.uColor);
  const uOpacity = boundFloat(u.uOpacity);
  const uPulse = boundFloat(u.uPulse);
  const dist = length(uv().sub(0.5)).mul(2);
  const ring = smoothstep(0, 0.55, dist).mul(float(1).sub(smoothstep(0.55, 1, dist)));
  const glow = pow(float(1).sub(smoothstep(0, 1, dist)), 2).mul(0.5);
  mat.colorNode = uColor.mul(uPulse);
  mat.opacityNode = ring.mul(0.9).add(glow).mul(uPulse).mul(uOpacity);
  mat.transparent = true;
  mat.depthWrite = false;
  mat.blending = AdditiveBlending;
  mat.fog = false;
  return mat;
}
