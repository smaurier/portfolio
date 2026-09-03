"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import { AdditiveBlending, AnimationMixer, Color, DoubleSide, MeshBasicMaterial, MeshPhysicalMaterial, Quaternion, ShaderMaterial, Vector3, type Group, type Mesh, type MeshStandardMaterial, type Object3D, type PointLight } from "three";
import { getMictlanSky } from "./mictlan-sky";
import { rimCrossing, rimSurface } from "@/lib/xolotl-rim";
import { bodyFromFeet, rollFromFeet } from "@/lib/quadruped-stance";
import { DOG_LEG_LIMITS, twoBoneIK, type Vec3 } from "@/lib/two-bone-ik";
import { clone as cloneSkinnedScene } from "three/examples/jsm/utils/SkeletonUtils.js";
import { isBot } from "@/lib/is-bot";
import { getTerrainHeight } from "@/lib/terrain-height";
import { useReadingMode } from "@/lib/reading-mode-context";
import type { DirectionKey } from "./direction-colors";
import { useCurrentDirection } from "./use-current-direction";
import { WATER_LEVEL, tezcatlStore } from "./tezcatl-store";

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
// Sillage (03/09, trois iterations) : gouttes espacees = anneaux
// concentriques ; source continue devant le museau = V de proue mais
// "l'avant du sillage est tres mal fait" (Sylvain). Version retenue :
// une COQUE injectee dans le simulateur d'ondes (dipole de pression,
// crete a la proue, creux a la poupe, cf tezcatl-ripple-sim), la
// physique fabrique le V. Les pas restent pour la texture.
/** Coque (03/09) : le corps qui avance est un dipole de pression pour le
 * simulateur d'ondes (crete devant, creux derriere), pas une goutte. */
const HULL_HALF_LENGTH = 0.45;
const HULL_HALF_WIDTH = 0.2;
const HULL_AMOUNT = 0.06; // 0.012 : le sillage restait invisible (capture 03/09)
const STEP_EVERY_S = 0.32;
const STEP_AMOUNT = 0.05;
const STEP_SIDE = 0.18;
const POOL_RADIUS = 6.4;
/** La margelle (cf tezcatl-water RIM_INNER/RIM_OUTER/RIM_HEIGHT) : un
 * relief sur lequel les pattes se posent, et l'eau eclabousse a l'entree
 * et a la sortie du bassin (03/09). */
const RIM_SPEC = { inner: 6.28, outer: 6.78, top: WATER_LEVEL + 0.09 };
const SPLASH_AMOUNT = 0.3;
/** Demi-empattement : ou l'on echantillonne le sol devant et derriere pour
 * en deduire l'assiette. */
const HALF_BASE = 0.45;
/** Garde-fou d'assiette : au-dela, la marche est trop haute pour ce corps
 * et on prefere une patte qui s'etire a un chien a la verticale. 0.5 ->
 * 0.6 : la marche de la margelle demande 28.7 degres (mesure 03/09), le
 * garde-fou mordait donc pile dessus. C'est la geometrie qui doit decider,
 * pas la borne. */
const MAX_PITCH = 0.6;
/** Suivi de l'assiette, en 1/s. Simple filtre du premier ordre : il lisse
 * l'arete de la pierre sans jamais depasser sa cible (pas de ressort ici,
 * un depassement se lirait comme un rebond parasite). */
const STANCE_FOLLOW_RATE = 12;
/** L'assiette bascule autour de l'axe Z du monde (la marche est le long de
 * +X) et doit composer PAR-DESSUS le cap, d'ou la composition de
 * quaternions : un Euler XYZ composerait dans l'autre sens et ne donnerait
 * qu'un roulis autour de l'axe de marche. */
const PITCH_AXIS = new Vector3(0, 0, 1);
/** Le roulis bascule autour de l'axe de marche (+X). */
const ROLL_AXIS = new Vector3(1, 0, 0);
const YAW_QUATERNION = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);
/** Garde-fou de roulis : plus serre que l'assiette, un chien qui bancale
 * trop se lit comme une chute. */
