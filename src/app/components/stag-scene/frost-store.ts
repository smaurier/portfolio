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
export const frostStore: { state: FrostState; active: boolean; impulse: number; impact: { x: number; y: number; z: number }; gold: number; rear: number } = {
  state: createFrostState(),
  active: false,
  /** Compteur d'explosions (l'herbe lit, comme xiuhcoatlStore.strikeHit). */
  impulse: 0,
  /** Point d'impact du dard du soleil (monde). */
  impact: { x: 0, y: 1, z: 0 },
  /** L'or dans les gravures de la Piedra apres le lever (0..1). */
  gold: 0,
  /** Le cabre du cerf juste apres l'explosion (0..1). */
  rear: 0,
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
      // Opacite de la glace : le sol et les montagnes restent presque pleins
      // (sinon on voit le vide dessous), le reste est du verre.
      const name = (child.name || "").toLowerCase();
      const alpha = name.includes("ground") ? 0.8 : name === "piedra" ? 0.66 : 0.4;
      addShaderModifier(material, (shader) => {
        shader.uniforms.uFrost = frostUniforms.uFrost;
        shader.uniforms.uFrostTime = frostUniforms.uFrostTime;
        shader.uniforms.uFrostAlpha = { value: alpha };
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
             uniform float uFrostAlpha;
             varying vec3 vFrostW;
             varying vec3 vFrostN;
             ${FROST_GLSL}`,
          )
          .replace(
            "#include <dithering_fragment>",
            // APRES l'inclusion, pas avant (07/09) : les autres modificateurs
            // (desaturation par la profondeur, revelation par curseur)
            // s'inserent AVANT l'inclusion ; en se placant apres, la glace
            // passe toujours en dernier et personne ne la grise.
            `#include <dithering_fragment>
             if (uFrost > 0.001) {
               // Un monde de GLACE (Sylvain, 07/09 : « tous les objets
               // translucides et bleutes, vitres ») : chaque surface devient
               // du verre bleu, le fond passe au travers, les bords se
               // blanchissent (fresnel), quelques paillettes ; un peu de la
               // couleur d'origine reste visible dans l'epaisseur.
               vec3 gV = normalize(cameraPosition - vFrostW);
               float gNV = abs(dot(normalize(vFrostN), gV));
               // Liseree blanc serre (exposant 4), coeur bleu profond : aux angles
               // rasants (sol, herbe) tout devenait blanc neige (essai 07/09).
               float gFres = pow(1.0 - gNV, 4.0);
               float spark = pow(frostNoise(vFrostW * 70.0), 16.0) * 2.0;
               vec3 glass = mix(vec3(0.14, 0.32, 0.6), vec3(0.9, 0.96, 1.0), gFres);
               // La couleur d'origine reste lisible dans l'epaisseur, teintee bleu.
               vec3 through = gl_FragColor.rgb * vec3(0.55, 0.72, 1.0);
               vec3 iced = glass * (0.5 + 0.5 * gFres) + through * 0.45 + vec3(spark);
               gl_FragColor.rgb = mix(gl_FragColor.rgb, iced, uFrost);
               gl_FragColor.a = mix(gl_FragColor.a, uFrostAlpha + (1.0 - uFrostAlpha) * gFres, uFrost);
             }
`,
          );
      });
    }
  });
}
