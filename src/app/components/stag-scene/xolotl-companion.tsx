"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import { AdditiveBlending, AnimationMixer, Color, DoubleSide, MeshBasicMaterial, MeshStandardMaterial, ShaderMaterial, type Group, type Mesh, type PointLight, type Texture } from "three";
import { applyRimLight, setBodyTintAmount, setEdgeIntensity, setEdgePulse, setNorthDark, setRimLightColor, setRimLightIntensity, type RimLightUniforms } from "./rim-light";
import { clone as cloneSkinnedScene } from "three/examples/jsm/utils/SkeletonUtils.js";
import { isBot } from "@/lib/is-bot";
import { getTerrainHeight } from "@/lib/terrain-height";
import { useReadingMode } from "@/lib/reading-mode-context";
import type { DirectionKey } from "./direction-colors";
import { useCurrentDirection } from "./use-current-direction";
import { TEZCATL_EXTENT, tezcatlStore } from "./tezcatl-store";

/**
 * XolotlCompanion (29/08). Xolotl, chien-frère jumeau de Quetzalcoatl,
 * guide silencieux des âmes vers Mictlán. Traverse rarement la scène,
 * de gauche à droite, en fond derrière le cerf. Signature « le chien
 * du crépuscule », rareté renforce le sens (il vient quand il veut).
 *
 * Probabilité de spawn par direction (session-based) :
 *  - jade (Centre) : 0 % (jamais sur la home)
 *  - dore / turquoise / cendre / codex : 15 %
 *  - obsidienne (Nord / Mémoire) : 40 % : c'est justement le chemin
 *    vers Mictlán, présence renforcée
 *
 * Timing d'apparition :
 *  - 1ère fois (jamais vu complètement) : 10 s après nav sur page
 *  - 2ème+ fois (vu au moins une fois) : 15 s
 *
 * Considéré « vu complètement » si l'anim traverse est jouée en
 * entier ET si document.visibilityState === "visible" au endTime.
 * Sinon prochain spawn traité comme première fois (retry rapide).
 *
 * Skip complet si :
 *  - isBot() (Lighthouse, crawlers)
 *  - mode récit accessible actif (canvas démonté)
 *  - prefers-reduced-motion (troubles vestibulaires)
 *
 * Mesh : Wolf.glb Quaternius (CC0, 1962 tris, rigged + 12 animations
 * dont Walk). Source :
 * https://raw.githubusercontent.com/trebeljahr/quaternius-showcase/main/public/glb/animals_pack/Wolf.glb
 * Silhouette maigre quadrupède + oreilles pointues erectes ~= Xolo
 * à distance semi-transparente. Matériaux originaux overrides par
 * MeshBasicMaterial obsidienne semi-transparent (aucun coût lumière,
 * signature ombre-fantomatique cohérente ambiance nocturne).
 * Attribution CC0 dans le footer credits (page /credits).
 */

const DIRECTION_SPAWN_PROBABILITY: Record<DirectionKey, number> = {
  jade: 0,
  dore: 0.15,
  turquoise: 0.15,
  cendre: 0.15,
  // 0.4 -> 1 (03/09, retour Sylvain "cela fait tres longtemps que je n'ai
  // pas vu Xolotl") : le Mictlan est son royaume, il y passe toujours.
  obsidienne: 1,
};

const APPEAR_DELAY_FIRST_MS = 10_000;
const APPEAR_DELAY_REPEAT_MS = 15_000;
const FADE_MS = 3_000;
// TRAVERSE ralenti (retour user 29/08 \"il glisse malgre l'idle\") :
// 9s → 14s. Vitesse deplacement ~1.3 u/s (au lieu de 2 u/s), plus
// coherent avec la vitesse de foulee du walk cycle Wolf.glb natif.
const TRAVERSE_MS = 14_000;
const TOTAL_MS = FADE_MS * 2 + TRAVERSE_MS; // 20 s

// Amplitude X (29/08 iter 7 : ligne droite retour user "pas partir
// derriere colline"). Traverse pure lateraie.
const START_X = -9;
const END_X = 9;

// Z fixe (retire arc + terrain follow) : chien marche en ligne droite
// a distance constante. Disparition naturelle par fade in/out
// uniquement, plus par occlusion terrain.
const Z_DEPTH = -10;
/** Au Nord (03/09, retour Sylvain "passer encore plus proche de la
 * margelle, voire dans l'eau juste derriere le cerf") : Xolotl traverse
 * le bassin, les pattes dans l'eau, juste derriere le cerf. Le passeur
 * du Chiconahuapan traverse le fleuve, c'est litteralement son role. */
const Z_DEPTH_NORTH = -1.5;
/** Traitement du Nord (03/09, go Sylvain, fidele a la mythologie : Xolotl,
 * jumeau de Quetzalcoatl et etoile du soir, guide le Soleil a travers
 * l'inframonde chaque nuit) :
 *  1. corps d'OBSIDIENNE opaque, le meme velours noir a sheen violet que
 *     le cerf noir (rim-light uNorthDark), fini le fantome de fresnel
 *     ("bien trop transparent par rapport a la scene") ;
 *  2. la BRAISE qu'il porte : une lumiere chaude cempasuchil attachee a
 *     lui, qui eclaire l'eau, la margelle et les fleurs a son passage,
 *     le Soleil escorte dans la nuit ;
 *  3. les ONDES a ses pattes : il traverse le fleuve, l'eau reagit. */