const MAX_ROLL = 0.35;

/** ---- POSE DES PATTES PAR CINEMATIQUE INVERSE (03/09, piste choisie par
 * Sylvain apres l'echec du modele analytique : "on va tester sur la 1").
 *
 * On ne calcule plus l'attitude du corps, on POSE les quatre pattes sur
 * leur appui reel et le reste suit. Chaque membre du rig est une chaine
 * hanche > genou > cheville > coussinet, donc DEUX segments, resolus en
 * forme fermee par `twoBoneIK`. Consequence : sur la margelle, les pattes
 * qui sont au-dessus de la pierre s'y posent, celles qui sont encore
 * dehors restent au sol, et l'attitude du corps devient une consequence
 * de la geometrie au lieu d'une valeur a regler.
 *
 * Noms d'os : inspection du GLB (rig Maya, chaine ROOT > Spine). Le
 * membre arriere a un genou de plus (Knee2), traite comme faisant partie
 * du segment bas : la longueur est mesuree a chaque frame sur les
 * positions monde, pas au repos, donc cela reste juste. */
type LegSpec = { hip: string; knee: string; ankle: string; ball: string };
/** ORDRE SIGNIFIANT : les deux membres avant, puis les deux arriere.
 * L'assiette du corps se deduit de la moyenne des appuis avant contre la
 * moyenne des appuis arriere. */
const FRONT_LEG_COUNT = 2;
const LEGS: LegSpec[] = [
  { hip: "Wolf_l_FrontLeg_HipSHJnt_4", knee: "Wolf_l_FrontLeg_KneeSHJnt_3", ankle: "Wolf_l_FrontLeg_AnkleSHJnt_2", ball: "Wolf_l_FrontLeg_BallSHJnt_1" },
  { hip: "Wolf_r_FrontLeg_HipSHJnt_10", knee: "Wolf_r_FrontLeg_KneeSHJnt_9", ankle: "Wolf_r_FrontLeg_AnkleSHJnt_8", ball: "Wolf_r_FrontLeg_BallSHJnt_7" },
  { hip: "Wolf_l_HindLeg_HipSHJnt_32", knee: "Wolf_l_HindLeg_Knee1SHJnt_31", ankle: "Wolf_l_HindLeg_AnkleSHJnt_29", ball: "Wolf_l_HindLeg_BallSHJnt_28" },
  { hip: "Wolf_r_HindLeg_HipSHJnt_38", knee: "Wolf_r_HindLeg_Knee1SHJnt_37", ankle: "Wolf_r_HindLeg_AnkleSHJnt_35", ball: "Wolf_r_HindLeg_BallSHJnt_34" },
];

type Leg = {
  hip: Object3D;
  knee: Object3D;
  ankle: Object3D;
  ball: Object3D;
  /** Les memes os sur le clone (reflet de braise) : il doit se poser pareil. */
  twinHip: Object3D | null;
  twinKnee: Object3D | null;
};

function collectLegs(root: Group, twinRoot: Group | null): Leg[] {
  const out: Leg[] = [];
  for (const spec of LEGS) {
    const hip = root.getObjectByName(spec.hip);
    const knee = root.getObjectByName(spec.knee);
    const ankle = root.getObjectByName(spec.ankle);
    const ball = root.getObjectByName(spec.ball);
    if (!hip || !knee || !ankle || !ball) continue;
    out.push({
      hip,
      knee,
      ankle,
      ball,
      twinHip: twinRoot?.getObjectByName(spec.hip) ?? null,
      twinKnee: twinRoot?.getObjectByName(spec.knee) ?? null,
    });
  }
  return out;
}

/** Hauteur d'appui sous un point du monde : le sol, plus l'enjambement de
 * la margelle. C'est ce que la patte doit toucher. */
