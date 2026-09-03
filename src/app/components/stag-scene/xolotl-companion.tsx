"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import { AdditiveBlending, AnimationMixer, Color, MeshBasicMaterial, type Group, type Mesh } from "three";
import { clone as cloneSkinnedScene } from "three/examples/jsm/utils/SkeletonUtils.js";
import { isBot } from "@/lib/is-bot";
import { getTerrainHeight } from "@/lib/terrain-height";
import { useReadingMode } from "@/lib/reading-mode-context";
import type { DirectionKey } from "./direction-colors";
import { useCurrentDirection } from "./use-current-direction";

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
const AFTERIMAGE_DELAY_MS = 180;
// Multiplier d'opacite pour l'afterimage vs primaire (fantome plus
// tenu, moins present). 0.35 = discret mais visible.
const AFTERIMAGE_OPACITY_MULT = 0.35;


export default function XolotlCompanion() {
  const direction = useCurrentDirection();
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
  const afterimageMaterial = useMemo(
    () => createFresnelMaterial(afterimageUniforms),
    [afterimageUniforms],
  );

  useEffect(() => {
    scene.traverse((child) => {
      const mesh = child as Mesh;
      if (mesh.isMesh) {
        // Object_8 (138 verts, seule sous-mesh interne du GLB Xolo Fab)
        // = dents/langue/gencives. Rendu invisible pour eviter que le
        // fresnel les eclaire comme des aretes de silhouette dans la
        // gueule ouverte pendant le walk cycle.
        if (mesh.name === "Object_8") {
          mesh.visible = false;
          return;
        }
        mesh.material = fresnelMaterial;
        mesh.renderOrder = 999;
      }
    });
  }, [scene, fresnelMaterial]);

  // Applique le material afterimage + cache Object_8 sur la clone
  // (SkeletonUtils.clone partage la geometry mais chaque mesh a sa
  // propre reference material apres reassignation).
  useEffect(() => {
    clonedScene.traverse((child) => {
      const mesh = child as Mesh;
      if (mesh.isMesh) {
        if (mesh.name === "Object_8") {
          mesh.visible = false;
          return;
        }
        mesh.material = afterimageMaterial;
        mesh.renderOrder = 998;
      }
    });
  }, [clonedScene, afterimageMaterial]);

  // Deuxieme mixer pour la clone : joue Walk independamment du mixer
  // primaire, avec un offset temporel initial (clone en arriere-phase
  // → "retard" perceptible sur la pose).
  useEffect(() => {
    const walkClip = animations.find((a) => a.name === WALK_ANIM);
    if (!walkClip) return;
    const action = cloneMixer.clipAction(walkClip);
    action.timeScale = WALK_TIME_SCALE;
    action.play();
    // Decale la phase de la clone : depart a t = duration - delayInSec
    // → clone est ~180 ms en retard dans le cycle walk.
    action.time = Math.max(0, walkClip.duration - AFTERIMAGE_DELAY_MS / 1000);
    return () => {
      action.stop();
      cloneMixer.uncacheClip(walkClip);
    };
  }, [cloneMixer, animations]);

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
        walk.timeScale = WALK_TIME_SCALE;
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
  }, [spawn, alreadyWitnessed, actions]);

  useFrame((_state, delta) => {
    const g = groupRef.current;
    if (!g) return;
    if (startedAt === null) {
      g.visible = false;
      const cloneG = cloneGroupRef.current;
      if (cloneG) cloneG.visible = false;
      return;
    }
    g.visible = true;
    // Update mixer clone (le mixer primaire est gere par useAnimations).
    cloneMixer.update(delta);
    const elapsed = performance.now() - startedAt;
    if (elapsed > TOTAL_MS) {
      // Anim complète : marque témoignage si tab visible
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        try {
          localStorage.setItem("nahual-xolotl-witnessed", "1");
          document.body.classList.add("xolotl-witnessed");
          window.dispatchEvent(new CustomEvent("nahual-xolotl-state"));
        } catch {}
      }
      g.visible = false;
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
    const t = elapsed / TOTAL_MS;
    const x = START_X + (END_X - START_X) * t;
    const y = getTerrainHeight(x, Z_DEPTH) + Y_FOOT_OFFSET;
    g.position.set(x, y, Z_DEPTH);

    // Enveloppe fade in/out
    let opacity = PEAK_OPACITY;
    if (elapsed < FADE_MS) {
      opacity *= elapsed / FADE_MS;
    } else if (elapsed > FADE_MS + TRAVERSE_MS) {
      const fadeOutT = (elapsed - FADE_MS - TRAVERSE_MS) / FADE_MS;
      opacity *= 1 - fadeOutT;
    }
    // Update uniforms fresnel via helpers (react-hooks/immutability :
    // pas d'assignation directe sur valeur issue d'un hook, cf pattern
    // setRimLightIntensity dans rim-light.ts).
    setFresnelUniform(shaderUniforms, "uOpacity", opacity);
    const nowSec = performance.now() / 1000;
    setFresnelUniform(shaderUniforms, "uTime", nowSec);

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
      halo.position.set(x, y + 0.02, Z_DEPTH);
      halo.visible = g.visible;
      setHaloUniforms(haloUniforms, opacity * 0.7, pulseVal);
    }

    // Afterimage : position calculee pour elapsed - AFTERIMAGE_DELAY_MS
    // (la clone est "en retard" spatialement aussi, pas juste dans la
    // pose walk). Opacite reduite (fantome moins present que primaire).
    const cloneG = cloneGroupRef.current;
    if (cloneG) {
      const delayedElapsed = elapsed - AFTERIMAGE_DELAY_MS;
      if (delayedElapsed > 0) {
        const dt = delayedElapsed / TOTAL_MS;
        const dx = START_X + (END_X - START_X) * dt;
        const dy = getTerrainHeight(dx, Z_DEPTH) + Y_FOOT_OFFSET;
        cloneG.position.set(dx, dy, Z_DEPTH);
        cloneG.visible = true;
        // Fade envelope pour la clone : meme forme que primaire mais
        // decale de delayMs → la clone fade in un poil apres et fade
        // out un poil apres aussi, silhouette qui "traine".
        let cloneOpacity = PEAK_OPACITY;
        if (delayedElapsed < FADE_MS) {
          cloneOpacity *= delayedElapsed / FADE_MS;
        } else if (delayedElapsed > FADE_MS + TRAVERSE_MS) {
          const foT = (delayedElapsed - FADE_MS - TRAVERSE_MS) / FADE_MS;
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
