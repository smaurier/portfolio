import { BackSide, Color, DataTexture, RGBAFormat, UnsignedByteType, type Texture } from "three";
import { MeshBasicNodeMaterial } from "three/webgpu";
import { Fn, float, vec2, vec3, mix, smoothstep, clamp, fract, atan, asin, positionLocal } from "three/tsl";
import { boundColor, boundFloat, boundTexture, boundRgb } from "./tsl-bind";

/**
 * Le dome du Sud en TSL (05/09, migration WebGPU) : la traduction du
 * ShaderMaterial de sud-sky.tsx. Meme contrat : un objet `uniforms`
 * de la meme forme, que le composant mute a chaque frame ; la couleur
 * vient du degrade horizon -> zenith, puis de la photographie de ciel
 * (equirectangulaire, tournee de uSkyOffset, teintee turquoise), fondue
 * dans l'horizon sur les premiers degres, dosee par uDay.
 */

export type SudSkyUniforms = {
  uHorizon: { value: Color };
  uZenith: { value: Color };
  uOpacity: { value: number };
  uSky: { value: Texture | null };
  uHasSky: { value: number };
  uDay: { value: number };
  uTint: { value: Color };
  uTintMix: { value: number };
  uSkyOffset: { value: number };
};

export function createSudSkyUniforms(tint: Color, tintMix: number): SudSkyUniforms {
  return {
    uHorizon: { value: new Color("#000000") },
    uZenith: { value: new Color("#000000") },
    uOpacity: { value: 0 },
    uSky: { value: null },
    uHasSky: { value: 0 },
    uDay: { value: 0 },
    uTint: { value: tint.clone() },
    uTintMix: { value: tintMix },
    uSkyOffset: { value: 0 },
  };
}

/** Un pixel noir en attendant la photographie. */
function blackPixel(): DataTexture {
  const t = new DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, RGBAFormat, UnsignedByteType);
  t.needsUpdate = true;
  return t;
}

export type SudSkyNodeMaterial = MeshBasicNodeMaterial & { uniforms: SudSkyUniforms };

export function createSudSkyNodeMaterial(uniforms: SudSkyUniforms): SudSkyNodeMaterial {
  const mat = new MeshBasicNodeMaterial() as SudSkyNodeMaterial;
  mat.side = BackSide;
  mat.depthWrite = false;
  mat.fog = false;
  mat.transparent = true;
  mat.uniforms = uniforms;

  const uHorizon = boundColor(uniforms.uHorizon);
  const uZenith = boundColor(uniforms.uZenith);
  const uOpacity = boundFloat(uniforms.uOpacity);
  const uHasSky = boundFloat(uniforms.uHasSky);
  const uDay = boundFloat(uniforms.uDay);
  const tint = boundRgb(uniforms.uTint);
  const uTintMix = boundFloat(uniforms.uTintMix);
  const uSkyOffset = boundFloat(uniforms.uSkyOffset);
  const sky = boundTexture(uniforms.uSky, blackPixel());

  mat.colorNode = Fn(() => {
    const dir = positionLocal.normalize();
    const e = clamp(dir.y, 0, 1);
    const t = smoothstep(0, 0.85, e);
    const horizon = vec3(uHorizon.r, uHorizon.g, uHorizon.b);
    const zenith = vec3(uZenith.r, uZenith.g, uZenith.b);
    const base = mix(horizon, zenith, t);
    // La photographie : u = angle autour de y (tourne), v = elevation.
    const u = fract(atan(dir.z, dir.x).div(6.2831853).add(0.5).add(uSkyOffset));
    const v = asin(clamp(dir.y, -1, 1)).div(3.1415927).add(0.5);
    const photo = sky.sample(vec2(u, v)).rgb;
    const tinted = mix(photo, photo.mul(tint), uTintMix);
    const band = smoothstep(0, 0.1, e);
    const day = mix(horizon, tinted, band);
    const withSky = mix(base, day, uDay);
    return mix(base, withSky, uHasSky);
  })();
  mat.opacityNode = uOpacity;
  return mat;
}
