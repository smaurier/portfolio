import { Color, DoubleSide, MeshPhysicalMaterial, ShaderMaterial, type Material, type Texture } from "three";

/**
 * Les matieres du xiuhcoatl (04/09, retours Sylvain) :
 *  - TURQUOISE : « il est de turquoise, donc de la pierre : une texture
 *    translucide et reflechissante comme une pierre ». La turquoise est
 *    une pierre opaque au lustre cireux, travaillee en MOSAIQUE de
 *    tesselles chez les Mexica (serpent bicephale du British Museum,
 *    masques de Tezcatlipoca). Ici : pierre polie (clearcoat, envMap du
 *    ciel), mosaique procedurale en espace local (tesselles teintees,
 *    joints sombres), et le FEU qui affleure dans les joints (veines de
 *    braise du reflet de Xolotl) plus une lueur interne faible, le clin
 *    d'oeil « translucide ».
 *  - BRAISE : les flammes de la crete et de la queue portent la matiere du
 *    reflet de Xolotl (veines chaudes qui montent, crepitement), sans clip.
 * Les deux prennent le skinning du GLB.
 */

export type XiuhcoatlUniforms = {
  uTime: { value: number };
  uOpacity: { value: number };
  /** 0..1 : force du feu dans les joints et des flammes. */
  uEmber: { value: number };
  /** Part du brouillard de la scene qu'il subit (04/09, retour Sylvain :
   * « trop loin il devient trop bleu en bas de scroll, ou trop noir ») :
   * 1 = comme le decor, 0 = aucun. Il garde un peu d'atmosphere sans se
   * dissoudre dans la couleur du fog. */
  uFogScale: { value: number };
};

export function createXiuhcoatlUniforms(): XiuhcoatlUniforms {
  return { uTime: { value: 0 }, uOpacity: { value: 1 }, uEmber: { value: 1 }, uFogScale: { value: 0.3 } };
}

const FOG_CHUNK = /* glsl */ `
#ifdef USE_FOG
  #ifdef FOG_EXP2
    float xFogFactor = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
  #else
    float xFogFactor = smoothstep(fogNear, fogFar, vFogDepth);
  #endif
  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, xFogFactor * uFogScale);
#endif
`;

/** Brouillard attenue sur une matiere standard/physique de three (le decor
 * garde le sien) : remplace le chunk de fog par une version ponderee. */
export function softenFog(mat: Material & { onBeforeCompile?: unknown; customProgramCacheKey?: () => string }, uniforms: XiuhcoatlUniforms, key: string) {
  const previous = mat.onBeforeCompile as ((shader: { uniforms: Record<string, unknown>; fragmentShader: string; vertexShader: string }) => void) | undefined;
  mat.onBeforeCompile = (shader: { uniforms: Record<string, unknown>; fragmentShader: string; vertexShader: string }) => {
    if (previous) previous(shader);
    shader.uniforms.uFogScale = uniforms.uFogScale;
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uFogScale;")
      .replace("#include <fog_fragment>", FOG_CHUNK);
  };
  mat.customProgramCacheKey = () => key;
  mat.needsUpdate = true;
}

const NOISE_GLSL = /* glsl */ `
float xHash3(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float xVnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(xHash3(i), xHash3(i + vec3(1, 0, 0)), f.x), mix(xHash3(i + vec3(0, 1, 0)), xHash3(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(xHash3(i + vec3(0, 0, 1)), xHash3(i + vec3(1, 0, 1)), f.x), mix(xHash3(i + vec3(0, 1, 1)), xHash3(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
/** Braise : veines chaudes qui montent lentement, crepitement fin. 0..1. */
float xEmberGlow(vec3 local, float t) {
  float veins = xVnoise(local * 5.0 + vec3(0.0, -t * 0.5, 0.0));
  float crackle = xVnoise(local * 16.0 + vec3(t * 0.35, 0.0, -t * 0.2));
  return smoothstep(0.42, 0.88, veins * 0.65 + crackle * 0.35);
}
vec3 xEmberColor(float glow, float t, float phase) {
  float flicker = 0.85 + 0.15 * sin(t * 6.0 + phase * 25.0);
  vec3 col = mix(vec3(0.5, 0.09, 0.01), vec3(0.9, 0.38, 0.05), glow) * flicker;
  col += vec3(1.0, 0.72, 0.35) * pow(glow, 5.0) * 0.25;
  return col;
}
`;

