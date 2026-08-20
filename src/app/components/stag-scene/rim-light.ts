import { Color, MeshStandardMaterial, type Material, type Object3D } from "three";
import { addShaderModifier } from "./shader-patch";

/**
 * Liseré de lumière (fresnel) sur les matériaux standard d'un objet — retour
 * de Sylvain le 18/08 après audit DA comparé à des sites de référence
 * (Lusion, cf Codex Nahual/memory project-nahual-da) : aucun matériau de la
 * scène n'avait de traitement custom, tout tournait en meshStandardMaterial
 * brut, ce qui se lisait comme une démo Three.js plutôt qu'une direction
 * artistique.
 *
 * Patché via onBeforeCompile (addShaderModifier, cf shader-patch.ts) plutôt
 * qu'un ShaderMaterial reconstruit de zéro : garde tout le PBR
 * (RevealLighting continue de s'appliquer normalement), ajoute juste un
 * terme de bord en plus. Pas de géométrie dupliquée pour une coque fresnel
 * séparée (technique alternative courante) : le cerf est skinné/animé,
 * dupliquer sa géométrie aurait demandé de synchroniser un second squelette
 * — complexité pas justifiée pour cet effet seul.
 *
 * addShaderModifier (pas une assignation directe de onBeforeCompile) :
 * indispensable dès que le même matériau reçoit un autre traitement (le
 * cerf a aussi cursor-reveal.ts, 18/08) — une seconde assignation directe
 * aurait silencieusement écrasé ce liseré.
 */

export type RimLightOptions = {
  color: string;
  power: number;
  intensity: number;
};

const DEFAULT_OPTIONS: RimLightOptions = {
  color: "#ffb35c",
  power: 2.2,
  intensity: 0.6,
};

export type RimLightUniforms = {
  uRimColor: { value: Color };
  uRimIntensity: { value: number };
  uRimPower: { value: number };
};

// Évite de repatcher un matériau déjà traité si plusieurs meshes le
// partagent (courant sur un GLB avec peu de matériaux pour beaucoup de
// pièces) — onBeforeCompile ne doit être posé qu'une fois par matériau.
const patchedMaterials = new WeakSet<Material>();

/**
 * Parcourt `root` et patche chaque MeshStandardMaterial rencontré. Renvoie
 * les uniforms de chaque matériau patché (y compris ceux déjà patchés lors
 * d'un appel précédent, pour rester idempotent) — l'appelant les fait
 * varier lui-même par frame (cf StagModel), pas de useFrame ici : ce module
 * ne connaît pas l'arc de reveal, juste comment brancher l'effet.
 */
export function applyRimLight(
  root: Object3D,
  options: Partial<RimLightOptions> = {},
): RimLightUniforms[] {
  const { color, power, intensity } = { ...DEFAULT_OPTIONS, ...options };
  const allUniforms: RimLightUniforms[] = [];

  root.traverse((child) => {
    const mesh = child as unknown as { material?: Material | Material[] };
    if (!mesh.material) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

    for (const material of materials) {
      if (!(material instanceof MeshStandardMaterial)) continue;

      const uniforms: RimLightUniforms = {
        uRimColor: { value: new Color(color) },
        uRimIntensity: { value: intensity },
        uRimPower: { value: power },
      };
      allUniforms.push(uniforms);

      if (patchedMaterials.has(material)) continue;
      patchedMaterials.add(material);

      addShaderModifier(material, (shader) => {
        shader.uniforms.uRimColor = uniforms.uRimColor;
        shader.uniforms.uRimIntensity = uniforms.uRimIntensity;
        shader.uniforms.uRimPower = uniforms.uRimPower;

        shader.fragmentShader = shader.fragmentShader
          .replace(
            "#include <common>",
            `#include <common>
            uniform vec3 uRimColor;
            uniform float uRimIntensity;
            uniform float uRimPower;`,
          )
          .replace(
            "#include <dithering_fragment>",
            `float rimFresnel = pow(1.0 - saturate(dot(normalize(vNormal), normalize(vViewPosition))), uRimPower);
            gl_FragColor.rgb += uRimColor * rimFresnel * uRimIntensity;
            #include <dithering_fragment>`,
          );
      });
    }
  });

  return allUniforms;
}

/**
 * Fait varier l'intensité du liseré déjà branché (cf applyRimLight) — en
 * fonction séparée plutôt qu'une assignation directe dans le composant
 * appelant : eslint-plugin-react-hooks (compilateur React 19) refuse une
 * mutation directe (`x.y = z`) sur une valeur issue d'un hook dans le corps
 * du composant, mais pas un appel de fonction qui mute en interne — même
 * raison que `clone.scale.setScalar(...)` ailleurs dans ce projet
 * (milpa.tsx, background-flora.tsx) plutôt qu'une assignation.
 */
export function setRimLightIntensity(uniformsList: RimLightUniforms[], intensity: number) {
  for (const uniforms of uniformsList) {
    uniforms.uRimIntensity.value = intensity;
  }
}

// Couleur de repos (doré, DEFAULT_OPTIONS.color ci-dessus) -> jade
// (--jade-bg #00a86b) au climax de "chemins révélés" — retour de Sylvain le
// 20/08 : le jade doit être un signal narratif de la révélation, pas une
// couleur de fond plaquée (cf memory project-nahual-da, étude
// concurrentielle, piste "liseré au climax"). Cohérent avec le nav déjà
// jade au même instant (applyNavEmphasis, stag-scene.tsx) : le jade devient
// LA couleur de la révélation dans tout le site, pas juste ici.
const REST_COLOR = new Color(DEFAULT_OPTIONS.color);
const CLIMAX_COLOR = new Color("#00a86b");

/**
 * Fait varier la couleur du liseré déjà branché — même raison de fonction
 * séparée que setRimLightIntensity ci-dessus (react-hooks/immutability).
 * `climaxBlend` : 0 = doré (repos), 1 = jade (climax) — l'appelant passe
 * `getNavEmphasis(progress)` (déjà la même fenêtre que l'emphase de nav).
 */
export function setRimLightColor(uniformsList: RimLightUniforms[], climaxBlend: number) {
  for (const uniforms of uniformsList) {
    uniforms.uRimColor.value.lerpColors(REST_COLOR, CLIMAX_COLOR, climaxBlend);
  }
}