const EMBER_COLOR = "#ff8a1a";
const EMBER_INTENSITY = 9;
const EMBER_DISTANCE = 7;
// Pas dans l'eau (03/09 bis, retour Sylvain "on ne voit pas son sillage
// ni l'impact de ses pas, beaucoup trop timide") : une vraie empreinte
// par pas, cadence de marche, pattes alternees gauche/droite.
// 03/09 ter, retour Sylvain "pas une diffusion en anneaux, un vrai
// sillage qui vient de l'avant" : source CONTINUE a l'avant du museau
// (une petite goutte par frame). Le simulateur d'ondes fait le reste :
// Xolotl (0.72 u/s au Nord) va plus vite que l'onde (~0.6 u/s), la
// superposition des fronts forme un V de proue, un vrai sillage. Les
// pas restent, plus discrets, pour la texture.
const BOW_AMOUNT = 0.028;
const BOW_AHEAD = 0.45;
const STEP_EVERY_S = 0.32;
const STEP_AMOUNT = 0.07;
const STEP_SIDE = 0.18;
const POOL_RADIUS = 6.4;

// Peak opacity fresnel : 1.0 sur edges via shader (bord opaque),
// centre transparent. C'est la variable qui module la globale
// d'ensemble (fade in/out uniquement).
const PEAK_OPACITY = 1.0;

// Terrain follow (29/08 iter 9 retour user "il doit suivre le sol
// et ne pas s'enfoncer dedans"). A Z=-10 le sol sculpte via
// getTerrainHeight peut monter/descendre (dunes + montagnes). On
// echantillonne Y a chaque frame pour poser les pattes dessus.
// Wolf.glb origin ~pieds → Y_FOOT_OFFSET faible corrige eventuelle
// derive d'ancrage.
const Y_FOOT_OFFSET = 0;

const XOLOTL_COLOR = "#6b3fa8"; // Obsidienne violet nocturne

// Taille reelle (retour user 29/08 "chien ne devrait arriver qu'a la
// fin des pattes du cerf" : anatomiquement correct Xolo vs cerf =
// ratio ~0.35). Le vrai Xolo Fab.com mesh est plus compact que le
// Wolf Quaternius (bbox hauteur 1.19 vs 2.70) : scale releve pour
// conserver la meme presence apparente que Wolf@0.35 (world height
// ~0.94 unit, tiers taille cerf central ~1.5 unit).
const XOLOTL_SCALE = 0.85;

// Nom de l'animation Walk. Xolo Fab.com (hairless_mexican_dog) expose
// "Walk" sans prefixe d'armature (converter Fab renomme les clips).
// L'ancien Wolf.glb Quaternius utilisait "AnimalArmature|Walk".
const WALK_ANIM = "Walk";

// TimeScale walk anim. Le clip Walk du Xolo Fab dure 0.9s natif (vs
// 1.04s pour le Wolf) donc la cadence est deja 14% plus rapide sans
// boost. timeScale=1.0 = pas de boost, cadence naturelle proche de la
// vitesse de traverse (1.28 u/s). Wolf avait besoin de 1.3x parce que
// son cycle etait plus lent. Baisser encore si "trop rapide" persiste.
const WALK_TIME_SCALE = 1.0;

// Preload GLB (drei helper) : chargement au premier render du site,
// évite délai lag au premier spawn.
useGLTF.preload("/models/xolotl.glb");

// Uniforms halo : type + helper de mutation. Passe par une fonction
// plutot qu'une assignation directe dans useFrame, sinon
// react-hooks/immutability (React 19 compilateur) refuse la mutation
// d'une valeur issue d'un hook : meme pattern que setRimLightIntensity
// dans rim-light.ts.
type HaloUniforms = {
  uColor: { value: Color };
  uOpacity: { value: number };
  uPulse: { value: number };
};

function setHaloUniforms(uniforms: HaloUniforms, opacity: number, pulse: number) {
  uniforms.uOpacity.value = opacity;
  uniforms.uPulse.value = pulse;
}

/** Opacite du corps d'obsidienne (Nord) : mutation isolee dans une
 * fonction (react-hooks/immutability), meme pattern que setCoreOpacity. */
function setMaterialOpacity(mat: MeshStandardMaterial, opacity: number) {
  mat.opacity = opacity;
}

/** Habille les meshes de Xolotl : fresnel fantome partout, obsidienne
 * velours au Nord (rim-light uNorthDark). Retourne les uniforms rim du
 * Nord (vides ailleurs). Fonction hors composant : c'est elle qui mute
 * la scene, pas l'effet. */