function supportHeight(px: number, pz: number, north: boolean): number {
  const ground = getTerrainHeight(px, pz) + Y_FOOT_OFFSET;
  return north ? rimSurface(Math.hypot(px, pz), ground, RIM_SPEC) : ground;
}

/** Applique a un os une rotation exprimee en MONDE. Un os ne connait que
 * son repere local : local' = Qp⁻¹ * delta * Qp * local, ou Qp est
 * l'orientation monde du parent. Sans cette conversion, chaque os du rig
 * (dont les orientations de repos diffèrent) partirait dans sa direction. */
function applyWorldDelta(
  bone: Object3D,
  axis: Vec3,
  angle: number,
  delta: Quaternion,
  parentQuat: Quaternion,
  axisVec: Vector3
) {
  if (!Number.isFinite(angle) || Math.abs(angle) < 1e-5) return;
  axisVec.set(axis.x, axis.y, axis.z);
  delta.setFromAxisAngle(axisVec, angle);
  const parent = bone.parent;
  if (parent) {
    parent.getWorldQuaternion(parentQuat);
    delta.multiply(parentQuat);
    parentQuat.invert();
    delta.premultiply(parentQuat);
  }
  bone.quaternion.premultiply(delta);
}

/** Axe de tangage : la marche est le long de +X, le corps bascule donc
 * autour de l'axe Z du monde. Le tangage doit s'appliquer PAR-DESSUS le
 * cap (Rz * Ry), d'ou la composition de quaternions plutot qu'un Euler
 * (un Euler XYZ compose dans l'autre sens et ne ferait qu'un roulis). */
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

/** Habille les meshes de Xolotl : fresnel fantome partout, OBSIDIENNE
 * POLIE au Nord (03/09, Sylvain : "jouer a fond le coup de la texture, le
 * faire brillant de la meme surface qu'une fleche d'obsidienne") : le
 * meme materiau que les lames et les fleches, envMap du ciel du Mictlan,
 * couche 0 pour que la braise qu'il porte accroche des reflets sur lui.
 * Plus de patch rim-light ni de pulsation (elle le blanchissait). */
function dressXolotl(root: Group, north: boolean, obsidian: MeshPhysicalMaterial, fresnel: MeshBasicMaterial): void {
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
    mesh.layers.set(0);
  });
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
 * Implementation (v2, 03/09 soir) : REFLET PLANAIRE. Le clone anime
 * (SkeletonUtils) marche debout a la meme place que Xolotl, habille de
 * braise, sur la COUCHE 3 que la camera principale ne voit pas ;
 * TezcatlWater le rend chaque frame depuis une camera miroir dans une
 * texture, que la nappe echantillonne. Consequences justes gratuitement :
 * le reflet touche les pattes a la ligne d'eau, le cerf l'occulte, les
 * ondes le deforment (v1 : silhouette repliee sous le sol en depthTest
 * off, elle passait par-dessus le cerf, retour Sylvain). */
type EmberMirrorUniforms = {
  uOpacity: { value: number };
  uTime: { value: number };
};

function setEmberMirror(uniforms: EmberMirrorUniforms, opacity: number, time: number) {
  uniforms.uOpacity.value = opacity;
  uniforms.uTime.value = time;
}

