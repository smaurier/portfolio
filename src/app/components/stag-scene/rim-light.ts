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

// power 2.2 → 4.5 (26/08 audit Playwright, retour Sylvain "coque
// fresnel serrée") : le liseré devient un bord net plutôt qu'un
// dégradé large qui se lisait comme "cerf doré-lumineux" plutôt que
// "cerf ceint d'un liseré". Intensité 0.6 → 1.0 pour compenser la
// surface éclairée réduite (rim plus serré = moins de pixels touchés,
// il faut plus d'intensité pour rester lisible à l'œil).
const DEFAULT_OPTIONS: RimLightOptions = {
  color: "#ffb35c",
  power: 4.5,
  intensity: 1.0,
};

export type RimLightUniforms = {
  uRimColor: { value: Color };
  uRimIntensity: { value: number };
  uRimPower: { value: number };
  // Teinte diffuse sur tout le corps du cerf (pas juste le liseré fin) —
  // ajoutée le 25/08 (retour Sylvain : "la couleur progressive doit aussi
  // venir sur le cerf"). Partage uRimColor comme cible ; amount séparé du
  // rim (le rim est un effet de bord net, le body tint est un fondu global).
  uBodyTintAmount: { value: number };
  // Intensité des lignes claires sur les angles du modèle low-poly
  // (26/08, retour Sylvain "lignes claires sur tous les angles qui
  // pulsent en cadence avec notre battement"). Détectées via fwidth
  // sur vNormal — les arêtes entre deux faces low-poly ont une
  // discontinuité de normale nette, fwidth (dérivées d'écran) l'attrape.
  // Additif teinte cardinale, pulse partagé (StagModel pilote la valeur).
  uEdgeIntensity: { value: number };
  // Pulse cardiaque brut 0.65..1.0 (26/08 recalibré, retour Sylvain
  // "je voulais quelque chose de mouvant, que la ligne réagisse en
  // fonction de la fréquence de respiration, peut-être jouer sur le
  // colori, la forme"). Séparé d'uEdgeIntensity pour piloter à la fois
  // l'épaisseur (fine en valley → épaisse en peak) et un flash blanc
  // au sommet du battement — la ligne "respire" visuellement, pas
  // juste une intensité modulée.
  uEdgePulse: { value: number };
};

