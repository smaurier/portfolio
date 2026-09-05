import { AdditiveBlending, DataTexture, type BufferGeometry, type Color, type Texture } from "three";
import type { Node, PointsNodeMaterial } from "three/webgpu";
import { Fn, float, vec2, vec3, sin, cos, mod, abs, pow, mix, max, length, smoothstep, step, select } from "three/tsl";
import { createParticleNodeMaterial, particleAttribute, pointCoord, pointSizeNode } from "./particles";
import { boundFloat, boundTexture, boundRgb } from "./tsl-bind";

/**
 * Les ambiances cardinales en TSL (05/09, migration WebGPU) : les quatre
 * nuages de points de ambience/* traduits noeud a noeud (braises du
 * centre, poussiere d'or de l'Est, filaments de cendre de l'Ouest, colibris
 * du Sud). Chaque fabrique garde les uniformes `{ value }` du composant
 * (uAlpha, uTime, couleurs) ; la couleur sort premultipliee avec une
 * opacite de 1, comme les GLSL (`vec4(col * a, 1.0)` en additif).
 */

type AlphaTime = { uAlpha: { value: number }; uTime: { value: number } };
export type CenterUniforms = AlphaTime & { uColor: { value: Color }; uAccent: { value: Color } };
export type EastUniforms = AlphaTime & { uColor: { value: Color } };
export type WestUniforms = AlphaTime & { uColor: { value: Color } };
export type SouthUniforms = AlphaTime & { uColor: { value: Color }; uAccent: { value: Color } };
export type NorthUniforms = AlphaTime & {
  uSmokeColor: { value: Color };
  uShardColor: { value: Color };
  uMistColor: { value: Color };
  uGlintColor: { value: Color };
  uSmokeTex: { value: Texture | null };
};

/** Disque doux, rayon 0.5 (le point entier), comme les GLSL. */
const disc = (r: Node<"float">) => float(1).sub(smoothstep(0, 0.5, r));

function ambienceMaterial<U extends AlphaTime>(u: U, position: Node<"vec3">, size: Node<"float">, premultiplied: Node<"vec3">) {
  const uAlpha = boundFloat(u.uAlpha);
  const mat = createParticleNodeMaterial({
    position,
    size: pointSizeNode(position, size, float(1), 0.001),
    color: premultiplied,
    // `if (uAlpha < 0.01) discard`.
    opacity: step(0.01, uAlpha),
    blending: AdditiveBlending,
  }) as PointsNodeMaterial & { uniforms: U };
  mat.uniforms = u;
  return mat;
}

/** Centre, Xiuhtecuhtli : braises qui montent du foyer et refroidissent. */
export function createCenterAmbienceNodeMaterial(geometry: BufferGeometry, u: CenterUniforms) {
  const uTime = boundFloat(u.uTime);
  const uAlpha = boundFloat(u.uAlpha);
  const uColor = boundRgb(u.uColor);
  const uAccent = boundRgb(u.uAccent);
  const origin = particleAttribute(geometry, "position", "vec3");
  const seed = particleAttribute(geometry, "aSeed", "float");
  const lifespan = particleAttribute(geometry, "aLifespan", "float");
  const t = mod(uTime.add(seed.mul(lifespan)), lifespan).div(lifespan);
  const position = Fn(() => {
    const rise = float(1).sub(pow(float(1).sub(t), 3));
    return origin.add(vec3(sin(uTime.mul(0.7).add(seed.mul(6.28))).mul(0.15).mul(t), rise.mul(4), cos(uTime.mul(0.5).add(seed.mul(6.28))).mul(0.15).mul(t)));
  })();
  const alpha = smoothstep(0, 0.15, t).mul(float(1).sub(smoothstep(0.65, 1, t)));
  const size = sin(t.mul(3.14)).mul(20).add(30);
  const color = Fn(() => {
    const r = length(pointCoord().sub(0.5));
    const col = mix(uAccent, uColor, t);
    return col.mul(disc(r).mul(alpha).mul(uAlpha));
  })();
  return ambienceMaterial(u, position, size, color);
}

