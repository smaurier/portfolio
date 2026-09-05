import { AdditiveBlending, type BufferGeometry, type Texture } from "three";
import type { PointsNodeMaterial } from "three/webgpu";
import { Fn, texture } from "three/tsl";
import { createParticleNodeMaterial, particleAttribute, pointCoord, pointSizeNode } from "./particles";
import { boundFloat } from "./tsl-bind";

/**
 * La gerbe de feu de l'anneau en TSL (05/09, migration WebGPU) : braises
 * en sprites additifs, couleur et taille par particule, meme sprite doux
 * que la version GLSL (piedra-ring-fire.tsx).
 */

export type RingFireUniforms = { uMap: { value: Texture }; uScale: { value: number } };

export function createRingFireNodeMaterial(geometry: BufferGeometry, u: RingFireUniforms): PointsNodeMaterial & { uniforms: RingFireUniforms } {
  const uScale = boundFloat(u.uScale);
  const position = particleAttribute(geometry, "position", "vec3");
  const size = particleAttribute(geometry, "aSize", "float");
  const aColor = particleAttribute(geometry, "aColor", "vec3");
  const sprite = texture(u.uMap.value);
  const mat = createParticleNodeMaterial({
    position,
    size: pointSizeNode(position, size, uScale),
    color: Fn(() => aColor.mul(sprite.sample(pointCoord()).a))(),
    opacity: Fn(() => sprite.sample(pointCoord()).a)(),
    blending: AdditiveBlending,
    toneMapped: false,
  }) as PointsNodeMaterial & { uniforms: RingFireUniforms };
  mat.uniforms = u;
  return mat;
}
