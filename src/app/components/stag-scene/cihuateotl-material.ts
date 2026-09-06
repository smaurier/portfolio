import { Color, DoubleSide, MeshBasicMaterial } from "three";

/**
 * La matiere des Cihuateteo (06/09, Ouest) : une silhouette fantomatique.
 * Fresnel large (le corps n'existe que par ses bords), lueur mauve-cendre
 * qui bat lentement, et une DISSOLUTION par le haut : la tete et les
 * epaules se defont en grains emportes vers le ciel (les particules qui
 * s'echappent, cihuateteo.tsx, partent de la). Meme socle que le fresnel
 * d'obsidienne de Xolotl (MeshBasicMaterial + onBeforeCompile : le
 * skinning et les includes de three restent), reglages independants par
 * porteuse. Jamais de visage : la matiere ne dessine rien a l'interieur.
 */
export type CihuateotlUniforms = {
  uPower: { value: number };
  uOpacity: { value: number };
  uTime: { value: number };
  /** Hauteur (0..1 du corps) au-dessus de laquelle la silhouette se defait. */
  uDissolve: { value: number };
  uPhase: { value: number };
  /** Pied (y monde du pied de la porteuse) et hauteur du corps (u) : la
   * dissolution se lit en espace MONDE, l'espace skinne du modele est en
   * centimetres sous un noeud a l'echelle 100. */
  uBaseY: { value: number };
  uHeight: { value: number };
};

export const CIHUATEOTL_COLOR = "#d9c4e6"; // cendre mauve, le crepuscule
export const CIHUATEOTL_EDGE = "#ff9a86"; // corail : le dernier soleil sur les bords

export function createCihuateotlUniforms(phase = 0): CihuateotlUniforms {
  return { uPower: { value: 2.6 }, uOpacity: { value: 0 }, uTime: { value: 0 }, uDissolve: { value: 0.6 }, uPhase: { value: phase }, uBaseY: { value: 0 }, uHeight: { value: 1 } };
}

export function createCihuateotlMaterial(uniforms: CihuateotlUniforms): MeshBasicMaterial {
  const mat = new MeshBasicMaterial({ color: new Color(CIHUATEOTL_COLOR), transparent: true, depthWrite: false, side: DoubleSide, fog: false });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uPower = uniforms.uPower;
    shader.uniforms.uOpacity = uniforms.uOpacity;
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uDissolve = uniforms.uDissolve;
    shader.uniforms.uPhase = uniforms.uPhase;
    shader.uniforms.uBaseY = uniforms.uBaseY;
    shader.uniforms.uHeight = uniforms.uHeight;
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
         uniform float uDissolve;
         uniform float uPhase;
         uniform float uBaseY;
         uniform float uHeight;
         uniform vec3 uEdge;
         varying vec3 vGhostNormal;
         varying vec3 vGhostView;
         varying vec3 vGhostWorld;
         float ghostHash(vec3 p) {
           p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
           p *= 17.0;
           return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
         }`,
      )
      .replace(
        "#include <opaque_fragment>",
        `vec3 N = normalize(vGhostNormal);
         vec3 V = normalize(vGhostView);
         float dotNV = abs(dot(N, V));
         float fresnel = pow(1.0 - dotNV, uPower);
         // Le corps respire lentement, chaque porteuse a son propre souffle.
         float breath = 0.8 + 0.2 * sin(uTime * 0.9 + uPhase);
         // Dissolution par le haut : au-dessus de uDissolve (hauteur locale
         // normalisee 0..1), des grains disparaissent, de plus en plus
         // nombreux vers le cou ; la TETE n'existe jamais (jamais de visage :
         // garde-fou du Codex), elle est partie en grains vers le ciel.
         float h = clamp((vGhostWorld.y - uBaseY) / uHeight, 0.0, 1.0);
         float grain = ghostHash(floor(vGhostWorld * 28.0 + vec3(0.0, -uTime * 3.0, 0.0)));
         float loss = smoothstep(uDissolve, 0.86, h);
         if (grain < loss) discard;
         // Le bord : cendre mauve au coeur du fresnel, corail sur l'arete.
         vec3 ghostCol = mix(diffuse, uEdge, pow(fresnel, 2.0) * 0.6);
         float alpha = fresnel * 0.85 * breath * uOpacity;
         gl_FragColor = vec4(ghostCol, alpha);`,
      );
  };
  return mat;
}
