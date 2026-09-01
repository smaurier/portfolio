import { MeshStandardMaterial, Vector2, type Material, type Object3D } from "three";
import { addShaderModifier } from "./shader-patch";

/**
 * Révélation par curseur : retour de Sylvain le 18/08 : "au départ, tous
 * les éléments doivent être translucides [et en nuances de gris], et avec
 * le mouvement de souris ils vont se révéler petit à petit." Reprend une
 * idée déjà posée dans le Codex Nahual d'origine (17/08, jamais codée
 * jusqu'ici) : "hover = présence locale, scroll = révélation structurelle".
 *
 * Calcul en espace écran (gl_FragCoord), pas en espace monde : un halo qui
 * suit le curseur à l'écran est plus simple et prévisible qu'un rayon
 * projeté en 3D (ambiguïté de profondeur dans une scène avec des objets à
 * des distances très différentes de la caméra).
 *
 * **Garde-fou accessibilité, posé avec Sylvain avant de coder** : ni
 * l'opacité ni la saturation ne tombent à zéro sans mouvement de souris :
 * la scène reste lisible dans son état "reveal=0" (translucide+désaturé,
 * jamais invisible). Un visiteur tactile/clavier/sans mouvement voit une
 * scène toujours là, juste moins "révélée" : jamais un contenu caché
 * derrière un geste obligatoire. L'arc de lumière du scroll (RevealLighting)
 * continue de garantir la visibilité de base indépendamment de cet effet.
 * Portée limitée à la scène 3D (confirmé par Sylvain) : header/footer/nav
 * restent toujours pleinement visibles, même logique que la nav cardinale
 * ("jamais un verrou d'accès").
 *
 * **Plancher piloté par le scroll depuis le 20/08** (retour de Sylvain :
 * "on est encore majoritairement en noir et blanc et transparence à la
 * fin") : avant, MIN_OPACITY/MIN_SATURATION étaient des constantes figées,
 * ce qui contredisait le principe posé dans le Codex Nahual dès le début
 * ("hover = présence locale, scroll = révélation structurelle") : le
 * scroll ne pilotait en réalité jamais cette révélation-là, seul le
 * curseur le faisait : la majorité du cadre restait grise/translucide même
 * à "chemins révélés" si le curseur n'était pas passé dessus. Le plancher
 * remonte maintenant vers 1 avec le même rythme que le reste de l'arc
 * (getRevealFloor) : à "chemins révélés", la scène entière est pleinement
 * révélée par défaut, le curseur ne fait plus qu'accentuer localement
 * pendant les phases plus précoces : jamais de régression du garde-fou
 * d'accessibilité, le plancher ne redescend jamais.
 */

// Valeurs de plancher en tout début de pénombre (progress=0, cf
// setCursorRevealFloor) : mêmes valeurs qu'avant le 20/08, juste plus
// figées : le point de départ de la remontée, pas la seule valeur possible.
const MIN_OPACITY_START = 0.4;
const MIN_SATURATION_START = 0.15;

export type CursorRevealUniforms = {
  uMouse: { value: Vector2 };
  uResolution: { value: Vector2 };
  uRevealRadius: { value: number };
  uMinOpacity: { value: number };
  uMinSaturation: { value: number };
};

/** Un seul jeu d'uniforms partagé par tous les matériaux patchés : la
 * position souris est globale, pas propre à chaque objet (contrairement à
 * rim-light.ts/depth-fade.ts). Muter ces deux Vector2 une fois par frame
 * met à jour tous les matériaux d'un coup, pas besoin de reparcourir une
 * liste.
 *
 * Depuis le 26/08 : singleton module-level, plus un nouvel objet par
 * appel. Retour Sylvain "en navigant d'un onglet à l'autre, le cerf
 * est transparent en fin de scroll" : même bug que rim-light fixé le
 * 25/08 (69d70f2). useGLTF cache la scene entre navigations SPA →
 * `patchedMaterials` (WeakSet) skip les matériaux déjà patchés lors
 * du premier mount → tout mount ultérieur créait de NOUVEAUX uniforms
 * jamais branchés au shader, pendant que setCursorRevealFloor mutait
 * ces uniforms orphelins. Le shader continuait de lire les uniforms
 * du premier mount, jamais actualisés, donc uMinOpacity resté à 0.4
 * même à progress=1 → "cerf transparent en fin de scroll".
 */
