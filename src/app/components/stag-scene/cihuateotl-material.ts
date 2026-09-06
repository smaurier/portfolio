import { AdditiveBlending, Color, DoubleSide, MeshBasicMaterial, NormalBlending } from "three";

/**
 * Les matieres des Cihuateteo (06/09, Ouest).
 *  - Le CORPS : une silhouette brumeuse. Fresnel large (le corps n'existe
 *    que par ses bords), lueur mauve-cendre qui bat lentement, erosion par
 *    un bruit de valeur 3D anime (pas de polygone lisible), fondu additif.
 *  - Le VISAGE « peint a la chaux » (Primeros Memoriales, cf
 *    docs/da/ouest-sources.md) : litteralement blanc, plat, sans bouche ni
 *    nez (la couleur unie efface tout relief) ; le bandeau est un objet a
 *    part (cihuateteo.tsx).
 * Meme socle que le fresnel de Xolotl (MeshBasicMaterial + onBeforeCompile,
 * le skinning de three reste), reglages par porteuse.
 */
export type CihuateotlUniforms = {
  uPower: { value: number };
  uOpacity: { value: number };
  uTime: { value: number };
  uPhase: { value: number };
  /** Pied (y monde) et hauteur du corps (u) : l'erosion se lit en espace
   * monde, l'espace skinne du modele est en centimetres sous un noeud a
   * l'echelle 100. */
  uBaseY: { value: number };
  uHeight: { value: number };
  /** 0 = entiere, 1 = presque toute partie en brume. */
  uErode: { value: number };
};

export const CIHUATEOTL_COLOR = "#cfb8e0"; // cendre mauve, le crepuscule
export const CIHUATEOTL_EDGE = "#ff9a86"; // corail : le dernier soleil sur les bords
export const CHALK_COLOR = "#e6dbee";

export function createCihuateotlUniforms(phase = 0): CihuateotlUniforms {
  return { uPower: { value: 1.3 }, uOpacity: { value: 0 }, uTime: { value: 0 }, uPhase: { value: phase }, uBaseY: { value: 0 }, uHeight: { value: 1.9 }, uErode: { value: 0.45 } };
}

const NOISE_GLSL = /* glsl */ `
  float ghostHash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float ghostNoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(ghostHash(i), ghostHash(i + vec3(1, 0, 0)), f.x), mix(ghostHash(i + vec3(0, 1, 0)), ghostHash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(ghostHash(i + vec3(0, 0, 1)), ghostHash(i + vec3(1, 0, 1)), f.x), mix(ghostHash(i + vec3(0, 1, 1)), ghostHash(i + vec3(1, 1, 1)), f.x), f.y),
      f.z);
  }
`;

/** Le corps brumeux. */
export function createCihuateotlMaterial(uniforms: CihuateotlUniforms): MeshBasicMaterial {
  const mat = new MeshBasicMaterial({ color: new Color(CIHUATEOTL_COLOR), transparent: true, depthWrite: false, side: DoubleSide, fog: false, blending: AdditiveBlending });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uPower = uniforms.uPower;
    shader.uniforms.uOpacity = uniforms.uOpacity;
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uPhase = uniforms.uPhase;
    shader.uniforms.uBaseY = uniforms.uBaseY;
    shader.uniforms.uHeight = uniforms.uHeight;
    shader.uniforms.uErode = uniforms.uErode;
    shader.uniforms.uEdge = { value: new Color(CIHUATEOTL_EDGE) };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
         varying vec3 vGhostNormal;
         varying vec3 vGhostView;
         varying vec3 vGhostWorld;`,
      )
      .replace(
        "#include <fog_vertex>",
        `#include <fog_vertex>
         vGhostNormal = normalize(transformedNormal);
         vec4 mvGhost = modelViewMatrix * vec4(transformed, 1.0);
         vGhostView = normalize(-mvGhost.xyz);
         vGhostWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
         uniform float uPower;
         uniform float uOpacity;
         uniform float uTime;
         uniform float uPhase;
         uniform float uBaseY;
         uniform float uHeight;
         uniform float uErode;
         uniform vec3 uEdge;
         varying vec3 vGhostNormal;
         varying vec3 vGhostView;
         varying vec3 vGhostWorld;
         ${NOISE_GLSL}`,
      )
      .replace(
        "#include <opaque_fragment>",
        `vec3 N = normalize(vGhostNormal);
         vec3 V = normalize(vGhostView);
         float dotNV = abs(dot(N, V));
         float fresnel = pow(1.0 - dotNV, uPower);
         float breath = 0.8 + 0.2 * sin(uTime * 0.9 + uPhase);
         // Brume : un bruit 3D lent ronge le corps, plus fort vers le haut
         // (la silhouette se defait en montant) et la ou elle est de face
         // (le fresnel seul tient les bords).
         float h = clamp((vGhostWorld.y - uBaseY) / uHeight, 0.0, 1.0);
         float n = ghostNoise(vGhostWorld * 3.5 + vec3(uPhase, -uTime * 0.35, uTime * 0.2));
         float n2 = ghostNoise(vGhostWorld * 9.0 + vec3(-uTime * 0.6, uTime * 0.9, uPhase));
         float mist = smoothstep(0.35, 0.75, n * 0.7 + n2 * 0.3);
         float body = fresnel * 0.9 + 0.22;
         float alpha = body * mix(1.0, mist, uErode + 0.25 * h) * breath * uOpacity;
         vec3 ghostCol = mix(diffuse, uEdge, pow(fresnel, 2.0) * 0.55);
         gl_FragColor = vec4(ghostCol * alpha, alpha);`,
      );
  };
  return mat;
}

/** Le visage a la chaux : blanc, plat, sans trait. */
export function createChalkMaterial(uniforms: CihuateotlUniforms): MeshBasicMaterial {
  const mat = new MeshBasicMaterial({ color: new Color(CHALK_COLOR), transparent: true, depthWrite: false, fog: false, blending: NormalBlending });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uOpacity = uniforms.uOpacity;
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uPhase = uniforms.uPhase;
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n uniform float uOpacity;\n uniform float uTime;\n uniform float uPhase;`)
      .replace(
        "#include <opaque_fragment>",
        `float breath = 0.85 + 0.15 * sin(uTime * 0.9 + uPhase);
         gl_FragColor = vec4(diffuse, min(1.0, uOpacity * 1.05) * breath);`,
      );
  };
  return mat;
}
