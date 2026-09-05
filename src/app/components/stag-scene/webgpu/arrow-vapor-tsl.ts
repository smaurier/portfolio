import { NormalBlending, type BufferGeometry, type Color, type Texture } from "three";
import type { PointsNodeMaterial } from "three/webgpu";
import { Fn, float, vec3, length, mix, select, step, texture } from "three/tsl";
import { createParticleNodeMaterial, particleAttribute, pointCoord, pointSizeNode } from "./particles";
import { boundColor, boundFloat } from "./tsl-bind";

/**
 * La vapeur des fleches en TSL (05/09, migration WebGPU) : fumee noire
 * (sprite Kenney) ou eclat dur, braise et etincelle quand la particule
 * est chaude. Memes uniformes que le ShaderMaterial d'arrow-vapor.tsx.
 * Les `discard` du GLSL deviennent une opacite nulle.
 */

export type ArrowVaporUniforms = {
  uSprite: { value: Texture };
  uSmoke: { value: Color };
  uShard: { value: Color };
  uEmber: { value: Color };
  uSpark: { value: Color };
  uSparkDying: { value: Color };
  uScale: { value: number };
};

const rgb = (c: ReturnType<typeof boundColor>) => vec3(c.r, c.g, c.b);

export function createArrowVaporNodeMaterial(geometry: BufferGeometry, u: ArrowVaporUniforms): PointsNodeMaterial & { uniforms: ArrowVaporUniforms } {
  const uSmoke = rgb(boundColor(u.uSmoke));
  const uShard = rgb(boundColor(u.uShard));
  const uEmber = rgb(boundColor(u.uEmber));
  const uSpark = rgb(boundColor(u.uSpark));
  const uSparkDying = rgb(boundColor(u.uSparkDying));
  const uScale = boundFloat(u.uScale);
  const position = particleAttribute(geometry, "position", "vec3");
  const size = particleAttribute(geometry, "aSize", "float");
  const alpha = particleAttribute(geometry, "aAlpha", "float");
  const kind = particleAttribute(geometry, "aKind", "float");
  const heat = particleAttribute(geometry, "aHeat", "float");
  const sprite = texture(u.uSprite.value);

  const isSmoke = kind.lessThan(0.5);
  const smokeAlpha = sprite.sample(pointCoord()).a;
  const d = pointCoord().sub(0.5);
  const r = length(d);
  const inDisc = step(r, 0.5); // 1 dans l'eclat, 0 dehors (le discard)

  const color = Fn(() => {
    const smoke = mix(uSmoke, uEmber.mul(smokeAlpha.mul(0.8).add(1)), heat);
    const edge = float(1).sub(r.mul(2));
    const spark = mix(uSparkDying, uSpark.mul(edge.mul(0.6).add(1)), alpha);
    const shard = mix(uShard.add(edge.mul(0.12)), spark, heat);
    return select(isSmoke, smoke, shard);
  })();

  const opacity = Fn(() => {
    const smoke = smokeAlpha.mul(alpha);
    const shard = select(heat.greaterThan(0.5), float(1), alpha).mul(inDisc);
    return select(isSmoke, smoke, shard).mul(step(0.001, alpha));
  })();

  const mat = createParticleNodeMaterial({
    position,
    size: pointSizeNode(position, size, uScale, 0.1),
    color,
    opacity,
    blending: NormalBlending,
  }) as PointsNodeMaterial & { uniforms: ArrowVaporUniforms };
  mat.uniforms = u;
  return mat;
}
