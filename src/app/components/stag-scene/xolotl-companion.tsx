"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import { MeshBasicMaterial, type Group, type Mesh } from "three";
import { isBot } from "@/lib/is-bot";
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
const FADE_MS = 2_500;
const TRAVERSE_MS = 9_000;
const TOTAL_MS = FADE_MS * 2 + TRAVERSE_MS; // 14 s

// Amplitude X (29/08 iter 2 recul Z=-10). A cette distance depuis
// camera radius ~5-7, FOV 45° rend ~±12 units visibles. On pousse
// a [-8, 8] pour plus longue traverse laterale, cohérent perspective
// eloignee (le chien parcourt un plus grand chemin apparent car il
// est loin).
const START_X = -8;
const END_X = 8;
// Z=-10 (retour user 29/08 "encore plus loin"). Silhouette perçue
// ~25% taille cerf → guide silencieux vraiment lointain.
// Attention : fog scene near=10 far=34 (voir reveal-lighting.tsx).
// Le chien peut passer legerement au-dela du fog near. material.fog
// est neanmoins false sur Xolotl → immune. renderOrder 999 = rendu
// par-dessus fog visuellement. Verifie safe.
const Z_DEPTH = -10;
// Y=0 : niveau sol du cerf.
const Y_LEVEL = 0;
// Peak opacity 0.7 : visible malgre distance et fond climax teinte.
const PEAK_OPACITY = 0.7;

const XOLOTL_COLOR = "#6b3fa8"; // Obsidienne violet nocturne

// Scale du Wolf.glb (~2 units natif) → 1.4 = ~2.8 unit world. Aux
// yeux depuis camera radius 5+ regardant Z=-10, la silhouette
// apparait ~25% taille cerf (perspective naturelle). Boost scale
// legere compense la distance sans ecraser la perception "lointain".
const XOLOTL_SCALE = 1.4;

// Nom de l'animation Walk dans le Wolf.glb Quaternius. Convention
// pack Animals : "AnimalArmature|<AnimName>".
const WALK_ANIM = "AnimalArmature|Walk";

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

  // Override matériaux originaux Wolf → MeshBasicMaterial obsidienne
  // semi-transparent. Une fois au mount, réappliqué à chaque scene
  // reload defensive.
  //
  // depthWrite:false : evite conflits transparence avec autres meshes
  //   de la scene 3D (Xolotl ne "cache" pas ce qui est derriere).
  // depthTest:true (defaut) : RESPECTE l'occlusion Z — Xolotl a Z=-2
  //   passe DERRIERE le cerf (Z~0). Correct visuellement.
  //   (Retire depthTest:false du fix precedent qui faisait passer
  //   Xolotl devant le cerf malgre sa position arriere — retour user
  //   29/08 "il passe par dessus lui, c'est tres etrange".)
  // renderOrder=999 : rendu APRES les meshes opaques -> transparency
  //   sort correcte, evite artefacts alpha meme si occlusion Z active.
  // fog:false : immune au brouillard eventuel — le chien du
  //   crepuscule n'appartient pas a l'atmosphere de la scene.
  useEffect(() => {
    scene.traverse((child) => {
      const mesh = child as Mesh;
      if (mesh.isMesh) {
        mesh.material = new MeshBasicMaterial({
          color: XOLOTL_COLOR,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          fog: false,
        });
        mesh.renderOrder = 999;
      }
    });
  }, [scene]);

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
        walk.reset().play();
      }
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
      return;
    }
    // Position lerp gauche → droite
    const t = elapsed / TOTAL_MS;
    const x = START_X + (END_X - START_X) * t;
    g.position.set(x, Y_LEVEL, Z_DEPTH);
    // Enveloppe fade in/out
    let opacity = PEAK_OPACITY;
    if (elapsed < FADE_MS) {
      opacity *= elapsed / FADE_MS;
    } else if (elapsed > FADE_MS + TRAVERSE_MS) {
      const fadeOutT = (elapsed - FADE_MS - TRAVERSE_MS) / FADE_MS;
      opacity *= 1 - fadeOutT;
    }
    // Applique opacité à tous les mesh du group (materials override
    // ont déjà transparent:true)
    g.traverse((child) => {
      const mesh = child as Mesh;
      if (mesh.isMesh) {
        const mat = mesh.material as MeshBasicMaterial;
        if (mat && "opacity" in mat) mat.opacity = opacity;
      }
    });
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
