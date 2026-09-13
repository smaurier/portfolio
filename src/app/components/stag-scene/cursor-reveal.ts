import { DoubleSide, MeshStandardMaterial, Vector2, type Material, type Object3D } from "three";
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
  /** Second halo (02/09, Nord, element D de la fiche Mictlampa) : le
   * reflet menteur du tonalli du visiteur, symetrique de la souris par
   * rapport au cerf (en espace ecran). uMirror 0..1 crossfade, 1 au Nord. */
  uMouse2: { value: Vector2 };
  uMirror: { value: number };
  uResolution: { value: Vector2 };
  uRevealRadius: { value: number };
  uMinOpacity: { value: number };
  uMinSaturation: { value: number };
  /** LE BORD DESSINE (13/09, Sylvain : « on a un effet qui fait que l'on a
   * de la couleur lorsqu'on survole, j'aimerais que la couleur se dessine
   * aussi [...] on pourrait alors avoir une forme un peu plus
   * irreguliere »). Amplitude du desordre du bord, en fraction du rayon :
   * la couleur ne s'arrete plus sur un cercle parfait mais sur une frange
   * de fibres, comme une encre qui a bu dans le papier. */
  uRevealWobble: { value: number };
  /** LE TRACE DU CODEX (13/09) : combien le monde est dessine (0 rendu
   * normal, 1 trait d'encre sur papier), jusqu'ou le geste est alle, et
   * dans quel sens (le dessin se pose, ou la couleur revient). L'origine
   * est le disque du miroir, en pixels du framebuffer. Voir lib/theme
   * codexDraw pour la choregraphie, `codex-store` pour le relais. */
  uCodex: { value: number };
  uCodexFront: { value: number };
  uCodexSign: { value: number };
  uCodexOrigin: { value: Vector2 };
  /** Force du trait d'encre qui borde la zone de couleur. Monte avec la
   * face claire (le papier) : sur la nuit, l'encre n'aurait rien a border. */
  uRevealInk: { value: number };
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
    uMouse2: { value: new Vector2(-9999, -9999) },
    uMirror: { value: 0 },
    uResolution: { value: new Vector2(1, 1) },
    uRevealRadius: { value: 260 },
    uMinOpacity: { value: MIN_OPACITY_START },
    uMinSaturation: { value: MIN_SATURATION_START },
    uRevealWobble: { value: 0.22 },
    uCodex: { value: 0 },
    uCodexFront: { value: 0 },
    uCodexSign: { value: 1 },
    uCodexOrigin: { value: new Vector2(0, 0) },
    uRevealInk: { value: 0 },
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
      // Une seule passe pour les materiaux double face (06/09, profil de la
      // page Contact : three rend un materiau transparent DoubleSide en deux
      // passes et pose material.needsUpdate a CHAQUE passe, d'ou une
      // recherche de programme par objet et par image : 11 % du CPU).
      if (material.side === DoubleSide) material.forceSinglePass = true;

      material.transparent = true;

      addShaderModifier(material, (shader) => {
        shader.uniforms.uMouse = uniforms.uMouse;
        shader.uniforms.uMouse2 = uniforms.uMouse2;
        shader.uniforms.uMirror = uniforms.uMirror;
        shader.uniforms.uResolution = uniforms.uResolution;
        shader.uniforms.uRevealRadius = uniforms.uRevealRadius;
        shader.uniforms.uMinOpacity = uniforms.uMinOpacity;
        shader.uniforms.uMinSaturation = uniforms.uMinSaturation;
        shader.uniforms.uRevealWobble = uniforms.uRevealWobble;
        shader.uniforms.uRevealInk = uniforms.uRevealInk;
        shader.uniforms.uCodex = uniforms.uCodex;
        shader.uniforms.uCodexFront = uniforms.uCodexFront;
        shader.uniforms.uCodexSign = uniforms.uCodexSign;
        shader.uniforms.uCodexOrigin = uniforms.uCodexOrigin;

        shader.fragmentShader = shader.fragmentShader
          .replace(
            "#include <common>",
            `#include <common>
            uniform vec2 uMouse;
            uniform vec2 uMouse2;
            uniform float uMirror;
            uniform vec2 uResolution;
            uniform float uRevealRadius;
            uniform float uMinOpacity;
            uniform float uMinSaturation;
            uniform float uRevealWobble;
            uniform float uRevealInk;
            uniform float uCodex;
            uniform float uCodexFront;
            uniform float uCodexSign;
            uniform vec2 uCodexOrigin;
            // Bruit de valeur en espace ecran : la frange du bord. Deux
            // octaves suffisent pour que l'oeil lise « fibre », pas « cercle ».
            float nahualHash(vec2 p) {
              return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
            }
            float nahualNoise(vec2 p) {
              vec2 i = floor(p);
              vec2 f = fract(p);
              f = f * f * (3.0 - 2.0 * f);
              float a = nahualHash(i);
              float b = nahualHash(i + vec2(1.0, 0.0));
              float c = nahualHash(i + vec2(0.0, 1.0));
              float d = nahualHash(i + vec2(1.0, 1.0));
              return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
            }`,
          )
          .replace(
            "#include <dithering_fragment>",
            `// LE BORD QUI A BU (13/09) : la distance au curseur est
            // perturbee par une frange de bruit, donc la couleur ne
            // s'arrete plus sur un cercle. L'amplitude est une fraction du
            // rayon : la frange grandit avec le halo, elle ne se detache
            // jamais de lui.
            vec2 nahualFibre = gl_FragCoord.xy / 46.0;
            float nahualGrain = nahualNoise(nahualFibre) * 0.65 + nahualNoise(nahualFibre * 2.7) * 0.35;
            float nahualFrange = (nahualGrain - 0.5) * uRevealRadius * uRevealWobble;
            float distToCursor = distance(gl_FragCoord.xy, uMouse) + nahualFrange;
            float reveal = 1.0 - smoothstep(0.0, uRevealRadius, distToCursor);
            // Second halo : le reflet menteur du tonalli (Nord), au point
            // symetrique de la souris par rapport au cerf.
            float distToMirror = distance(gl_FragCoord.xy, uMouse2) + nahualFrange;
            float reveal2 = (1.0 - smoothstep(0.0, uRevealRadius, distToMirror)) * uMirror;
            reveal = max(reveal, reveal2);
            float cursorGrey = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
            vec3 flooredColor = mix(vec3(cursorGrey), gl_FragColor.rgb, uMinSaturation);
            // LE PIGMENT SUR LE PAPIER (13/09). Sur la face claire, reveler
            // les couleurs VRAIES d'une scene nocturne faisait une tache
            // sombre autour du curseur (capture). Un pigment pose sur de
            // l'amate ne noircit pas le papier : il le teinte. La couleur
            // revelee est donc lavee vers le papier, sa teinte gardee, sa
            // valeur remontee. Nul sur la nuit : uRevealInk vaut zero.
            vec3 nahualRevele = mix(gl_FragColor.rgb, mix(vec3(0.95, 0.93, 0.88), gl_FragColor.rgb, 0.5), uRevealInk);
            gl_FragColor.rgb = mix(flooredColor, nahualRevele, reveal);
            // LE TRAIT (13/09) : sur le papier, la couleur ne s'arrete pas
            // toute seule, un trait d'encre la borde, comme au Codex. Bande
            // etroite autour de la frontiere, jamais sur la nuit.
            // Bande ETROITE : a 0,34 ce n'etait plus un trait mais une tache
            // qui noircissait tout le halo (capture du 13/09).
            float nahualTrait = (1.0 - smoothstep(0.0, 0.07, abs(reveal - 0.5))) * uRevealInk;
            gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.09, 0.075, 0.12), nahualTrait * 0.16);
            gl_FragColor.a *= mix(uMinOpacity, 1.0, reveal);
            // LE TRACE DU CODEX (13/09) : pendant la ceremonie du miroir, le
            // monde se reduit a son dessin. Le trait suit le bord des
            // volumes (l'angle rasant : c'est la que le tlacuilo pose son
            // encre), le reste devient papier, et la frange de bruit fait
            // trembler la ligne comme une main. Le front part du disque :
            // le dessin se pose vers les bords, la couleur revient de meme.
            if (uCodex > 0.001) {
              float dCodex = distance(gl_FragCoord.xy, uCodexOrigin) / max(1.0, length(uResolution)) * 2.0;
              // Le front n'est pas un compas : il avance comme une main, par
              // avancees et retards, d'ou le meme grain que la frange.
              float nahualBord = smoothstep(uCodexFront - 0.2, uCodexFront, dCodex + (nahualGrain - 0.5) * 0.11);
              float dessine = (uCodexSign > 0.0 ? 1.0 - nahualBord : nahualBord) * uCodex;
              if (dessine > 0.001) {
                vec3 nahualVue = normalize(vViewPosition);
                float rasant = 1.0 - abs(dot(normalize(normal), nahualVue));
                // Seuils larges (13/09, apres capture) : a 0,32-0,86 le
                // monde virait au papier blanc sans trait lisible. Le
                // tlacuilo appuie : la ligne prend des l'angle moyen, et
                // le grain la fait trembler comme une main.
                float trait = smoothstep(0.16, 0.58, rasant + (nahualGrain - 0.5) * 0.22);
                vec3 nahualDessin = mix(vec3(0.95, 0.92, 0.86), vec3(0.07, 0.06, 0.10), trait);
                gl_FragColor.rgb = mix(gl_FragColor.rgb, nahualDessin, dessine);
                gl_FragColor.a = mix(gl_FragColor.a, max(gl_FragColor.a, 0.96), dessine);
              }
            }
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