function createEmberMirrorMaterial(uniforms: EmberMirrorUniforms): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { ...uniforms, uClipY: { value: WATER_LEVEL } },
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    vertexShader: `
      #include <common>
      #include <skinning_pars_vertex>
      varying vec3 vLocal;
      varying vec3 vWorld;
      void main() {
        #include <skinbase_vertex>
        #include <begin_vertex>
        #include <skinning_vertex>
        vLocal = transformed;
        vec4 world = modelMatrix * vec4(transformed, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      uniform float uTime;
      uniform float uClipY;
      varying vec3 vLocal;
      varying vec3 vWorld;
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
        // Rien de ce qui est SOUS la ligne d'eau ne peut se refleter : les
        // pattes immergees se dessinaient a l'envers au-dessus de la
        // surface, le reflet paraissait mal place (retour Sylvain 03/09).
        // C'est le role du clip oblique du Reflector de three.js ; ici un
        // seul objet est reflete, un discard suffit.
        if (vWorld.y < uClipY) discard;
        // Braise : veines chaudes qui montent lentement dans le corps (espace
        // local, la braise suit la marche), crepitement fin par-dessus.
        float veins = vnoise(vLocal * 5.0 + vec3(0.0, -uTime * 0.5, 0.0));
        float crackle = vnoise(vLocal * 16.0 + vec3(uTime * 0.35, 0.0, -uTime * 0.2));
        float glow = smoothstep(0.42, 0.88, veins * 0.65 + crackle * 0.35);
        float flicker = 0.85 + 0.15 * sin(uTime * 6.0 + veins * 25.0);
        // Base rouge sombre lisible sur l'eau noire, veines orange, pointes
        // chaudes rares (le bloom ne doit embraser que les veines).
        vec3 col = mix(vec3(0.5, 0.09, 0.01), vec3(0.9, 0.38, 0.05), glow) * flicker;
        col += vec3(1.0, 0.72, 0.35) * pow(glow, 5.0) * 0.25;
        float a = uOpacity * (0.75 + 0.25 * glow);
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
  // Corps d'obsidienne POLIE du Nord : la recette des lames d'obsidienne
  // (obsidian-blades), envMap du ciel du Mictlan. fog: false (03/09, "la
  // margelle et le fog le cachent"). Opacite pilotee par l'enveloppe.
  const obsidianMaterial = useMemo(() => {
    const m = new MeshPhysicalMaterial({
      color: new Color("#0a0712"),
      metalness: 0.85,
      roughness: 0.18,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      envMapIntensity: 1.6,
      transparent: true,
      opacity: 0,
      fog: false,
    });
    const sky = getMictlanSky();
    if (sky) m.envMap = sky;
    return m;
  }, []);
  const prevRadiusRef = useRef<number | null>(null);
  const legsRef = useRef<Leg[] | null>(null);
  const stanceRef = useRef<{ y: number; pitch: number; roll: number } | null>(null);
  /** Les appuis viennent-ils des vraies pattes, ou du repli a l'aveugle ?
   * Au changement de source la valeur saute : il faut se recaler d'un coup
   * plutot que de filtrer, sinon l'assiette arrive avec un tour de retard
   * (mesure : 35 cm d'ecart sur les premieres frames apres l'apparition). */
  const stanceFromFeetRef = useRef(false);
  const quatScratch = useMemo(() => new Quaternion(), []);
  const rollScratch = useMemo(() => new Quaternion(), []);
  const ikScratch = useMemo(
    () => ({
      hip: new Vector3(),
      knee: new Vector3(),
      ankle: new Vector3(),
      ball: new Vector3(),
      delta: new Quaternion(),
      parentQuat: new Quaternion(),
      axis: new Vector3(),
    }),
    []
  );
  const emberRef = useRef<PointLight>(null);
  const lastRippleRef = useRef(0);
  const stepRef = useRef(0);
  const afterimageMaterial = useMemo(
    () => createFresnelMaterial(afterimageUniforms),
    [afterimageUniforms],
  );
  // Reflet de braise (Nord) : le clone anime porte ce materiau, miroir
  // fait dans le shader.
  const emberMirrorUniforms = useMemo<EmberMirrorUniforms>(() => ({ uOpacity: { value: 0 }, uTime: { value: 0 } }), []);
  const emberMirrorMaterial = useMemo(() => createEmberMirrorMaterial(emberMirrorUniforms), [emberMirrorUniforms]);

  useEffect(() => {
    dressXolotl(scene as Group, direction === "obsidienne", obsidianMaterial, fresnelMaterial);
  }, [scene, fresnelMaterial, obsidianMaterial, direction]);

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
        // Au Nord le clone n'est plus l'afterimage : c'est le Xolotl de
        // braise, sur la couche 3 que seule la camera miroir de la nappe
        // voit (reflet planaire, cf TezcatlWater).
        mesh.material = north ? emberMirrorMaterial : afterimageMaterial;
        mesh.renderOrder = 998;
        mesh.frustumCulled = false;
        mesh.layers.set(north ? 3 : 0);
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
    const inNorth = direction === "obsidienne";
    const radius = Math.hypot(x, zDepth);
    const groundY = getTerrainHeight(x, zDepth) + Y_FOOT_OFFSET;
    // Au Nord il ENJAMBE la margelle (arc au-dessus de la pierre) et l'eau
    // eclabousse quand il y entre et quand il en sort (03/09).
    // ---- Assiette DEDUITE des appuis (03/09, retour Sylvain : "en
    // descendant la margelle les pattes avant doivent toucher le sol, et
    // en la montant les pattes arriere doivent encore toucher").
    //
    // A cheval sur la marche, les appuis avant et arriere sont a des
    // hauteurs differentes. Corps horizontal, une des deux paires devrait
    // s'etirer de TOUTE la hauteur de la pierre, ce qui depasse l'allonge
    // d'un membre : la patte decolle. En basculant le corps de l'angle de
    // la marche, chaque paire ne s'ecarte que de la moitie et les quatre
    // pattes touchent. Ce basculement n'est pas un effet ajoute, c'est la
    // condition geometrique pour que les pattes atteignent le sol.
    //
    // Les appuis sont echantillonnes SOUS LES COUSSINETS EUX-MEMES, pas
    // sous un point fixe du corps : le premier essai prenait le sol a
    // 0.45 devant le centre, alors que les pattes sont ailleurs et
    // avancent au rythme de la foulee. L'assiette arrivait donc en retard
    // sur ce que les pattes touchaient, et il restait des ecarts de 3 cm
    // et des butees en mordant l'arete (trace 03/09).
    //
    // Les positions lues sont celles de la frame precedente : un coussinet
    // ne bouge que de quelques millimetres par frame, et cela rompt la
    // circularite (le corps depend des pattes, les pattes du corps).
    if (inNorth && !legsRef.current) {
      const found = collectLegs(scene as Group, clonedScene as Group);
      if (found.length > 0) legsRef.current = found;
    }
    const sc = ikScratch;
    let frontSum = 0;
    let rearSum = 0;
    let frontN = 0;
    let rearN = 0;
    let frontX = 0;
    let rearX = 0;
    // Meme raisonnement lateralement : les deux cotes n'abordent pas la
    // pierre en meme temps (la margelle est courbe et les pattes sont
    // ecartees), et sans roulis le cote le plus haut devait s'etirer de
    // TOUT le devers. Mesure avant correction : jusqu'a 11 cm au-dela de
    // l'allonge sur une patte arriere.
    let plusZSum = 0;
    let minusZSum = 0;
    let plusZN = 0;
    let minusZN = 0;
    let plusZPos = 0;
    let minusZPos = 0;
    if (inNorth && legsRef.current) {
      const all = legsRef.current;
      for (let i = 0; i < all.length; i++) {
        all[i].ball.getWorldPosition(sc.ball);
        const sup = supportHeight(sc.ball.x, sc.ball.z, true);
        if (i < FRONT_LEG_COUNT) {
          frontSum += sup;
          frontX += sc.ball.x;
          frontN += 1;
        } else {
          rearSum += sup;
          rearX += sc.ball.x;
          rearN += 1;
        }
        if (sc.ball.z >= zDepth) {
          plusZSum += sup;
          plusZPos += sc.ball.z;
          plusZN += 1;
        } else {
          minusZSum += sup;
          minusZPos += sc.ball.z;
          minusZN += 1;
        }
      }
    }
    // Les positions lues datent de la frame precedente. A la toute
    // premiere frame apres le reperage des os, elles sont encore celles du
    // groupe avant placement : l'empattement mesure valait alors 1.96 au
    // lieu de 0.6, l'assiette sortait a 7 degres au lieu de 22 et une
    // patte manquait son appui de 41 cm (mesure 03/09). On ne fait donc
    // confiance aux coussinets que s'ils sont VRAISEMBLABLEMENT sous le
    // corps ; sinon on retombe sur l'echantillonnage fixe le temps d'une
    // frame.
    const plausible =
      frontN > 0 &&
      rearN > 0 &&
      Math.abs(frontX / frontN - x) < 1.2 &&
      Math.abs(rearX / rearN - x) < 1.2;
    const frontSupport = plausible ? frontSum / frontN : supportHeight(x + HALF_BASE, zDepth, inNorth);
    const rearSupport = plausible ? rearSum / rearN : supportHeight(x - HALF_BASE, zDepth, inNorth);
    // Empattement REEL entre les appuis, mesure lui aussi.
    const wheelbase = plausible ? Math.max(0.2, Math.abs(frontX / frontN - rearX / rearN)) : 2 * HALF_BASE;
    const stance = bodyFromFeet(frontSupport, rearSupport, wheelbase, MAX_PITCH);
    // Voie reelle entre les deux cotes, mesuree elle aussi.
    const track =
      plausible && plusZN > 0 && minusZN > 0
        ? Math.max(0.15, Math.abs(plusZPos / plusZN - minusZPos / minusZN))
        : 0;
    const rollTarget = track > 0 ? rollFromFeet(plusZSum / plusZN, minusZSum / minusZN, track, MAX_ROLL) : 0;
    const follow = 1 - Math.exp(-STANCE_FOLLOW_RATE * Math.min(delta, 1 / 30));
    const fromFeet = plausible;
    const sourceChanged = fromFeet !== stanceFromFeetRef.current;
    stanceFromFeetRef.current = fromFeet;
    const prevStance = sourceChanged ? null : stanceRef.current;
    stanceRef.current = prevStance
      ? {
          y: prevStance.y + (stance.y - prevStance.y) * follow,
          pitch: prevStance.pitch + (stance.pitch - prevStance.pitch) * follow,
          roll: prevStance.roll + (rollTarget - prevStance.roll) * follow,
        }
      : { y: stance.y, pitch: stance.pitch, roll: rollTarget };
    const y = stanceRef.current.y;
    const pitch = stanceRef.current.pitch;
    const roll = stanceRef.current.roll;
    g.position.set(x, y, zDepth);
    // Cap, puis roulis autour de l'axe de marche, puis assiette : chaque
    // rotation doit composer par-dessus la precedente, d'ou l'ordre.
    quatScratch.setFromAxisAngle(PITCH_AXIS, pitch);
    quatScratch.multiply(rollScratch.setFromAxisAngle(ROLL_AXIS, roll));
    quatScratch.multiply(YAW_QUATERNION);
    g.quaternion.copy(quatScratch);
    // ---- Pose des pattes : chaque coussinet va sur SON appui, en gardant
    // le lever du cycle de marche (mesure par rapport a la base du corps).
    // Nord seulement pour l'instant : c'est la que se trouve la margelle.
    if (inNorth) {
      for (const leg of legsRef.current ?? []) {
        leg.hip.getWorldPosition(sc.hip);
        leg.knee.getWorldPosition(sc.knee);
        leg.ankle.getWorldPosition(sc.ankle);
        leg.ball.getWorldPosition(sc.ball);
        const support = supportHeight(sc.ball.x, sc.ball.z, true);
        // Lever de la patte au-dessus du PLAN du corps (et non de son
        // centre) : le corps etant incline, une patte avant est plus haute
        // que le centre sans etre levee pour autant. C'est ce plan-la qui
        // dit si la patte est posee ou en l'air.
        // Le plan du corps porte aussi le roulis : une patte du cote bas
        // est plus basse que le centre sans etre posee pour autant.
        const planeY = y + Math.tan(pitch) * (sc.ball.x - x) - Math.tan(roll) * (sc.ball.z - zDepth);
        const lift = Math.max(0, sc.ball.y - planeY);
        const targetBallY = support + lift;
        // La cheville est l'effecteur ; le coussinet est sous elle, on
        // reporte donc l'ecart tel quel.
        const targetAnkleY = targetBallY + (sc.ankle.y - sc.ball.y);
        if (Math.abs(targetAnkleY - sc.ankle.y) < 1e-4) continue;
        const solution = twoBoneIK(
          { x: sc.hip.x, y: sc.hip.y, z: sc.hip.z },
          { x: sc.knee.x, y: sc.knee.y, z: sc.knee.z },
          { x: sc.ankle.x, y: sc.ankle.y, z: sc.ankle.z },
          { x: sc.ankle.x, y: targetAnkleY, z: sc.ankle.z },
          DOG_LEG_LIMITS
        );
        // Ordre impose par la construction de la solution : la hanche
        // plie, puis le genou plie autour du MEME axe, puis la hanche
        // vise. Inverser les deux derniers fausse l'axe du genou.
        applyWorldDelta(leg.hip, solution.bendAxis, solution.hipBend, sc.delta, sc.parentQuat, sc.axis);
        applyWorldDelta(leg.knee, solution.bendAxis, solution.kneeBend, sc.delta, sc.parentQuat, sc.axis);
        applyWorldDelta(leg.hip, solution.aimAxis, solution.aimAngle, sc.delta, sc.parentQuat, sc.axis);
        // Le reflet de braise se pose exactement pareil : meme rig, meme
        // phase, donc les rotations locales se recopient telles quelles.
        if (leg.twinHip) leg.twinHip.quaternion.copy(leg.hip.quaternion);
        if (leg.twinKnee) leg.twinKnee.quaternion.copy(leg.knee.quaternion);
      }
    }
    if (inNorth) {
      const prevRadius = prevRadiusRef.current;
      if (prevRadius !== null) {
        const crossing = rimCrossing(prevRadius, radius, RIM_SPEC);
        if (crossing === "enter") tezcatlStore.impacts.push({ x: x + 0.2, z: zDepth, amount: SPLASH_AMOUNT });
        if (crossing === "exit") tezcatlStore.impacts.push({ x: x - 0.35, z: zDepth, amount: SPLASH_AMOUNT });
      }
      prevRadiusRef.current = radius;
    }
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
    if (emberRef.current) emberRef.current.intensity = north ? EMBER_INTENSITY * opacity : 0;
    // La braise publiee pour son reflet dans l'eau (tezcatl-water).
    tezcatlStore.ember.x = x;
    tezcatlStore.ember.y = y + 0.7 * XOLOTL_SCALE;
    tezcatlStore.ember.z = zDepth;
    tezcatlStore.ember.intensity = north ? opacity : 0;
    if (north && radius < POOL_RADIUS) {
      // Sillage : la coque (dipole mobile) est injectee par TezcatlWater
      // dans le simulateur d'ondes, direction de marche +X.
      tezcatlStore.hull = { x, z: zDepth, dx: 1, dz: 0, halfLength: HULL_HALF_LENGTH, halfWidth: HULL_HALF_WIDTH, amount: HULL_AMOUNT * opacity };
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
      // Xolotl de braise : meme place, meme pose (couche 3, vu par la
      // camera miroir de la nappe). Opacite = celle du corps.
      cloneG.position.set(x, y, zDepth);
      cloneG.quaternion.copy(g.quaternion);
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
      {/* Cap et assiette sont poses dans useFrame (quaternion : l'assiette
          doit composer par-dessus le cap). */}
      <group ref={groupRef} scale={XOLOTL_SCALE} visible={false}>
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
