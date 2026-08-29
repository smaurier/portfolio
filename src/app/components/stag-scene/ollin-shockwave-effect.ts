import { Effect } from "postprocessing";
import { Uniform, Vector2 } from "three";

/**
 * OllinShockwaveEffect (29/08 chantier press-deform).
 *
 * Ollin = glyphe nahua du mouvement / tremblement sacre. Chaque toucher
 * de l'utilisateur declenche une onde radiale qui traverse le voile.
 * Pattern Igloo Inc SOTY 2024 : ripple distortion + chromatic aberration
 * radiale, decay ~800ms. Signature "le cerf sent ta presence avant toi".
 *
 * Cote GLSL :
 * - mainUv() : deforme les UV read via une onde sin() attenue par
 *   distance au centre du toucher (uCenter en UV normalise 0..1) et
 *   par la progression temporelle (uProgress 0..1). Amplitude
 *   uAmplitude module par decay quadratique.
 * - mainImage() : chromatic aberration radial (RGB split le long du
 *   vecteur diff), attenuation gaussienne autour du centre.
 *
 * Uniforms mis a jour par le composant React parent OllinShockwave
 * via useFrame — les tick lerp uProgress + uAmplitude jusqu'a
 * disparition, puis reset.
 */

const fragmentShader = /* glsl */ `
uniform vec2 uCenter;
uniform float uProgress;
uniform float uAmplitude;

void mainUv(inout vec2 uv) {
  vec2 diff = uv - uCenter;
  float dist = length(diff);
  // Onde radiale : sin propage a vitesse (dist * 40 - progress * 15).
  // Enveloppe exp(-dist * 4) concentre autour du centre.
  float wave = sin(dist * 40.0 - uProgress * 15.0) * exp(-dist * 4.0);
  // Attenuation temporelle : disparait en fin de progress.
  float atten = 1.0 - uProgress;
  vec2 dir = diff / (dist + 0.0001);
  uv += dir * wave * uAmplitude * atten;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 diff = uv - uCenter;
  float dist = length(diff);
  // Chromatic aberration proche du centre, degrade rapidement.
  float aberration = exp(-dist * 3.5) * (1.0 - uProgress) * 0.006;
  vec2 dir = diff / (dist + 0.0001);
  float r = texture2D(inputBuffer, clamp(uv - dir * aberration, 0.001, 0.999)).r;
  float g = inputColor.g;
  float b = texture2D(inputBuffer, clamp(uv + dir * aberration, 0.001, 0.999)).b;
  outputColor = vec4(r, g, b, inputColor.a);
}
`;

export class OllinShockwaveEffect extends Effect {
  constructor() {
    super("OllinShockwaveEffect", fragmentShader, {
      uniforms: new Map<string, Uniform>([
        ["uCenter", new Uniform(new Vector2(0.5, 0.5))],
        ["uProgress", new Uniform(1)],
        ["uAmplitude", new Uniform(0)],
      ]),
    });
  }
}