function dressXolotl(root: Group, north: boolean, obsidian: MeshStandardMaterial, fresnel: MeshBasicMaterial): RimLightUniforms[] {
  root.traverse((child) => {
    const mesh = child as Mesh;
    if (!mesh.isMesh) return;
    // Object_8 (138 verts, seule sous-mesh interne du GLB Xolo Fab) =
    // dents/langue/gencives : invisible, sinon le fresnel les eclaire
    // comme des aretes dans la gueule ouverte pendant le walk cycle.
    if (mesh.name === "Object_8") {
      mesh.visible = false;
      return;
    }
    mesh.material = north ? obsidian : fresnel;
    mesh.renderOrder = 999;
    // Au Nord, hors de portee des lumieres (couche 2, les lumieres sont
    // sur la couche 0) : la braise qu'il porte ne l'eclaire pas lui-meme
    // (sinon il ressortait pale, capture 03/09). Corps noir pur, seul le
    // liseret fresnel (calcule dans le shader, sans lumiere) le dessine.
    if (north) mesh.layers.set(2);
    else mesh.layers.set(0);
  });
  if (!north) return [];
  // Liseret violet SOMBRE et serre (03/09 : en "#8a7fb0" large il ressortait
  // blanc-lavande, capture) : corps d'obsidienne, bord discret.
  const uniforms = applyRimLight(root, { color: "#4a3a78", power: 4.5, intensity: 0.6 });
  setNorthDark(uniforms, 1);
  setRimLightColor(uniforms, 1, "#4a3a78");
  setRimLightIntensity(uniforms, 0.75);
  setBodyTintAmount(uniforms, 0);
  setEdgeIntensity(uniforms, 0.45);
  return uniforms;
}

function setCoreOpacity(core: Mesh, opacity: number) {
  const mat = core.material as MeshBasicMaterial;
  mat.opacity = opacity;
}

// Uniforms fresnel : structure partagee entre l'instance primaire et
// l'afterimage. Chaque instance a son propre jeu d'uniforms pour piloter
// l'opacite independamment.
type FresnelUniforms = {
  uPower: { value: number };
  uBoost: { value: number };
  uOpacity: { value: number };
  uTime: { value: number };
};

function setFresnelUniform(uniforms: FresnelUniforms, key: "uOpacity" | "uTime", value: number) {
  uniforms[key].value = value;
}

