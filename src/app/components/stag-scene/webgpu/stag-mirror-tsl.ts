import { DataTexture, DoubleSide, type Color, type Texture } from "three";
import { MeshBasicNodeMaterial } from "three/webgpu";
import { Fn, float, vec2, vec3, vec4, length, smoothstep, varying, positionLocal, modelWorldMatrix, cameraViewMatrix, cameraProjectionMatrix } from "three/tsl";
import { boundFloat, boundTexture, boundRgb } from "./tsl-bind";

/**
 * Le reflet du cerf dans le puits (stag-mirror.tsx) en TSL (05/09,
 * migration WebGPU). Le sommet est deplace en espace MONDE par le gradient
 * de la nappe d'eau (refraction), puis projete a la main (`vertexNode`) ;
 * le fragment lit la position monde refractee via un varying pour le
 * masque radial et le fade de contact.
 */

export type StagMirrorUniforms = {
  uColor: { value: Color };
  uOpacity: { value: number };
  uRadiusInner: { value: number };
  uRadiusOuter: { value: number };
  uContactY: { value: number };
  uFadeDepth: { value: number };
  uFadeEdge: { value: number };
  uRipple: { value: Texture | null };
  uTexel: { value: number };
  uExtent: { value: number };
  uRefract: { value: number };
};

export function createStagMirrorNodeMaterial(u: StagMirrorUniforms): MeshBasicNodeMaterial & { uniforms: StagMirrorUniforms } {
  const mat = new MeshBasicNodeMaterial() as MeshBasicNodeMaterial & { uniforms: StagMirrorUniforms };
  const uColor = boundRgb(u.uColor);
  const uOpacity = boundFloat(u.uOpacity);
  const uRadiusInner = boundFloat(u.uRadiusInner);
  const uRadiusOuter = boundFloat(u.uRadiusOuter);
  const uContactY = boundFloat(u.uContactY);
  const uFadeDepth = boundFloat(u.uFadeDepth);
  const uFadeEdge = boundFloat(u.uFadeEdge);
  const uTexel = boundFloat(u.uTexel);
  const uExtent = boundFloat(u.uExtent);
  const uRefract = boundFloat(u.uRefract);
  // La nappe (ping-pong : la reference change a chaque frame) ; eau
  // plate en attendant.
  const flat = new DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  flat.needsUpdate = true;
  const ripple = boundTexture(u.uRipple, flat);

  // Ondes de la nappe : le gradient de hauteur refracte le reflet
  // (echantillonne en espace sol). Eau calme = reflet immobile.
  const refractedWorld = Fn(() => {
    const world = modelWorldMatrix.mul(vec4(positionLocal, 1)).toVar();
    const suv = world.xz.div(uExtent.mul(2)).add(0.5);
    const hL = ripple.sample(suv.sub(vec2(uTexel, 0))).x;
    const hR = ripple.sample(suv.add(vec2(uTexel, 0))).x;
    const hB = ripple.sample(suv.sub(vec2(0, uTexel))).x;
    const hT = ripple.sample(suv.add(vec2(0, uTexel))).x;
    world.xz.addAssign(vec2(hR.sub(hL), hT.sub(hB)).mul(uRefract));
    return world;
  })();
  const worldPos = varying(refractedWorld.xyz);
  mat.vertexNode = cameraProjectionMatrix.mul(cameraViewMatrix.mul(refractedWorld));

  mat.colorNode = uColor;
  mat.opacityNode = Fn(() => {
    const mask = float(1).sub(smoothstep(uRadiusInner, uRadiusOuter, length(worldPos.xz)));
    // Fade de contact : le reflet emerge en s'eloignant du plan du miroir.
    const contactFade = float(1).sub(smoothstep(uContactY.sub(uFadeDepth), uContactY.sub(uFadeEdge), worldPos.y));
    return uOpacity.mul(mask).mul(contactFade);
  })();
  mat.transparent = true;
  mat.depthWrite = false;
  mat.depthTest = false;
  mat.side = DoubleSide;
  mat.fog = false;
  mat.uniforms = u;
  return mat;
}
