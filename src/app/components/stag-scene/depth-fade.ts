import { MeshStandardMaterial, Vector3, type Material, type Object3D } from "three";
import { FIRE_GRADE } from "@/lib/fire-grade";
import { addShaderModifier } from "./shader-patch";

/**
 * Perspective atmosphérique : retour de Sylvain le 18/08 : "plus on est
 * loin et plus ça devient gris, comme en peinture" (désaturation par
 * profondeur, technique classique du paysage peint). Même mécanisme que
 * rim-light.ts (onBeforeCompile sur vViewPosition, déjà disponible dans le
 * shader standard three.js), mais purement géométrique : aucune mise à
 * jour par frame nécessaire côté JS : vViewPosition dépend déjà de la
 * position caméra à chaque frame, recalculé côté GPU.
 *
 * Désature vers le gris de LUMINANCE du pixel (pas une teinte grise fixe) :
 * garde la valeur tonale propre de chaque élément plutôt que d'aplatir
 * tout vers un même gris uniforme, plus fidèle à l'effet peint recherché.
 *
 * Volontairement pas appliqué au cerf (cf StagModel, rim-light.ts à la
 * place) : le sujet doit rester net et coloré, c'est l'environnement (sol,
 * montagnes, flore de fond) qui doit reculer visuellement : même principe
 * que "le sujet ne doit jamais être noyé" déjà posé pour le post-processing.
 *
 * addShaderModifier (shader-patch.ts, pas une assignation directe de
 * onBeforeCompile) : indispensable depuis que cursor-reveal.ts (18/08)
 * s'applique aussi à l'environnement : sans ça, la seconde assignation
 * aurait silencieusement écrasé cette désaturation par profondeur.
 *
 * 08/09 — AU CENTRE, L'ORIGINE CHANGE. Ce n'est plus la distance à la
 * caméra qui retire la couleur mais la distance au FOYER : la couleur est
 * le tonalli que le feu donne (cf lib/fire-grade pour le contrat et les
 * sources). Même mélange vers le gris de luminance, même varying, un seul
 * uniform de plus mis à jour une fois par image : la position du foyer en
 * espace caméra. Elle REMPLACE la désaturation par la caméra au Centre
 * (mix, pas somme, sinon les deux dégradés se battent) et se plafonne,
 * sinon la périphérie vire au gris complet et se lit comme un bug.
 */

/**
 * Uniforms partagés PAR RÉFÉRENCE avec tous les matériaux patchés (même
 * idiome que frostUniforms) : une seule écriture par image met à jour toute
 * la scène, quel que soit le nombre de matériaux.
 *
 * Exposés sur window pour pouvoir régler `far` et `cap` à l'œil depuis la
 * console sans rebuild : `__nahualFire.uFireFar.value = 20`.
 */
export const fireGradeUniforms = {
  /** Position du foyer en ESPACE CAMÉRA. Écrite par EnvironmentDepthFade. */
  uFireHearthView: { value: new Vector3() },
  /** 1 au Centre, 0 ailleurs, crossfadé comme les autres blends du rig. */
  uFireBlend: { value: 0 },
  uFireNear: { value: FIRE_GRADE.near },
  uFireFar: { value: FIRE_GRADE.far },
  uFireCap: { value: FIRE_GRADE.cap },
};

if (typeof window !== "undefined") {
  (window as unknown as { __nahualFire?: unknown }).__nahualFire = fireGradeUniforms;
}

export type DepthFadeOptions = {
  /** Distance caméra<->fragment en-deçà de laquelle rien n'est désaturé. */
  near: number;
  /** Distance au-delà de laquelle la désaturation est complète. */
  far: number;
};

const DEFAULT_OPTIONS: DepthFadeOptions = {
  near: 6,
  far: 20,
};

const patchedMaterials = new WeakSet<Material>();

/**
 * Parcourt `root` et patche chaque MeshStandardMaterial rencontré.
 * Idempotent (WeakSet) : peut être rappelée chaque frame sans coût
 * significatif : nécessaire ici parce que certains enfants (flore CC0,
 * Suspense) montent après le premier rendu, même raison documentée pour le
 * recadrage par bounding box ailleurs dans ce projet (background-flora.tsx).
 */
export function applyDepthFade(root: Object3D, options: Partial<DepthFadeOptions> = {}) {
  const { near, far } = { ...DEFAULT_OPTIONS, ...options };

  root.traverse((child) => {
    const mesh = child as unknown as { material?: Material | Material[] };
    if (!mesh.material) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

    for (const material of materials) {
      if (!(material instanceof MeshStandardMaterial)) continue;
      if (patchedMaterials.has(material)) continue;
      patchedMaterials.add(material);

      addShaderModifier(material, (shader) => {
        shader.uniforms.uDepthFadeNear = { value: near };
        shader.uniforms.uDepthFadeFar = { value: far };
        // Par référence : ces cinq-là sont pilotés pour toute la scène
        // depuis EnvironmentDepthFade, pas matériau par matériau.
        shader.uniforms.uFireHearthView = fireGradeUniforms.uFireHearthView;
        shader.uniforms.uFireBlend = fireGradeUniforms.uFireBlend;
        shader.uniforms.uFireNear = fireGradeUniforms.uFireNear;
        shader.uniforms.uFireFar = fireGradeUniforms.uFireFar;
        shader.uniforms.uFireCap = fireGradeUniforms.uFireCap;

        shader.fragmentShader = shader.fragmentShader
          .replace(
            "#include <common>",
            `#include <common>
            uniform float uDepthFadeNear;
            uniform float uDepthFadeFar;
            uniform vec3 uFireHearthView;
            uniform float uFireBlend;
            uniform float uFireNear;
            uniform float uFireFar;
            uniform float uFireCap;`,
          )
          .replace(
            "#include <dithering_fragment>",
            `float depthFadeT = smoothstep(uDepthFadeNear, uDepthFadeFar, length(vViewPosition));
            if (uFireBlend > 0.001) {
              // vViewPosition vaut -mvPosition.xyz : la position du fragment
              // en espace vue est donc son oppose. On mesure la distance au
              // FOYER et non a la camera (branchement sur uniform : aucune
              // divergence entre fragments, cout nul hors du Centre).
              float fireDist = length(-vViewPosition - uFireHearthView);
              float fireT = smoothstep(uFireNear, uFireFar, fireDist) * uFireCap;
              // mix et non addition : au Centre le feu REMPLACE la camera.
              depthFadeT = mix(depthFadeT, fireT, uFireBlend);
            }
            float depthFadeGrey = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
            gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(depthFadeGrey), depthFadeT);
            #include <dithering_fragment>`,
          );
      });
    }
  });
}