let sharedUniforms: CursorRevealUniforms | null = null;
export function createCursorRevealUniforms(): CursorRevealUniforms {
  if (sharedUniforms) return sharedUniforms;
  sharedUniforms = {
    // Hors-écran tant qu'aucun mouvement n'a eu lieu : reveal=0 partout,
    // l'état voulu par Sylvain au chargement : pas une valeur à corriger.
    uMouse: { value: new Vector2(-9999, -9999) },
    uResolution: { value: new Vector2(1, 1) },
    uRevealRadius: { value: 260 },
    uMinOpacity: { value: MIN_OPACITY_START },
    uMinSaturation: { value: MIN_SATURATION_START },
  };
  return sharedUniforms;
}

const patchedMaterials = new WeakSet<Material>();

/**
 * Parcourt `root` et patche chaque MeshStandardMaterial rencontré : via
 * addShaderModifier (shader-patch.ts) pour composer proprement avec un
 * autre traitement déjà posé sur le même matériau (ex. le cerf a aussi
 * rim-light.ts). Idempotent (WeakSet), peut être rappelée chaque frame
 * pour les enfants montés après coup (flore CC0 sous Suspense) : même
 * raison que depth-fade.ts.
 */
export function applyCursorReveal(root: Object3D, uniforms: CursorRevealUniforms): void {
  root.traverse((child) => {
    const mesh = child as unknown as { material?: Material | Material[] };
    if (!mesh.material) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

    for (const material of materials) {
      if (!(material instanceof MeshStandardMaterial)) continue;
      if (patchedMaterials.has(material)) continue;
      patchedMaterials.add(material);

      material.transparent = true;

      addShaderModifier(material, (shader) => {
        shader.uniforms.uMouse = uniforms.uMouse;
        shader.uniforms.uResolution = uniforms.uResolution;
        shader.uniforms.uRevealRadius = uniforms.uRevealRadius;
        shader.uniforms.uMinOpacity = uniforms.uMinOpacity;
        shader.uniforms.uMinSaturation = uniforms.uMinSaturation;

        shader.fragmentShader = shader.fragmentShader
          .replace(
            "#include <common>",
            `#include <common>
            uniform vec2 uMouse;
            uniform vec2 uResolution;
            uniform float uRevealRadius;
            uniform float uMinOpacity;
            uniform float uMinSaturation;`,
          )
          .replace(
            "#include <dithering_fragment>",
            `float distToCursor = distance(gl_FragCoord.xy, uMouse);
            float reveal = 1.0 - smoothstep(0.0, uRevealRadius, distToCursor);
            float cursorGrey = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
            vec3 flooredColor = mix(vec3(cursorGrey), gl_FragColor.rgb, uMinSaturation);
            gl_FragColor.rgb = mix(flooredColor, gl_FragColor.rgb, reveal);
            gl_FragColor.a *= mix(uMinOpacity, 1.0, reveal);
            #include <dithering_fragment>`,
          );
      });
    }
  });
}

/**
 * Fait remonter le plancher (opacité/saturation minimales) avec l'arc de
 * reveal : en fonction séparée plutôt qu'une assignation directe dans le
 * useFrame appelant : même raison react-hooks/immutability que
 * setRimLightIntensity (rim-light.ts). `revealFloor` : 0..1, cf
 * getRevealFloor (reveal-arc.ts) : 0 = plancher de départ (0.4/0.15),
 * 1 = pleinement révélé (1/1), jamais au-delà ni en-deçà.
 */
export function setCursorRevealFloor(uniforms: CursorRevealUniforms, revealFloor: number): void {
  const t = Math.min(1, Math.max(0, revealFloor));
  uniforms.uMinOpacity.value = MIN_OPACITY_START + (1 - MIN_OPACITY_START) * t;
  uniforms.uMinSaturation.value = MIN_SATURATION_START + (1 - MIN_SATURATION_START) * t;
}
