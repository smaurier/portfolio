"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import { Color, MeshBasicMaterial, type Group, type Mesh } from "three";
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
 *  - obsidienne (Nord / Mémoire) : 40 % — c'est justement le chemin
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
  obsidienne: 0.4,
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

// Z fixe (retire arc + terrain follow) — chien marche en ligne droite
// a distance constante. Disparition naturelle par fade in/out
// uniquement, plus par occlusion terrain.
const Z_DEPTH = -10;

// Peak opacity fresnel — 1.0 sur edges via shader (bord opaque),
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
// fin des pattes du cerf" — anatomiquement correct Xolo vs cerf =
// ratio ~0.35). Mesh Wolf.glb ~2 units natif → scale 0.35 = ~0.7
// unit world = tiers taille cerf central (~1.5 unit). Coherent
// perception anatomique.
const XOLOTL_SCALE = 0.35;

// Nom de l'animation Walk dans le Wolf.glb Quaternius. Convention
// pack Animals : "AnimalArmature|<AnimName>".
const WALK_ANIM = "AnimalArmature|Walk";

// TimeScale walk anim (retour user 29/08 \"il glisse malgre l'idle\").
// Walk cycle Wolf natif calibre pour vitesse deplacement inconnue.
// Boost 1.3 = 30% plus rapide → 2.6 cycles/sec au lieu de 2, meilleure
// impression de foulee vs vitesse traverse.
const WALK_TIME_SCALE = 1.3;

// Preload GLB (drei helper) — chargement au premier render du site,
// évite délai lag au premier spawn.
useGLTF.preload("/models/xolotl.glb");

export default function XolotlCompanion() {
  const direction = useCurrentDirection();
  const readingMode = useReadingMode();
  const groupRef = useRef<Group>(null);
  const [spawn, setSpawn] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const alreadyWitnessed = useMemo(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("nahual-xolotl-witnessed") === "1";
  }, []);

  const { scene, animations } = useGLTF("/models/xolotl.glb");
  const { actions } = useAnimations(animations, groupRef);

  // Fresnel obsidienne via onBeforeCompile sur MeshBasicMaterial
  // (29/08 iter 8 : ShaderMaterial custom cassait skinning Wolf.glb
  // → chien fige en bind pose, ne marchait plus). MeshBasicMaterial
  // gere skinning natif via chunks three.js, on injecte fresnel
  // dans les slots standards.
  //
  // Fresnel : edges perpendiculaires camera opaques, centre face-a-
  // face transparent → silhouette lumineuse, corps see-through.
  // Signature "psychopompe fantomatique" — Xolotl guide entre mondes
  // vivants/morts, n'appartient pas totalement a un cote.
  //
  // uBoost 2.8 : edges brillent au-dela de 1.0 en linear space →
  // PostFX Bloom capte cette luminescence et cree halo naturel.
  //
  // Uniforms partages par reference : crees au mount, injectes dans
  // shader.uniforms via onBeforeCompile. Modif shaderUniforms.uOpacity
  // impacte le shader compile immediatement, evite race condition
  // "onBeforeCompile pas encore appele au 1er frame".
  const shaderUniforms = useRef({
    uPower: { value: 2.2 },
    uBoost: { value: 2.8 },
    uOpacity: { value: 0 },
  }).current;
  const fresnelMaterial = useMemo(() => {
    const mat = new MeshBasicMaterial({
      color: new Color(XOLOTL_COLOR),
      transparent: true,
      depthWrite: false,
      fog: false,
    });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uPower = shaderUniforms.uPower;
      shader.uniforms.uBoost = shaderUniforms.uBoost;
      shader.uniforms.uOpacity = shaderUniforms.uOpacity;
      // Vertex : MeshBasicMaterial declare deja transformedNormal
      // dans son bloc `#if defined(USE_ENVMAP) || defined(USE_SKINNING)`
      // en tete de main(). SkinnedMesh → USE_SKINNING auto → objectNormal
      // et transformedNormal existent apres skinning au moment de
      // <fog_vertex>. On lit juste ces vars, aucune re-declaration.
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
           varying vec3 vFresnelNormal;
           varying vec3 vFresnelView;`
        )
        .replace(
          "#include <fog_vertex>",
          `#include <fog_vertex>
           vFresnelNormal = normalize(transformedNormal);
           vec4 mvPosXolotl = modelViewMatrix * vec4(transformed, 1.0);
           vFresnelView = normalize(-mvPosXolotl.xyz);`
        );
      // Fragment : remplace couleur finale par fresnel-boosted.
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
           uniform float uPower;
           uniform float uBoost;
           uniform float uOpacity;
           varying vec3 vFresnelNormal;
           varying vec3 vFresnelView;`
        )
        .replace(
          "#include <opaque_fragment>",
          `float fresnel = pow(1.0 - abs(dot(normalize(vFresnelNormal), normalize(vFresnelView))), uPower);
           vec3 finalXolotlCol = diffuse * (1.0 + fresnel * uBoost);
           gl_FragColor = vec4(finalXolotlCol, fresnel * uOpacity);`
        );
    };
    return mat;
  }, []);

  useEffect(() => {
    scene.traverse((child) => {
      const mesh = child as Mesh;
      if (mesh.isMesh) {
        mesh.material = fresnelMaterial;
        mesh.renderOrder = 999;
      }
    });
  }, [scene, fresnelMaterial]);

  // Décide spawn une fois par session/direction. sessionStorage évite
  // re-random au re-mount SPA (nav retour sur même page).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isBot() || readingMode.active) {
      setSpawn(false);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSpawn(false);
      return;
    }
    const key = `nahual-xolotl-spawn-${direction}`;
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
      // Signale "xolotl visible" via event pour WitnessMessage
      // ephemere (retour user 29/08 : message doit apparaitre
      // seulement quand chien apparait, pas persistant).
      window.dispatchEvent(new CustomEvent("nahual-xolotl-appearing", { detail: { visible: true } }));
    }, delay);
    return () => window.clearTimeout(timer);
  }, [spawn, alreadyWitnessed, actions]);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    if (startedAt === null) {
      g.visible = false;
      return;
    }
    g.visible = true;
    const elapsed = performance.now() - startedAt;
    if (elapsed > TOTAL_MS) {
      // Anim complète — marque témoignage si tab visible
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
      // Signale "xolotl hidden" — WitnessMessage restera visible
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
    // Update uniform opacity fresnel — ref partagee entre React et
    // shader via onBeforeCompile, pas de race condition.
    shaderUniforms.uOpacity.value = opacity;
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
    <group ref={groupRef} scale={XOLOTL_SCALE} rotation={[0, Math.PI / 2, 0]} visible={false}>
      <primitive object={scene} />
    </group>
  );
}