// Stocke les uniforms branchés au shader par material, réutilisés au
// prochain appel d'applyRimLight (idempotent). Corrige un bug 25/08
// (retour Sylvain : "entre deux scènes après changement de page, le
// cerf garde la même teinte") : useGLTF met la scene en cache, donc
// remount de StagModel sur navigation SPA rend applyRimLight sur la
// même instance de materials — l'ancien WeakSet empêchait de
// re-patcher (bien : on veut un seul onBeforeCompile par matériau)
// mais retournait quand même des NOUVEAUX uniforms non branchés au
// shader, donc setRimLightColor/Intensity mutait des objets orphelins
// pendant que le shader continuait de lire les uniforms de la page
// précédente. WeakMap remplace WeakSet : on retourne toujours les
// uniforms effectivement branchés.
const uniformsByMaterial = new WeakMap<Material, RimLightUniforms>();

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

      const existing = uniformsByMaterial.get(material);
      if (existing) {
        // Material déjà patché sur un mount précédent (useGLTF cache
        // la scene entre navigations SPA) : réutilise les uniforms
        // effectivement branchés au shader. L'appelant les mutera au
        // prochain useFrame — la couleur/intensité seront alors ce
        // que la nouvelle page demande (progress=0 après le reset
        // scroll de SceneStage), pas l'état de la page précédente.
        allUniforms.push(existing);
        continue;
      }

      const uniforms: RimLightUniforms = {
        uRimColor: { value: new Color(color) },
        uRimIntensity: { value: intensity },
        uRimPower: { value: power },
        uBodyTintAmount: { value: 0 },
        uEdgeIntensity: { value: 0 },
        uEdgePulse: { value: 0.65 },
      };
      uniformsByMaterial.set(material, uniforms);
      allUniforms.push(uniforms);

      addShaderModifier(material, (shader) => {
        shader.uniforms.uRimColor = uniforms.uRimColor;
        shader.uniforms.uRimIntensity = uniforms.uRimIntensity;
        shader.uniforms.uRimPower = uniforms.uRimPower;
        shader.uniforms.uBodyTintAmount = uniforms.uBodyTintAmount;
        shader.uniforms.uEdgeIntensity = uniforms.uEdgeIntensity;
        shader.uniforms.uEdgePulse = uniforms.uEdgePulse;

        shader.fragmentShader = shader.fragmentShader
          .replace(
            "#include <common>",
            `#include <common>
            uniform vec3 uRimColor;
            uniform float uRimIntensity;
            uniform float uRimPower;
            uniform float uBodyTintAmount;
            uniform float uEdgeIntensity;
            uniform float uEdgePulse;`,
          )
          .replace(
            "#include <dithering_fragment>",
            `// Body tint : la couleur cardinale se dépose progressivement
            // sur tout le corps du cerf avant que le rim (bord net) prenne
            // le relais. Screen blend (1 - (1-a)*(1-b)) plutôt qu'un mix
            // linéaire — retour Sylvain 25/08 : "je trouve la teinte très
            // grossière" — le screen préserve les hautes lumières et
            // dépose la couleur surtout dans les tons foncés/moyens, ce
            // qui se lit comme un glow subtil plutôt qu'une couche de
            // peinture plaquée. Plafond ×0.85 (26/08 audit Playwright,
            // retour Sylvain "cerf plein de couleurs à p=1" — l'ancien
            // plafond ×0.5 gardait un cerf lavé/washed-out au climax).
            vec3 bodyTinted = vec3(1.0) - (vec3(1.0) - gl_FragColor.rgb) * (vec3(1.0) - uRimColor);
            gl_FragColor.rgb = mix(gl_FragColor.rgb, bodyTinted, uBodyTintAmount * 0.12);
            // Body tint plafond 0.12 (28/08 retour Sylvain "couleur
            // trop forte sur les cerfs, redistribuer sur autres
            // éléments"). Historique : 0.85 → 0.7+emissive →
            // 0.5+emissive → 0.25 → 0.12. Le cerf devient témoin de
            // la palette qui l'entoure (ambient light + fog + décor
            // teintés portent la couleur), reste "nahual brun
            // mystique" plutôt que décoration monochrome cardinale.
            // Refs Igloo Inc./Antoine Boneat/Bruno Simon : sujet
            // sobre, environnement porte la couleur.
            // Note : pas de multiply pass en fin (testé le 26/08, retour
            // Sylvain "cerf transparent + uniforme, on ne voit plus les
            // éléments de son corps") — le multiply saturait tellement
            // les tons foncés qu'il écrasait la modulation PBR.
            float rimFresnel = pow(1.0 - saturate(dot(normalize(vNormal), normalize(vViewPosition))), uRimPower);
            gl_FragColor.rgb += uRimColor * rimFresnel * uRimIntensity;
            // Lignes claires sur les angles low-poly (26/08, retour
            // Sylvain : lignes qui respirent, jouent sur le colori et
            // la forme). fwidth(vNormal) capte la discontinuité de
            // normale entre deux fragments voisins.
            //
            // Trois modulations pilotées par uEdgePulse (0.65..1.0
            // formule cardiaque sin^4, cf StagModel/StagAura) :
            //  1. Épaisseur : facteur seuil mix(6, 16, pulse) — ligne
            //     fine en valley, épaisse en peak (la ligne "gonfle").
            //  2. Flash blanc : au sommet du battement (pulse > 0.85)
            //     la couleur mixe vers blanc — bioluminescence pulsée.
            //  3. Intensité globale : multipliée par pulse — la ligne
            //     s'éteint entre deux battements plutôt que rester
            //     égale.
            vec3 edgeDeriv = fwidth(vNormal);
            float edgeThreshold = mix(6.0, 16.0, uEdgePulse);
            float edge = saturate(length(edgeDeriv) * edgeThreshold);
            float flash = saturate((uEdgePulse - 0.85) / 0.15);
            vec3 edgeColor = mix(uRimColor, vec3(1.0), flash * 0.7);
            gl_FragColor.rgb += edgeColor * edge * uEdgeIntensity * uEdgePulse;
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

/**
 * Fait varier le taux de teinte diffuse sur tout le corps — même raison
 * de fonction séparée que setRimLightIntensity (react-hooks/immutability).
 * `blend` : 0 = pas de teinte, 1 = teinte à saturation max (×0.35 dans
 * le shader, cf plafond). Passe getRimColorBlend(progress) en pratique.
 */
export function setBodyTintAmount(uniformsList: RimLightUniforms[], blend: number) {
  for (const uniforms of uniformsList) {
    uniforms.uBodyTintAmount.value = blend;
  }
}

/**
 * Fait varier l'intensité des lignes claires sur les angles low-poly
 * (26/08). L'appelant passe le blend (pas le pulse — celui-ci est
 * appliqué séparément côté shader via uEdgePulse pour piloter la
 * forme et la couleur en plus de l'intensité).
 */
export function setEdgeIntensity(uniformsList: RimLightUniforms[], value: number) {
  for (const uniforms of uniformsList) {
    uniforms.uEdgeIntensity.value = value;
  }
}

/**
 * Pulse cardiaque brut 0..1 (26/08). Le shader s'en sert pour moduler
 * épaisseur (fine → épaisse), colori (cardinal → flash blanc) et
 * intensité globale de la ligne — la ligne "respire" au lieu d'une
 * simple modulation d'intensité.
 */
export function setEdgePulse(uniformsList: RimLightUniforms[], value: number) {
  for (const uniforms of uniformsList) {
    uniforms.uEdgePulse.value = value;
  }
}

// Couleur de repos permanente (doré chaleureux, DEFAULT_OPTIONS.color
// ci-dessus). Interpolée vers une teinte cible (climaxColor) sur la
// fenêtre du rim (getRimColorBlend, cf reveal-arc.ts) — jade par
// défaut, historique home. Depuis le 25/08, teinte cible par direction
// (Codex Nahual section 03, cf memory project-nahual-da) — chaque page
// passe la sienne à StagModel, qui la propage ici.
const REST_COLOR = new Color(DEFAULT_OPTIONS.color);
const DEFAULT_CLIMAX_COLOR = "#00a86b";

// Scratch alloué au module-level (une seule allocation, réutilisée) —
// évite un `new Color` par frame quand la teinte cible varie ; pattern
// déjà utilisé pour les scratchs Vector3/Quaternion dans head-look.ts.
const climaxColorScratch = new Color();

/**
 * Fait varier la couleur du liseré déjà branché — même raison de
 * fonction séparée que setRimLightIntensity ci-dessus
 * (react-hooks/immutability). `climaxBlend` : 0 = REST_COLOR (doré),
 * 1 = `climaxColorHex` (teinte de la direction courante, jade par
 * défaut). L'appelant passe `getRimColorBlend(progress)` (fenêtre
 * 0.5→1.0, plus progressive que l'ancien getNavEmphasis).
 */
export function setRimLightColor(
  uniformsList: RimLightUniforms[],
  climaxBlend: number,
  climaxColorHex: string = DEFAULT_CLIMAX_COLOR,
) {
  climaxColorScratch.set(climaxColorHex);
  for (const uniforms of uniformsList) {
    uniforms.uRimColor.value.lerpColors(REST_COLOR, climaxColorScratch, climaxBlend);
  }
}
