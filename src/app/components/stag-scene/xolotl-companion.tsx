"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import { MeshBasicMaterial, type Group, type Mesh } from "three";
import { isBot } from "@/lib/is-bot";
import { useReadingMode } from "@/lib/reading-mode-context";
import { getTerrainHeight } from "@/lib/terrain-height";
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

// Amplitude X (29/08 iter 5 fix invisible). Trajet arc simplifie.
const START_X = -9;
const END_X = 9;

// Arc en Z reduit amplitude (fix invisible retour user). Chien
// commence loin (-12), passe milieu plus proche (-8), redevient loin
// (-12). Amplitude arc reduite pour eviter passage trop proche cerf
// central qui creait masquage visuel.
const Z_FAR = -12;
const Z_NEAR = -8;

// Peak opacity 0.75 : visible malgre distance + fond climax teinte.
const PEAK_OPACITY = 0.75;

const XOLOTL_COLOR = "#6b3fa8"; // Obsidienne violet nocturne

// Taille reelle (retour user 29/08 "chien ne devrait arriver qu'a la
// fin des pattes du cerf" — anatomiquement correct Xolo vs cerf =
// ratio ~0.35). Mesh Wolf.glb ~2 units natif → scale 0.35 = ~0.7
// unit world = tiers taille cerf central (~1.5 unit). Coherent
// perception anatomique.
const XOLOTL_SCALE = 0.35;

// Offset Y au-dessus du terrain — Wolf.glb centre pivot pas exactement
// aux pattes. Boost positif (fix invisible 29/08) : le chien flottait
// peut-etre dans le terrain a Y=0. +0.2 le releve au-dessus des
// dunes de bruit.
const Y_OFFSET_ABOVE_TERRAIN = 0.2;

// Terrain height threshold : au-dela le chien est considere derriere
// une colline/montagne trop haute → fade out opacite pour signaler
// "il disparait dans le relief". Signature naturelle "il descend
// derriere la colline".
const TERRAIN_HIDE_THRESHOLD = 2.5;

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

  // Override matériaux originaux Wolf → MeshBasicMaterial obsidienne
  // semi-transparent. Une fois au mount, réappliqué à chaque scene
  // reload defensive.
  //
  // depthWrite:false : evite conflits transparence avec autres meshes
  //   de la scene 3D (Xolotl ne "cache" pas ce qui est derriere).
  // depthTest:true (defaut) : RESPECTE l'occlusion Z — Xolotl passe
  //   DERRIERE cerf + cactus + colline naturellement.
  // fog:false : immune au brouillard eventuel — le chien du
  //   crepuscule n'appartient pas a l'atmosphere de la scene.
  // renderOrder:999 : rendu APRES les autres transparents/climax pour
  //   sort transparency correct. Combine avec depthTest:true =
  //   \"rendu en dernier MAIS bloque par opaques Z\" - occlusion cerf/
  //   cactus/montagnes OK, ET visible malgre fond climax teinte
  //   (fix user 29/08 iter 5 \"pas visible bout scroll\").
  //   ATTENTION : ne PAS combiner avec depthTest:false (ferait
  //   passer par-dessus opaques = bug precedent \"passe par dessus
  //   cactus\").
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
    // Position — trajet arc : X lerp lineaire, Z varie en arc concave
    // (loin aux bords, proche au milieu). Y suit le terrain.
    // Rotation orientee vers la direction de deplacement (heading
    // tangent au path) → chien regarde toujours devant lui.
    const t = elapsed / TOTAL_MS;
    const x = START_X + (END_X - START_X) * t;
    const z = Z_FAR + (Z_NEAR - Z_FAR) * Math.sin(Math.PI * t);
    const terrainY = getTerrainHeight(x, z);
    g.position.set(x, terrainY + Y_OFFSET_ABOVE_TERRAIN, z);

    // Enveloppe fade in/out standard
    let opacity = PEAK_OPACITY;
    if (elapsed < FADE_MS) {
      opacity *= elapsed / FADE_MS;
    } else if (elapsed > FADE_MS + TRAVERSE_MS) {
      const fadeOutT = (elapsed - FADE_MS - TRAVERSE_MS) / FADE_MS;
      opacity *= 1 - fadeOutT;
    }
    // Fade supplementaire selon relief : si terrain trop haut (colline
    // devant lui), reduit opacite pour effet "disparait derriere
    // colline". Smooth transition entre 2 et 2.5 units terrain height.
    if (terrainY > TERRAIN_HIDE_THRESHOLD) {
      const overshoot = terrainY - TERRAIN_HIDE_THRESHOLD;
      const hideT = Math.min(1, overshoot / 1.5);
      opacity *= 1 - hideT;
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