/** Pierre turquoise polie en mosaique, feu dans les joints. */
export function createTurquoiseMaterial(base: Color, sky: Texture | null, uniforms: XiuhcoatlUniforms): MeshPhysicalMaterial {
  const mat = new MeshPhysicalMaterial({
    color: base,
    roughness: 0.3,
    metalness: 0.0,
    clearcoat: 0.85,
    clearcoatRoughness: 0.2,
    envMapIntensity: 1.1,
    sheen: 0.35,
    sheenRoughness: 0.6,
    sheenColor: new Color("#8fe8e0"),
  });
  if (sky) mat.envMap = sky;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uEmber = uniforms.uEmber;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vXLocal;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvXLocal = position;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vXLocal;
uniform float uTime;
uniform float uEmber;
${NOISE_GLSL}
/** Mosaique : tesselles cubiques en espace local, joint = distance au bord. */
void xMosaic(vec3 local, out float tint, out float grout, out float cellId) {
  vec3 p = local * 13.0;
  // Rangees decalees (appareil de tesselles, pas une grille) : chaque
  // rangee glisse d'une fraction propre le long du corps.
  p.x += xHash3(vec3(floor(p.y), floor(p.z), 7.0)) * 0.7;
  vec3 c = floor(p);
  vec3 f = fract(p);
  cellId = xHash3(c);
  tint = 0.78 + 0.34 * cellId;
  vec3 e = min(f, 1.0 - f);
  float edge = min(min(e.x, e.y), e.z);
  grout = 1.0 - smoothstep(0.03, 0.09, edge);
}`
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
float xTint, xGrout, xCell;
xMosaic(vXLocal, xTint, xGrout, xCell);
// Tesselles teintees (chaque pierre a sa nuance), joints sombres.
diffuseColor.rgb *= xTint * (1.0 - 0.7 * xGrout);`
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
float xGlow = xEmberGlow(vXLocal, uTime);
vec3 xEmber = xEmberColor(xGlow, uTime, xGlow);
// Le feu affleure dans les joints, et une lueur interne faible traverse la
// pierre (clin d'oeil « translucide »).
totalEmissiveRadiance += xEmber * uEmber * (xGrout * 0.9 + 0.07 * xGlow);`
      );
  };
  softenFog(mat, uniforms, "xiuhcoatl-turquoise");
  return mat;
}

/** Les flammes : la braise du reflet de Xolotl, skinnee, sans clip. */
export function createEmberFireMaterial(uniforms: XiuhcoatlUniforms): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { uTime: uniforms.uTime, uOpacity: uniforms.uOpacity, uEmber: uniforms.uEmber },
    transparent: true,
    side: DoubleSide,
    vertexShader: /* glsl */ `
      #include <common>
      #include <skinning_pars_vertex>
      varying vec3 vLocal;
      void main() {
        #include <skinbase_vertex>
        #include <begin_vertex>
        #include <skinning_vertex>
        vLocal = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uOpacity;
      uniform float uEmber;
      varying vec3 vLocal;
      ${NOISE_GLSL}
      void main() {
        float glow = xEmberGlow(vLocal, uTime);
        vec3 col = xEmberColor(glow, uTime, glow) * (0.55 + 0.75 * uEmber);
        float a = uOpacity * (0.85 + 0.15 * glow);
        if (a < 0.002) discard;
        gl_FragColor = vec4(col, a);
      }
    `,
  });
}
