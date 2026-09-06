import { MeshStandardMaterial, type Material, type Object3D } from "three";
import { createFrostState, type FrostState } from "@/lib/frost";
import { addShaderModifier } from "./shader-patch";

/**
 * Le gel de l'Est (06/09) : etat partage (machine d'etat lib/frost, avancee
 * par FrostWorld) lu par le cerf (mixer fige), l'herbe (vent fige), les
 * coques de glace ; et le GIVRE PAR SHADER pose sur tous les materiaux
 * standard de la scene (meme mecanique que depth-fade : traverse
 * idempotent, addShaderModifier). Le givre ne coute rien hors de l'Est :
 * uFrost vaut 0.
 */
export const frostStore: { state: FrostState; active: boolean; impulse: number; impact: { x: number; y: number; z: number } } = {
  state: createFrostState(),
  active: false,
  /** Compteur d'explosions (l'herbe lit, comme xiuhcoatlStore.strikeHit). */
  impulse: 0,
  /** Point d'impact du dard du soleil (monde). */
  impact: { x: 0, y: 1, z: 0 },
};

// Lecture externe (verifications Playwright, console) : l'etat du gel.
if (typeof window !== "undefined") (window as unknown as { __nahualFrost?: unknown }).__nahualFrost = frostStore;

export const frostUniforms = {
  uFrost: { value: 0 },
  uFrostTime: { value: 0 },
};

const FROST_GLSL = /* glsl */ `
  float frostHash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float frostNoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(frostHash(i), frostHash(i + vec3(1, 0, 0)), f.x), mix(frostHash(i + vec3(0, 1, 0)), frostHash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(frostHash(i + vec3(0, 0, 1)), frostHash(i + vec3(1, 0, 1)), f.x), mix(frostHash(i + vec3(0, 1, 1)), frostHash(i + vec3(1, 1, 1)), f.x), f.y),
      f.z);
  }
`;

const patched = new WeakSet<Material>();

/** Pose le givre sur chaque MeshStandardMaterial (et Physical) sous `root`.
 * Idempotent, a rappeler chaque image (les enfants sous Suspense montent
 * apres le premier rendu). */
export function applyFrost(root: Object3D): void {
  root.traverse((child) => {
    const mesh = child as unknown as { material?: Material | Material[] };
    if (!mesh.material) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (!(material instanceof MeshStandardMaterial)) continue;
      if (patched.has(material)) continue;
      patched.add(material);
      addShaderModifier(material, (shader) => {
        shader.uniforms.uFrost = frostUniforms.uFrost;
        shader.uniforms.uFrostTime = frostUniforms.uFrostTime;
        shader.vertexShader = shader.vertexShader
          .replace("#include <common>", "#include <common>\n varying vec3 vFrostW;\n varying vec3 vFrostN;")
          .replace(
            "#include <fog_vertex>",
            `#include <fog_vertex>
             #ifdef USE_INSTANCING
             vFrostW = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
             #else
             vFrostW = (modelMatrix * vec4(transformed, 1.0)).xyz;
             #endif
             vFrostN = normalize((vec4(transformedNormal, 0.0) * viewMatrix).xyz);`,
          );
        shader.fragmentShader = shader.fragmentShader
          .replace(
            "#include <common>",
            `#include <common>
             uniform float uFrost;
             uniform float uFrostTime;
             varying vec3 vFrostW;
             varying vec3 vFrostN;
             ${FROST_GLSL}`,
          )
          .replace(
            "#include <dithering_fragment>",
            `if (uFrost > 0.001) {
               // Le givre se pose sur les faces qui regardent le ciel et dans
               // les creux du bruit ; le reste prend une teinte froide.
               float fUp = clamp(vFrostN.y * 0.5 + 0.5, 0.0, 1.0);
               float fN = frostNoise(vFrostW * 5.0);
               float fN2 = frostNoise(vFrostW * 24.0);
               float fMask = smoothstep(0.42, 0.92, fN * 0.55 + fN2 * 0.45 + fUp * 0.3) * uFrost;
               float spark = pow(frostNoise(vFrostW * 70.0), 14.0) * 3.0;
               // Le givre ne fait pas sa propre lumiere : il prend celle que
               // recoit la surface (luminance du pixel eclaire), plus un
               // fond bleu de nuit pour rester lisible dans le noir.
               float lit = clamp(dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114)) * 2.6, 0.0, 1.0);
               vec3 cold = gl_FragColor.rgb * vec3(0.66, 0.8, 1.1) + vec3(0.01, 0.025, 0.06);
               vec3 ice = vec3(0.6, 0.72, 0.88) * (0.22 + 0.78 * lit) * (0.9 + spark);
               vec3 frosted = mix(cold, ice, fMask);
               gl_FragColor.rgb = mix(gl_FragColor.rgb, frosted, uFrost);
             }
             #include <dithering_fragment>`,
          );
      });
    }
  });
}
