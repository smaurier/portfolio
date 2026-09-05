import { Vector2 } from "three";
import type { Node, TextureNode, UniformNode } from "three/webgpu";
import { Fn, float, vec2, vec4, uniform, length, exp, sin, clamp, smoothstep, distance, screenUV } from "three/tsl";

/**
 * Les effets maison de la chaine WebGL portes en TSL (05/09) : l'onde
 * d'Ollin (deformation radiale + aberration pres du centre) et le flou de
 * file Nepantla (8 taps horizontaux, net sur le cerf). Memes formules
 * que ollin-shockwave-effect.ts et nepantla-blur-effect.ts.
 */

export type OllinUniforms = { center: UniformNode<"vec2", Vector2>; progress: UniformNode<"float", number>; amplitude: UniformNode<"float", number> };

export function createOllinUniforms(): OllinUniforms {
  return { center: uniform(new Vector2(0.5, 0.5)), progress: uniform(1), amplitude: uniform(0) };
}

/** L'onde d'Ollin sur `color` (texture de la scene). `uv` est en
 * origine bas-gauche comme les UV pmndrs ; screenUV a l'origine en haut. */
export function ollinNode(color: TextureNode, u: OllinUniforms): Node<"vec4"> {
  return Fn(() => {
    const uv = vec2(screenUV.x, float(1).sub(screenUV.y)).toVar();
    const diff = uv.sub(u.center);
    const dist = length(diff);
    const dir = diff.div(dist.add(0.0001));
    // Onde radiale, enveloppe exp(-dist * 4), eteinte en fin de progression.
    const wave = sin(dist.mul(40).sub(u.progress.mul(15))).mul(exp(dist.mul(-4)));
    const atten = float(1).sub(u.progress);
    uv.addAssign(dir.mul(wave).mul(u.amplitude).mul(atten));
    // Aberration chromatique pres du centre.
    const aberration = exp(dist.mul(-3.5)).mul(atten).mul(0.006);
    const flip = (p: Node<"vec2">) => vec2(p.x, float(1).sub(p.y));
    const r = color.sample(flip(clamp(uv.sub(dir.mul(aberration)), 0.001, 0.999))).r;
    const g = color.sample(flip(uv)).g;
    const b = color.sample(flip(clamp(uv.add(dir.mul(aberration)), 0.001, 0.999))).b;
    return vec4(r, g, b, 1);
  })();
}

/** Le flou de file Nepantla sur `input` (texture) : net a moins de 8 % du
 * pivot (le cerf, un peu sous le centre), file horizontale au-dela. */
export function nepantlaNode(input: TextureNode, strength: Node<"float">): Node<"vec4"> {
  return Fn(() => {
    const uv = screenUV;
    // Le pivot est en origine bas-gauche (0.5, 0.45) : en haut-gauche, y = 0.55.
    const focusMask = smoothstep(0.08, 0.45, distance(uv, vec2(0.5, 0.55)));
    const amount = strength.mul(focusMask);
    const acc = vec4(0).toVar();
    for (let i = 0; i < 8; i++) {
      const offset = amount.mul(i / 7 - 0.5);
      acc.addAssign(input.sample(clamp(uv.add(vec2(offset, 0)), 0.001, 0.999)));
    }
    return acc.div(8);
  })();
}
