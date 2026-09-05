import { AdditiveBlending, type BufferGeometry, type Color, type Vector3 } from "three";
import type { Node, PointsNodeMaterial } from "three/webgpu";
import { Fn, float, vec2, vec3, sin, cos, mod, length, mix, smoothstep, max } from "three/tsl";
import { createParticleNodeMaterial, particleAttribute, pointCoord } from "./particles";
import { boundColor, boundFloat, boundVec3 } from "./tsl-bind";
import { modelViewMatrix, vec4 } from "three/tsl";

/**
 * Les petales de cempasuchil en TSL (05/09, migration WebGPU) : champ de
 * courant, cycle de vie, forme petale tournee, vent cardinal d'Ehecatl.
 * Memes uniformes que le ShaderMaterial de spirit-particles.tsx.
 */

export type SpiritUniforms = {
  uColor: { value: Color };
  uAccentColor: { value: Color };
  uIntensity: { value: number };
  uTime: { value: number };
  uCardinalWind: { value: Vector3 };
  uWindStrength: { value: number };
};

/** Trois sinus croises : des lignes de courant fluides a peu de cout. */
const flow = Fn(([p]: [Node<"vec3">]) =>
  vec3(sin(p.y.mul(1.3).add(p.z.mul(0.7))), cos(p.z.mul(1.1).add(p.x.mul(0.9))), sin(p.x.mul(1.5).add(p.y.mul(0.5))))
);

export function createSpiritNodeMaterial(geometry: BufferGeometry, u: SpiritUniforms): PointsNodeMaterial & { uniforms: SpiritUniforms } {
  const c = boundColor(u.uColor);
  const a = boundColor(u.uAccentColor);
  const uColor = vec3(c.r, c.g, c.b);
  const uAccent = vec3(a.r, a.g, a.b);
  const uIntensity = boundFloat(u.uIntensity);
  const uTime = boundFloat(u.uTime);
  const uWind = boundVec3(u.uCardinalWind);
  const uWindStrength = boundFloat(u.uWindStrength);
  const origin = particleAttribute(geometry, "position", "vec3");
  const seed = particleAttribute(geometry, "aSeed", "float");
  const lifespan = particleAttribute(geometry, "aLifespan", "float");
  const accent = particleAttribute(geometry, "aAccent", "float");

  // Cycle de vie [0,1) : chaque petale a sa phase (seed) et sa duree.
  const life = mod(uTime.add(seed.mul(lifespan)), lifespan).div(lifespan);
  const position = Fn(() => {
    const drift = flow(origin.mul(0.5).add(uTime.mul(0.05)));
    const p = origin.add(drift.mul(life).mul(0.9)).toVar();
    p.y.addAssign(life.mul(0.6));
    return p.add(uWind.mul(seed.mul(0.8).add(0.6)));
  })();
  const fade = smoothstep(0, 0.15, life).mul(float(1).sub(smoothstep(0.7, 1, life)));

  const size = Fn(() => {
    const mv = modelViewMatrix.mul(vec4(position, 1));
    return uWindStrength.mul(55).add(90).div(max(0.001, mv.z.negate()));
  })();

  const shape = Fn(() => {
    const rot = seed.mul(6.2831853);
    const co = cos(rot);
    const si = sin(rot);
    const d = pointCoord().sub(0.5);
    // mat2(c, -s, s, c) * uv en colonnes GLSL.
    const uvx = co.mul(d.x).add(si.mul(d.y));
    const uvy = si.negate().mul(d.x).add(co.mul(d.y)).mul(uWindStrength.mul(0.9).add(1.8)).sub(0.08);
    const r = length(vec2(uvx, uvy));
    return float(1).sub(smoothstep(0.15, 0.42, r));
  })();
  const alpha = shape.mul(fade).mul(uIntensity);
  const petal = mix(uColor, uAccent, accent);

  const mat = createParticleNodeMaterial({
    position,
    size,
    // Premultiplie, opacite 1 : en additif, SrcAlpha ecraserait couleur*alpha^2.
    color: petal.mul(alpha),
    opacity: float(1),
    blending: AdditiveBlending,
  }) as PointsNodeMaterial & { uniforms: SpiritUniforms };
  mat.uniforms = u;
  return mat;
}