/** Est, Tonatiuh : poussiere d'or qui scintille en descendant. */
export function createEastAmbienceNodeMaterial(geometry: BufferGeometry, u: EastUniforms) {
  const uTime = boundFloat(u.uTime);
  const uAlpha = boundFloat(u.uAlpha);
  const uColor = boundRgb(u.uColor);
  const origin = particleAttribute(geometry, "position", "vec3");
  const seed = particleAttribute(geometry, "aSeed", "float");
  const position = origin.add(vec3(sin(uTime.mul(0.3).add(seed.mul(6.28))).mul(0.15), cos(uTime.mul(0.25).add(seed.mul(4))).mul(0.12), 0));
  const twinkle = pow(sin(uTime.mul(seed.mul(3).add(2)).add(seed.mul(6.28))).mul(0.5).add(0.5), 3).mul(0.7).add(0.3);
  const color = Fn(() => {
    const r = length(pointCoord().sub(0.5));
    const shape = pow(disc(r), 1.4);
    return uColor.mul(shape.mul(twinkle).mul(uAlpha));
  })();
  return ambienceMaterial(u, position, float(28), color);
}

/** Ouest, Ehecatl : filaments de cendre qui traversent d'Est en Ouest. */
export function createWestAmbienceNodeMaterial(geometry: BufferGeometry, u: WestUniforms) {
  const uTime = boundFloat(u.uTime);
  const uAlpha = boundFloat(u.uAlpha);
  const uColor = boundRgb(u.uColor);
  const origin = particleAttribute(geometry, "position", "vec3");
  const seed = particleAttribute(geometry, "aSeed", "float");
  const speed = seed.mul(0.8).add(0.6);
  const driftX = mod(uTime.mul(speed).add(seed.mul(12)), 12).sub(6);
  const position = vec3(driftX.negate(), origin.y.add(sin(uTime.mul(0.4).add(seed.mul(6.28))).mul(0.3)), origin.z.add(cos(uTime.mul(0.35).add(seed.mul(5))).mul(0.4)));
  const xNorm = position.x.div(6);
  const fade = float(1).sub(abs(xNorm).mul(0.4));
  const alpha = smoothstep(0, 0.3, float(1).sub(abs(xNorm))).mul(fade);
  const color = Fn(() => {
    const uv = pointCoord().sub(0.5);
    const r = length(vec2(uv.x.mul(0.35), uv.y));
    const shape = float(1).sub(smoothstep(0, 0.28, r));
    const col = uColor.mul(speed.mul(0.3).add(0.7));
    return col.mul(shape.mul(alpha).mul(uAlpha).mul(0.8));
  })();
  return ambienceMaterial(u, position, float(22), color);
}

/** Sud, Huitzilopochtli : colibris en Lissajous, tete qui bat des ailes. */
export function createSouthAmbienceNodeMaterial(geometry: BufferGeometry, u: SouthUniforms) {
  const uTime = boundFloat(u.uTime);
  const uAlpha = boundFloat(u.uAlpha);
  const uColor = boundRgb(u.uColor);
  const uAccent = boundRgb(u.uAccent);
  const bird = particleAttribute(geometry, "aBird", "float");
  const trail = particleAttribute(geometry, "aTrail", "float");
  const phase = bird.mul(2.1);
  const speed = bird.mul(0.15).add(0.9);
  const t = uTime.mul(speed).sub(trail.mul(0.4)).add(phase);
  const position = vec3(
    sin(t.mul(1.3).add(phase)).mul(bird.mul(0.4).add(2.5)),
    sin(t.mul(0.8).add(phase.mul(2))).mul(1.5).add(2.5),
    cos(t.mul(1.7).add(phase)).mul(bird.mul(0.3).add(2))
  );
  const flash = sin(uTime.mul(44).add(bird.mul(3))).mul(0.5).add(0.5);
  const size = mix(38, 6, trail);
  const color = Fn(() => {
    const r = length(pointCoord().sub(0.5));
    const col = mix(mix(uColor, uAccent, flash.mul(0.3)), uColor, trail);
    const trailFade = float(1).sub(trail.mul(0.7));
    return col.mul(disc(r).mul(trailFade).mul(uAlpha));
  })();
  return ambienceMaterial(u, position, size, color);
}

/** Tourne un offset de sprite (uv - 0.5) d'un angle. */
const rotate2 = (uv: Node<"vec2">, angle: Node<"float">) => {
  const c = cos(angle);
  const s = sin(angle);
  return vec2(uv.x.mul(c).sub(uv.y.mul(s)), uv.x.mul(s).add(uv.y.mul(c)));
};

/** Nord, Mictlantecuhtli : fumee (volute Kenney tournee), lames d'obsidienne
 * qui derivent d'Est en Ouest avec un glint cempasuchil, brume du fleuve. */
