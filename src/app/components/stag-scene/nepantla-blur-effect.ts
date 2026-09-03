import { Effect } from "postprocessing";
import { Uniform } from "three";

/**
 * NepantlaBlurEffect (03/09, etage 2b du chantier transitions).
 *
 * Flou de file (pan blur) pendant le voyage cardinal : la camera
 * orbite autour du cerf, donc a l'ecran le monde defile
 * horizontalement tandis que le sujet (pivot du lookAt, ~centre du
 * cadre) reste immobile. Le flou reproduit exactement cette physique :
 *  - net sur le cerf (smoothstep depuis le centre du cadre),
 *  - etirement horizontal croissant vers les bords,
 *  - intensite = uStrength, asservie par le composant React a
 *    swingSpeed (pic au coeur du passage, zero aux deux bouts).
 *
 * 8 taps horizontaux : convolution → NE JAMAIS laisser fusionner avec
 * un effet qui transforme les UV (Ollin) : monte dans son propre
 * EffectGroup (lecon page blanche prod du 01/09).
 */

const fragmentShader = /* glsl */ `
uniform float uStrength;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // Le cerf vit legerement sous le centre du cadre (target y=1 monde).
  vec2 pivot = vec2(0.5, 0.45);
  // Net a moins de ~8% du pivot, flou plein a partir de ~45%.
  float focusMask = smoothstep(0.08, 0.45, distance(uv, pivot));
  float amount = uStrength * focusMask;
  if (amount < 0.0005) {
    outputColor = inputColor;
    return;
  }
  vec4 acc = vec4(0.0);
  for (int i = 0; i < 8; i++) {
    float offset = (float(i) / 7.0 - 0.5) * amount;
    acc += texture2D(inputBuffer, clamp(uv + vec2(offset, 0.0), 0.001, 0.999));
  }
  outputColor = acc / 8.0;
}
`;

export class NepantlaBlurEffect extends Effect {
  constructor() {
    super("NepantlaBlurEffect", fragmentShader, {
      uniforms: new Map<string, Uniform>([
        ["uStrength", new Uniform(0)],
      ]),
    });
  }
}
