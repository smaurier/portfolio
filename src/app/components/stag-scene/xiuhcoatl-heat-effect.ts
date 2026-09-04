import { Effect } from "postprocessing";
import { Uniform, Vector4 } from "three";
import { HEAT_TRAIL_MAX } from "./xiuhcoatl-store";

/**
 * XiuhcoatlHeatEffect (04/09, Sud). La trainee chaude du serpent de feu :
 * l'air tremble derriere lui comme au-dessus de l'asphalte en ete
 * (Sylvain). Pas de fumee, pas de bouffees : une refraction fine,
 * turbulente, qui s'eteint en une seconde.
 *
 * GLSL : mainUv() deplace les UV lus par une turbulence (bruit de valeur
 * anime) ponderee par des gaussiennes centrees sur les points de chaleur
 * (uPoints : u, v, rayon en UV, force 0..1). Le bruit monte (l'air chaud
 * s'eleve). mainImage() est un passe-plat. Effet qui TRANSFORME LES UV :
 * a isoler dans son propre EffectGroup (lecon Ollin du 01/09).
 */

const fragmentShader = /* glsl */ `
uniform vec4 uPoints[${HEAT_TRAIL_MAX}];
uniform float uTime;
uniform float uAmplitude;
uniform float uAspect;

float hash2(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float vnoise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash2(i), hash2(i + vec2(1.0, 0.0)), f.x), mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), f.x), f.y);
}

void mainUv(inout vec2 uv) {
  float weight = 0.0;
  for (int k = 0; k < ${HEAT_TRAIL_MAX}; k++) {
    vec4 p = uPoints[k];
    if (p.w <= 0.0) continue;
    vec2 d = uv - p.xy;
    d.x *= uAspect;
    float r = max(p.z, 1e-4);
    weight += p.w * exp(-dot(d, d) / (r * r));
  }
  if (weight <= 0.001) return;
  // Turbulence fine qui monte : deux octaves, decalees dans le temps.
  vec2 q = uv * vec2(uAspect, 1.0) * 38.0 + vec2(0.0, -uTime * 2.2);
  vec2 n = vec2(vnoise2(q), vnoise2(q + vec2(31.7, 17.3))) - 0.5;
  vec2 q2 = uv * vec2(uAspect, 1.0) * 90.0 + vec2(uTime * 0.7, -uTime * 4.0);
  n += 0.5 * (vec2(vnoise2(q2), vnoise2(q2 + vec2(5.1, 9.7))) - 0.5);
  uv += n * uAmplitude * min(weight, 1.0);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  outputColor = inputColor;
}
`;

export class XiuhcoatlHeatEffect extends Effect {
  constructor() {
    const points: Vector4[] = [];
    for (let i = 0; i < HEAT_TRAIL_MAX; i++) points.push(new Vector4(0, 0, 0, 0));
    super("XiuhcoatlHeatEffect", fragmentShader, {
      uniforms: new Map<string, Uniform>([
        ["uPoints", new Uniform(points)],
        ["uTime", new Uniform(0)],
        ["uAmplitude", new Uniform(0.012)],
        ["uAspect", new Uniform(1.6)],
      ]),
    });
  }
}