export function createNorthAmbienceNodeMaterial(geometry: BufferGeometry, u: NorthUniforms) {
  const uTime = boundFloat(u.uTime);
  const uAlpha = boundFloat(u.uAlpha);
  const uSmoke = boundRgb(u.uSmokeColor);
  const uShard = boundRgb(u.uShardColor);
  const uMist = boundRgb(u.uMistColor);
  const uGlint = boundRgb(u.uGlintColor);
  // La texture arrive apres le premier rendu (useTexture) : un pixel
  // transparent en attendant.
  const placeholder = new DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
  placeholder.needsUpdate = true;
  const smokeTex = boundTexture(u.uSmokeTex, placeholder);
  const origin = particleAttribute(geometry, "position", "vec3");
  const seed = particleAttribute(geometry, "aSeed", "float");
  const lifespan = particleAttribute(geometry, "aLifespan", "float");
  const kind = particleAttribute(geometry, "aKind", "float");
  const isSmoke = kind.lessThan(0.5);
  const isShard = kind.lessThan(1.5).and(isSmoke.not());
  const t = mod(uTime.add(seed.mul(lifespan)), lifespan).div(lifespan);
  const tau = seed.mul(6.28);

  // Fumee : monte en ease-out, derive douce, tourne et s'etale.
  const smokePos = origin.add(vec3(sin(uTime.mul(0.2).add(tau)).mul(0.4).mul(t), pow(t, 0.7).mul(4.2), cos(uTime.mul(0.15).add(tau)).mul(0.4).mul(t)));
  const smokeAlpha = smoothstep(0, 0.2, t).mul(float(1).sub(smoothstep(0.55, 1, t)));
  const smokeRot = tau.add(uTime.mul(seed.mul(0.1).add(0.12)));
  // Lame : derive commune Est -> Ouest, lisible (traverse en 25-60 s).
  const shardSpeed = seed.mul(0.3).add(0.25);
  const shardX = float(6).sub(mod(uTime.mul(shardSpeed).add(seed.mul(12)), 12));
  const shardPos = vec3(shardX, origin.y.add(sin(uTime.mul(0.25).add(tau)).mul(0.25)), origin.z.add(cos(uTime.mul(0.2).add(seed.mul(5))).mul(0.2)));
  const shardAlpha = smoothstep(0, 0.18, float(1).sub(abs(shardX).div(6))).mul(0.9).add(0.1);
  const glintPhase = mod(uTime.mul(0.022).add(seed.mul(13)), 1);
  const glint = select(seed.greaterThan(0.96), smoothstep(0, 0.015, glintPhase).mul(float(1).sub(smoothstep(0.03, 0.05, glintPhase))), float(0));
  // Brume : respiration tres lente pres du sol.
  const mistPos = origin.add(vec3(sin(uTime.mul(0.08).add(tau)).mul(0.5), sin(uTime.mul(0.12).add(seed.mul(4.1))).mul(0.05), cos(uTime.mul(0.06).add(seed.mul(5.2))).mul(0.5)));
  const mistAlpha = smoothstep(0, 0.25, t).mul(float(1).sub(smoothstep(0.7, 1, t)));
  const mistRot = tau.add(uTime.mul(0.05));

  const position = select(isSmoke, smokePos, select(isShard, shardPos, mistPos));
  const alpha = select(isSmoke, smokeAlpha, select(isShard, shardAlpha, mistAlpha));
  const life = select(isSmoke, t, float(0.5));
  const rot = select(isSmoke, smokeRot, mistRot);
  const size = select(isSmoke, mix(200, 380, life), select(isShard, float(120), float(340)));

  const color = Fn(() => {
    const uv = pointCoord().sub(0.5);
    const volute = smokeTex.sample(rotate2(uv, rot).add(0.5)).a;
    // Lame : streak fin oriente le long du vent, arete nette, coeur brillant.
    const ruv = rotate2(uv, float(-0.12));
    const sd = length(vec2(ruv.x, ruv.y.mul(7)));
    const streak = float(1).sub(smoothstep(0.04, 0.42, sd)).toVar();
    streak.addAssign(pow(max(streak, 0), 3).mul(0.9));
    const shape = select(isShard, streak, volute);
    const col = select(isSmoke, uSmoke, select(isShard, mix(uShard, uGlint, glint), uMist));
    const aMul = select(isSmoke, mix(0.75, 0.35, life), select(isShard, glint.mul(1.6).add(1.4), float(0.4)));
    return col.mul(shape.mul(alpha).mul(uAlpha).mul(aMul));
  })();
  return ambienceMaterial(u, position, size, color);
}