// Factory : cree un MeshBasicMaterial fresnel obsidienne avec le meme
// shader partout, mais un jeu d'uniforms independant. Permet d'avoir la
// silhouette primaire et l'afterimage avec des opacites decouplees.
function createFresnelMaterial(uniforms: FresnelUniforms): MeshBasicMaterial {
  const mat = new MeshBasicMaterial({
    color: new Color(XOLOTL_COLOR),
    transparent: true,
    depthWrite: false,
    fog: false,
  });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uPower = uniforms.uPower;
    shader.uniforms.uBoost = uniforms.uBoost;
    shader.uniforms.uOpacity = uniforms.uOpacity;
    shader.uniforms.uTime = uniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
         varying vec3 vFresnelNormal;
         varying vec3 vFresnelView;`,
      )
      .replace(
        "#include <fog_vertex>",
        `#include <fog_vertex>
         vFresnelNormal = normalize(transformedNormal);
         vec4 mvPosXolotl = modelViewMatrix * vec4(transformed, 1.0);
         vFresnelView = normalize(-mvPosXolotl.xyz);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
         uniform float uPower;
         uniform float uBoost;
         uniform float uOpacity;
         uniform float uTime;
         varying vec3 vFresnelNormal;
         varying vec3 vFresnelView;`,
      )
      .replace(
        "#include <opaque_fragment>",
        `vec3 N = normalize(vFresnelNormal);
         vec3 V = normalize(vFresnelView);
         float dotNV = abs(dot(N, V));
         float fresnelR = pow(1.0 - dotNV, uPower * 0.85);
         float fresnelG = pow(1.0 - dotNV, uPower);
         float fresnelB = pow(1.0 - dotNV, uPower * 1.15);
         float fresnel = fresnelG;
         float heartRate = 0.5;
         float phase = uTime * heartRate * 6.2831;
         float pulse = 0.75 + 0.25 * smoothstep(-0.2, 0.6, sin(phase));
         float scan = 0.75 + 0.25 * sin(gl_FragCoord.y * 0.35 - uTime * 2.0);
         float fresnelMod = fresnel * pulse * scan;
         if (fresnelMod < 0.22) discard;
         vec3 finalXolotlCol = diffuse * (1.0 + fresnelG * uBoost);
         finalXolotlCol.r += (fresnelR - fresnelG) * uBoost * 0.6;
         finalXolotlCol.b += (fresnelB - fresnelG) * uBoost * 0.6;
         finalXolotlCol *= pulse * scan;
         gl_FragColor = vec4(finalXolotlCol, fresnelMod * uOpacity);`,
      );
  };
  return mat;
}

// Delai temporel de l'afterimage (ms). Court : ~150 ms = ~1/6 de cycle
// walk, silhouette qui "traine" juste derriere la primaire. Trop long
// (>500ms) = deux chiens distincts au lieu d'un afterimage.

/** Le REFLET DE BRAISE de Xolotl (03/09, Sylvain : "le reflet de Xolotl
 * est un Xolotl de braise, ca renforce que le reflet n'est pas fidele au
 * Mictlan"). Meme mensonge que le reflet du cerf : la nappe ne rend pas
 * ce qui la surplombe. Le vivant est d'obsidienne froide, son reflet
 * brule : le Soleil qu'il escorte dans la nuit se voit dans l'eau, pas
 * sur lui.
 *
 * Implementation : le clone anime (SkeletonUtils) suit Xolotl a la meme
 * place et le miroir se fait DANS LE VERTEX SHADER (Y du monde replie
 * sous le plan), jamais par un scale negatif d'ancetre : le skinning ne
 * survit pas au flip de hierarchie (genese du 01/09 dans stag-mirror).
 * Profondeur tassee (MIRROR_DEPTH_SCALE) et plan comme le cerf, pour que
 * les deux reflets partagent la meme eau. */
const EMBER_MIRROR_PLANE_Y = -0.2;
const EMBER_MIRROR_DEPTH_SCALE = 0.7; // moins tasse que le cerf (0.5) : un chien est bas, il faut que la silhouette se lise
const EMBER_MIRROR_RADIUS = 6.4; // WATER_RADIUS : le reflet vit dans le bassin
const EMBER_MIRROR_CONTACT_DEPTH = 0.35 * EMBER_MIRROR_DEPTH_SCALE;
const EMBER_MIRROR_REFRACT = 0.4; // meme dose que le reflet du cerf (3.0 : le sillage de proue l'etirait en flaque, capture 03/09)

type EmberMirrorUniforms = {
  uOpacity: { value: number };
  uTime: { value: number };
  uRipple: { value: Texture };
  uTexel: { value: number };
};

function setEmberMirror(uniforms: EmberMirrorUniforms, opacity: number, time: number) {
  uniforms.uOpacity.value = opacity;
  uniforms.uTime.value = time;
  uniforms.uRipple.value = tezcatlStore.ripple;
  uniforms.uTexel.value = tezcatlStore.rippleTexel;
}

function createEmberMirrorMaterial(uniforms: EmberMirrorUniforms): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      ...uniforms,
      uPlaneY: { value: EMBER_MIRROR_PLANE_Y },
      uDepthScale: { value: EMBER_MIRROR_DEPTH_SCALE },
      uRadius: { value: EMBER_MIRROR_RADIUS },
      uContactDepth: { value: EMBER_MIRROR_CONTACT_DEPTH },
      uExtent: { value: TEZCATL_EXTENT },
      uRefract: { value: EMBER_MIRROR_REFRACT },
    },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    side: DoubleSide,
    vertexShader: `
      #include <common>
      #include <skinning_pars_vertex>
      uniform sampler2D uRipple;
      uniform float uTexel;
      uniform float uExtent;
      uniform float uRefract;
      uniform float uPlaneY;
      uniform float uDepthScale;
      varying vec3 vWorldPos;
      varying vec3 vLocal;
      void main() {
        #include <skinbase_vertex>
        #include <begin_vertex>
        #include <skinning_vertex>
        vLocal = transformed;
        vec4 world = modelMatrix * vec4(transformed, 1.0);
        // Miroir sous le plan de l'eau, profondeur tassee.
        world.y = uPlaneY - (world.y - uPlaneY) * uDepthScale;
        // Les ondes de la nappe refractent le reflet (gradient de hauteur).
        vec2 suv = world.xz / (2.0 * uExtent) + 0.5;
        float hL = texture2D(uRipple, suv - vec2(uTexel, 0.0)).x;
        float hR = texture2D(uRipple, suv + vec2(uTexel, 0.0)).x;
        float hB = texture2D(uRipple, suv - vec2(0.0, uTexel)).x;
        float hT = texture2D(uRipple, suv + vec2(0.0, uTexel)).x;
        world.xz += vec2(hR - hL, hT - hB) * uRefract;
        vWorldPos = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      uniform float uTime;
      uniform float uPlaneY;
      uniform float uRadius;
      uniform float uContactDepth;
      varying vec3 vWorldPos;
      varying vec3 vLocal;
      float hash3(vec3 p) {
        p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }
      float vnoise(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(mix(hash3(i), hash3(i + vec3(1, 0, 0)), f.x), mix(hash3(i + vec3(0, 1, 0)), hash3(i + vec3(1, 1, 0)), f.x), f.y),
          mix(mix(hash3(i + vec3(0, 0, 1)), hash3(i + vec3(1, 0, 1)), f.x), mix(hash3(i + vec3(0, 1, 1)), hash3(i + vec3(1, 1, 1)), f.x), f.y),
          f.z);
      }
      void main() {
        // Dans le bassin seulement, bord doux.
        float mask = 1.0 - smoothstep(uRadius - 0.6, uRadius, length(vWorldPos.xz));
        // Ligne de contact brouillee : le reflet emerge en s'eloignant du plan.
        float contact = smoothstep(uPlaneY, uPlaneY - uContactDepth, vWorldPos.y);
        // Braise : veines chaudes qui montent lentement dans le corps (espace
        // local, la braise suit la marche), crepitement fin par-dessus.
        float veins = vnoise(vLocal * 5.0 + vec3(0.0, -uTime * 0.5, 0.0));
        float crackle = vnoise(vLocal * 16.0 + vec3(uTime * 0.35, 0.0, -uTime * 0.2));
        float glow = smoothstep(0.42, 0.88, veins * 0.65 + crackle * 0.35);
        float flicker = 0.85 + 0.15 * sin(uTime * 6.0 + veins * 25.0);
        // Charbon sombre veine de braise : le bloom ne doit embraser que
        // les veines, jamais la silhouette entiere (flaque jaune, capture 03/09).
        // Base rouge sombre LISIBLE sur l'eau noire (0.14 : seules les veines
        // restaient, tache, capture 03/09), veines orange, pointes chaudes rares.
        vec3 col = mix(vec3(0.5, 0.09, 0.01), vec3(0.9, 0.38, 0.05), glow) * flicker;
        col += vec3(1.0, 0.72, 0.35) * pow(glow, 5.0) * 0.25;
        float a = uOpacity * mask * contact * (0.7 + 0.3 * glow);
        if (a < 0.002) discard;
        gl_FragColor = vec4(col, a);
      }
    `,
  });
}

const AFTERIMAGE_DELAY_MS = 180;
// Multiplier d'opacite pour l'afterimage vs primaire (fantome plus
// tenu, moins present). 0.35 = discret mais visible.
const AFTERIMAGE_OPACITY_MULT = 0.35;


export default function XolotlCompanion() {
  const direction = useCurrentDirection();
  // Au Nord (03/09, retour Sylvain "il marche peut-etre trop vite") : il
  // passe pres de la camera, la meme vitesse parait double. Traversee
  // x1.8 et cadence de marche divisee d'autant (sinon les pattes glissent).
  const northSlow = direction === "obsidienne" ? 1.8 : 1;
  const traverseMs = TRAVERSE_MS * northSlow;
  const totalMs = FADE_MS * 2 + traverseMs;
  const walkTimeScale = WALK_TIME_SCALE / northSlow;
  const readingMode = useReadingMode();
  const groupRef = useRef<Group>(null);
  const coreRef = useRef<Mesh>(null);
  const haloRef = useRef<Mesh>(null);
  // useMemo (pas useRef.current) pour eviter la regle react-hooks/refs
  // de React 19 : "Cannot access refs during render". Meme lifecycle
  // qu'un useRef (cree une fois, jamais recree), sans acces .current
  // pendant le render.
  const haloUniforms = useMemo(
    () => ({
      uColor: { value: new Color("#c880ff") },
      uOpacity: { value: 0 },
      uPulse: { value: 1 },
    }),
    [],
  );
  const [spawn, setSpawn] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const alreadyWitnessed = useMemo(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("nahual-xolotl-witnessed") === "1";
  }, []);

  const { scene, animations } = useGLTF("/models/xolotl.glb");
  const { actions } = useAnimations(animations, groupRef);

  // Clone du scene pour l'afterimage (silhouette dedoublee qui suit
  // avec un delai temporel). SkeletonUtils.clone gere proprement les
  // SkinnedMesh + Skeleton (deep clone du rig, pas juste des mesh).
  // useMemo avec dependance sur scene : recree une seule fois par
  // instance de scene (useGLTF cache scene entre navigations SPA).
  const clonedScene = useMemo(() => cloneSkinnedScene(scene), [scene]);
  const cloneGroupRef = useRef<Group>(null);
  const cloneMixer = useMemo(() => new AnimationMixer(clonedScene), [clonedScene]);

  // Fresnel obsidienne via onBeforeCompile : factory reutilisee pour
  // primaire ET afterimage. Chaque instance a son propre jeu
  // d'uniforms pour piloter l'opacite independamment.
  const shaderUniforms = useMemo<FresnelUniforms>(
    () => ({
      uPower: { value: 2.2 },
      uBoost: { value: 2.8 },
      uOpacity: { value: 0 },
      uTime: { value: 0 },
    }),
    [],
  );
  const afterimageUniforms = useMemo<FresnelUniforms>(
    () => ({
      uPower: { value: 2.2 },
      uBoost: { value: 2.8 },
      uOpacity: { value: 0 },
      uTime: { value: 0 },
    }),
    [],
  );
  const fresnelMaterial = useMemo(() => createFresnelMaterial(shaderUniforms), [shaderUniforms]);
  // Corps d'obsidienne du Nord : MeshStandardMaterial patche par rim-light
  // (velours noir uNorthDark, sheen violet, aretes), opacite pilotee par
  // l'enveloppe de fade comme le fresnel.
  const obsidianMaterial = useMemo(
    // Hors des lumieres (couche 2), le corps se lit par une base EMISSIVE
    // violet obsidienne (independante des lumieres), pas par le PBR.
    // fog: false (03/09, "la margelle et le fog le cachent") : l'obsidienne
    // n'est pas fondue dans le brouillard, seul le cerf peut le masquer.
    () => new MeshStandardMaterial({ color: new Color("#0a0812"), emissive: new Color("#100b20"), emissiveIntensity: 1.0, roughness: 0.9, metalness: 0.05, transparent: true, opacity: 0, fog: false }),
    []
  );
  const obsidianUniformsRef = useRef<RimLightUniforms[]>([]);
  const emberRef = useRef<PointLight>(null);
  const lastRippleRef = useRef(0);
  const stepRef = useRef(0);
  const afterimageMaterial = useMemo(
    () => createFresnelMaterial(afterimageUniforms),
    [afterimageUniforms],
  );
  // Reflet de braise (Nord) : le clone anime porte ce materiau, miroir
  // fait dans le shader.
  const emberMirrorUniforms = useMemo<EmberMirrorUniforms>(
    () => ({ uOpacity: { value: 0 }, uTime: { value: 0 }, uRipple: { value: tezcatlStore.ripple }, uTexel: { value: tezcatlStore.rippleTexel } }),
    []
  );
  const emberMirrorMaterial = useMemo(() => createEmberMirrorMaterial(emberMirrorUniforms), [emberMirrorUniforms]);

  useEffect(() => {
    obsidianUniformsRef.current = dressXolotl(scene as Group, direction === "obsidienne", obsidianMaterial, fresnelMaterial);
  }, [scene, fresnelMaterial, obsidianMaterial, direction]);
  // La camera doit voir la couche 2 (Xolotl du Nord).
  const { camera } = useThree();
  useEffect(() => {
    camera.layers.enable(2);
  }, [camera]);

  // Applique le material afterimage + cache Object_8 sur la clone
  // (SkeletonUtils.clone partage la geometry mais chaque mesh a sa
  // propre reference material apres reassignation).
  useEffect(() => {
    const north = direction === "obsidienne";
    clonedScene.traverse((child) => {
      const mesh = child as Mesh;
      if (mesh.isMesh) {
        if (mesh.name === "Object_8") {
          mesh.visible = false;
          return;
        }
        // Au Nord le clone n'est plus l'afterimage : c'est le reflet de
        // braise sous la nappe (miroir dans le vertex shader).
        mesh.material = north ? emberMirrorMaterial : afterimageMaterial;
        mesh.renderOrder = 998;
        mesh.frustumCulled = false;
      }
    });
  }, [clonedScene, afterimageMaterial, emberMirrorMaterial, direction]);

  // Deuxieme mixer pour la clone : joue Walk independamment du mixer
  // primaire, avec un offset temporel initial (clone en arriere-phase
  // → "retard" perceptible sur la pose).
  useEffect(() => {
    const walkClip = animations.find((a) => a.name === WALK_ANIM);
    if (!walkClip) return;
    const action = cloneMixer.clipAction(walkClip);
    action.timeScale = walkTimeScale;
    action.play();
    // Decale la phase de la clone : depart a t = duration - delayInSec
    // → clone est ~180 ms en retard dans le cycle walk.
    action.time = direction === "obsidienne" ? 0 : Math.max(0, walkClip.duration - AFTERIMAGE_DELAY_MS / 1000);
    return () => {
      action.stop();
      cloneMixer.uncacheClip(walkClip);
    };
  }, [cloneMixer, animations, walkTimeScale, direction]);

  // Décide spawn une fois par session/direction. sessionStorage évite
  // re-random au re-mount SPA (nav retour sur même page).
  useEffect(() => {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isBot() || readingMode.active) return void setSpawn(false);
     
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return void setSpawn(false);
    // v2 (03/09) : invalide les tirages "non" caches avant le passage a 1 au Nord.
    const key = `nahual-xolotl-spawn-v2-${direction}`;
    const cached = sessionStorage.getItem(key);
    let shouldSpawn: boolean;
    if (cached !== null) {
      shouldSpawn = cached === "1";
    } else {
      const prob = DIRECTION_SPAWN_PROBABILITY[direction] ?? 0;
      shouldSpawn = Math.random() < prob;
      sessionStorage.setItem(key, shouldSpawn ? "1" : "0");
    }
    setSpawn(shouldSpawn);
    setStartedAt(null);
  }, [direction, readingMode.active]);

  // Déclenche appear après delay + start walk animation loop
  useEffect(() => {
    if (!spawn) return;
    const delay = alreadyWitnessed ? APPEAR_DELAY_REPEAT_MS : APPEAR_DELAY_FIRST_MS;
    const timer = window.setTimeout(() => {
      setStartedAt(performance.now());
      const walk = actions[WALK_ANIM];
      if (walk) {
        walk.timeScale = walkTimeScale;
        walk.reset().play();
      }
      // Reset flag "codex deja lu pour ce cycle" (retour Sylvain 30/08 :
      // "le footer ne se rafraichit plus lorsque xolotl apparait" :
      // apres visite Codex, codex-read=1 stay en localStorage indefini,
      // empechait astérisque + message a chaque spawn suivant). Nouveau
      // cycle Xolotl = nouveau signal, on efface la trace de la visite
      // precedente pour que le pattern "voit Xolo → visite Codex" puisse
      // se rejouer a chaque apparition.
      try {
        localStorage.removeItem("nahual-xolotl-codex-read");
        document.body.classList.remove("xolotl-codex-read");
      } catch {}
      // Signale "xolotl visible" via event pour WitnessMessage
      // ephemere (retour user 29/08 : message doit apparaitre
      // seulement quand chien apparait, pas persistant).
      window.dispatchEvent(new CustomEvent("nahual-xolotl-appearing", { detail: { visible: true } }));
      window.dispatchEvent(new CustomEvent("nahual-xolotl-state"));
    }, delay);
    return () => window.clearTimeout(timer);
  }, [spawn, alreadyWitnessed, actions, walkTimeScale]);

  useFrame((_state, delta) => {
    const g = groupRef.current;
    if (!g) return;
    if (startedAt === null) {
      g.visible = false;
      tezcatlStore.xolotl = null;
      const cloneG = cloneGroupRef.current;
      if (cloneG) cloneG.visible = false;
      return;
    }
    g.visible = true;
    // Update mixer clone (le mixer primaire est gere par useAnimations).
    cloneMixer.update(delta);
    const elapsed = performance.now() - startedAt;
    if (elapsed > totalMs) {
      // Anim complète : marque témoignage si tab visible
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        try {
          localStorage.setItem("nahual-xolotl-witnessed", "1");
          document.body.classList.add("xolotl-witnessed");
          window.dispatchEvent(new CustomEvent("nahual-xolotl-state"));
        } catch {}
      }
      g.visible = false;
      tezcatlStore.xolotl = null;
      const walk = actions[WALK_ANIM];
      if (walk) walk.stop();
      setStartedAt(null);
      // Signale "xolotl hidden" : WitnessMessage restera visible
      // ~30s post-fin via timer interne cote message, puis disparait.
      window.dispatchEvent(new CustomEvent("nahual-xolotl-appearing", { detail: { visible: false } }));
      return;
    }
    // Position ligne droite : X lerp lineaire, Y et Z fixes.
    // Disparition organique via fade in/out uniquement (retour user
    // 29/08 iter 7 "pas partir derriere colline, laisse le marcher
    // droit et disparaitre naturellement").
    const t = elapsed / totalMs;
    const zDepth = direction === "obsidienne" ? Z_DEPTH_NORTH : Z_DEPTH;
    const x = START_X + (END_X - START_X) * t;
    const y = getTerrainHeight(x, zDepth) + Y_FOOT_OFFSET;
    g.position.set(x, y, zDepth);
    // Publie la position pour la couronne de cempasuchil (Nord).
    if (!tezcatlStore.xolotl) tezcatlStore.xolotl = { x, z: zDepth };
    else {
      tezcatlStore.xolotl.x = x;
      tezcatlStore.xolotl.z = zDepth;
    }

    // Enveloppe fade in/out
    let opacity = PEAK_OPACITY;
    if (elapsed < FADE_MS) {
      opacity *= elapsed / FADE_MS;
    } else if (elapsed > FADE_MS + traverseMs) {
      const fadeOutT = (elapsed - FADE_MS - traverseMs) / FADE_MS;
      opacity *= 1 - fadeOutT;
    }
    // Update uniforms fresnel via helpers (react-hooks/immutability :
    // pas d'assignation directe sur valeur issue d'un hook, cf pattern
    // setRimLightIntensity dans rim-light.ts).
    setFresnelUniform(shaderUniforms, "uOpacity", opacity);
    const nowSec = performance.now() / 1000;
    setFresnelUniform(shaderUniforms, "uTime", nowSec);
    // Nord : corps d'obsidienne (opacite = enveloppe), aretes qui
    // respirent, braise portee, ondes a ses pattes dans le bassin.
    const north = direction === "obsidienne";
    // Totalement opaque hors des fondus d'entree/sortie (03/09).
    setMaterialOpacity(obsidianMaterial, north ? Math.min(1, opacity / PEAK_OPACITY) : 0);
    if (north && obsidianUniformsRef.current.length > 0) {
      setEdgePulse(obsidianUniformsRef.current, 0.65 + 0.35 * Math.pow(Math.sin(nowSec * Math.PI * 0.25), 4));
    }
    if (emberRef.current) emberRef.current.intensity = north ? EMBER_INTENSITY * opacity : 0;
    // La braise publiee pour son reflet dans l'eau (tezcatl-water).
    tezcatlStore.ember.x = x;
    tezcatlStore.ember.y = y + 0.7 * XOLOTL_SCALE;
    tezcatlStore.ember.z = zDepth;
    tezcatlStore.ember.intensity = north ? opacity : 0;
    if (north && Math.hypot(x, zDepth) < POOL_RADIUS) {
      // Sillage de proue : source continue juste devant le museau.
      tezcatlStore.impacts.push({ x: x + BOW_AHEAD, z: zDepth, amount: BOW_AMOUNT * opacity });
      if (nowSec - lastRippleRef.current > STEP_EVERY_S) {
        lastRippleRef.current = nowSec;
        stepRef.current += 1;
        const side = stepRef.current % 2 === 0 ? STEP_SIDE : -STEP_SIDE;
        tezcatlStore.impacts.push({ x: x - 0.25, z: zDepth + side, amount: STEP_AMOUNT * opacity });
      }
    }

    // Pulse partage entre fresnel silhouette + noyau + halo (30 bpm,
    // meme phase → tout respire ensemble). Calcul identique au shader
    // fragment pour synchronisation parfaite.
    const HEART_RATE = 0.5; // 30 bpm
    const phase = nowSec * HEART_RATE * 6.2831;
    const sinPhase = Math.sin(phase);
    // smoothstep(-0.2, 0.6, sinPhase) : match exact du shader.
    const smoothT = Math.max(0, Math.min(1, (sinPhase + 0.2) / 0.8));
    const smoothed = smoothT * smoothT * (3 - 2 * smoothT);
    const pulseVal = 0.75 + 0.25 * smoothed;

    // Noyau emissif : scale et couleur multipliees par pulseVal. Base
    // scale 1.0 → oscille entre 0.9 et 1.1 (subtil, l'effet "coeur qui
    // bat" vient surtout de la luminosite via bloom postFX).
    const core = coreRef.current;
    if (core) {
      const coreScale = 0.9 + 0.2 * smoothed;
      core.scale.setScalar(coreScale);
      // Opacite quasi-fantome (retour user 3eme iteration : 75% de
      // transparence = 25% d'opacite max). Range 0.04-0.09. Bloom
      // capte la luminosite meme a alpha tres bas.
      setCoreOpacity(core, opacity * (0.04 + 0.05 * smoothed));
    }

    // Halo au sol : position sync avec le chien, pulse et opacite via
    // shader uniforms. Le halo n'est PAS enfant du group Xolo (evite
    // heriter du scale/rotation), positionne manuellement ici.
    const halo = haloRef.current;
    if (halo) {
      halo.position.set(x, y + 0.02, zDepth);
      halo.visible = g.visible;
      setHaloUniforms(haloUniforms, opacity * 0.7, pulseVal);
    }

    // Afterimage : position calculee pour elapsed - AFTERIMAGE_DELAY_MS
    // (la clone est "en retard" spatialement aussi, pas juste dans la
    // pose walk). Opacite reduite (fantome moins present que primaire).
    const cloneG = cloneGroupRef.current;
    if (cloneG && north) {
      // Reflet de braise : meme place, meme pose, le shader replie sous
      // l'eau. Opacite = celle du corps (fondus d'entree et de sortie).
      cloneG.position.set(x, y, zDepth);
      cloneG.visible = g.visible;
      setEmberMirror(emberMirrorUniforms, Math.min(1, opacity / PEAK_OPACITY), nowSec);
    } else if (cloneG) {
      const delayedElapsed = elapsed - AFTERIMAGE_DELAY_MS;
      if (delayedElapsed > 0) {
        const dt = delayedElapsed / totalMs;
        const dx = START_X + (END_X - START_X) * dt;
        const dy = getTerrainHeight(dx, Z_DEPTH) + Y_FOOT_OFFSET;
        cloneG.position.set(dx, dy, zDepth);
        cloneG.visible = true;
        // Fade envelope pour la clone : meme forme que primaire mais
        // decale de delayMs → la clone fade in un poil apres et fade
        // out un poil apres aussi, silhouette qui "traine".
        let cloneOpacity = PEAK_OPACITY;
        if (delayedElapsed < FADE_MS) {
          cloneOpacity *= delayedElapsed / FADE_MS;
        } else if (delayedElapsed > FADE_MS + traverseMs) {
          const foT = (delayedElapsed - FADE_MS - traverseMs) / FADE_MS;
          cloneOpacity *= 1 - foT;
        }
        setFresnelUniform(afterimageUniforms, "uOpacity", cloneOpacity * AFTERIMAGE_OPACITY_MULT);
        setFresnelUniform(afterimageUniforms, "uTime", nowSec);
      } else {
        cloneG.visible = false;
      }
    }
  });

  // Applique body.xolotl-witnessed dès le mount si déjà vu (survit
  // aux navigations SPA)
  useEffect(() => {
    if (alreadyWitnessed && typeof document !== "undefined") {
      document.body.classList.add("xolotl-witnessed");
    }
  }, [alreadyWitnessed]);

  if (!spawn) return null;

  return (
    <>
      <group ref={groupRef} scale={XOLOTL_SCALE} rotation={[0, Math.PI / 2, 0]} visible={false}>
        <primitive object={scene} />
        {/* La braise (Nord) : le Soleil qu'il escorte dans la nuit. */}
        <pointLight ref={emberRef} color={EMBER_COLOR} intensity={0} distance={EMBER_DISTANCE} decay={2} position={[0, 0.7, 0]} />
        {/* Noyau emissif "myocarde" : ellipsoide asymetrique place au
            thorax du chien (Y=0.55 local avant scale 0.85). Base
            IcosahedronGeometry (low-poly, aspect organique irregulier
            plutot que sphere lisse), scale non-uniforme pour rappeler
            la silhouette anatomique du coeur (plus large en haut =
            oreillettes, effile en bas = apex du ventricule gauche).
            Legere rotation pour orientation "in situ" (coeur pointe
            legerement vers avant-gauche du thorax). Taille reduite ~4x
            vs l'ancien heart shape enfant. Additif + Bloom. */}
        <mesh
          ref={coreRef}
          position={[0, 0.6, 0.37]}
          rotation={[0, 0, -0.35]}
          scale={[0.75, 1.0, 0.85]}
          renderOrder={1000}
        >
          <icosahedronGeometry args={[0.07, 1]} />
          <meshBasicMaterial
            color="#e0a8ff"
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
            fog={false}
          />
        </mesh>
      </group>
      {/* Afterimage : clone du scene avec skeleton independant, meme
          scale/rotation que la primaire mais position decale dans
          useFrame (retard temporel AFTERIMAGE_DELAY_MS). Material
          fresnel independant → opacite reduite. Pas de noyau/halo sur
          la clone (silhouette pure). */}
      <group
        ref={cloneGroupRef}
        scale={XOLOTL_SCALE}
        rotation={[0, Math.PI / 2, 0]}
        visible={false}
      >
        <primitive object={clonedScene} />
      </group>
      {/* Halo au sol : disc horizontal projet sous les pattes, position
          sync avec le Xolo dans useFrame. Shader radial gradient +
          blend additif pour effet "empreinte lumineuse spectrale". */}
      <mesh
        ref={haloRef}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
        renderOrder={997}
      >
        <circleGeometry args={[0.8, 48]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          fog={false}
          uniforms={haloUniforms}
          vertexShader={`
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            uniform vec3 uColor;
            uniform float uOpacity;
            uniform float uPulse;
            varying vec2 vUv;
            void main() {
              vec2 centered = vUv - 0.5;
              float dist = length(centered) * 2.0;
              // Anneau : peak vers dist=0.55, fade centre et bord
              float ring = smoothstep(0.0, 0.55, dist) * (1.0 - smoothstep(0.55, 1.0, dist));
              float glow = pow(1.0 - smoothstep(0.0, 1.0, dist), 2.0) * 0.5;
              float alpha = (ring * 0.9 + glow) * uPulse;
              gl_FragColor = vec4(uColor * uPulse, alpha * uOpacity);
            }
          `}
        />
      </mesh>
    </>
  );
}
