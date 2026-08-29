"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, Mesh, MeshBasicMaterial } from "three";
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
 * Silhouette : mesh procédural minimaliste (5 primitives Three.js).
 * Cohérent avec le principe « évocation stylisée, pas reproduction »
 * du site (voir codex.respect). Couleur obsidienne semi-transparente,
 * matériau BasicMaterial (aucun coût lumière). Upgrade GLB Hunyuan
 * possible plus tard.
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
const TRAVERSE_MS = 12_000;
const TOTAL_MS = FADE_MS * 2 + TRAVERSE_MS; // 18 s

const START_X = -8;
const END_X = 8;
const Z_DEPTH = -4;
const Y_LEVEL = -0.5;
const PEAK_OPACITY = 0.35;

const XOLOTL_COLOR = "#6b3fa8"; // Obsidienne violet nocturne

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

  // Déclenche appear après delay
  useEffect(() => {
    if (!spawn) return;
    const delay = alreadyWitnessed ? APPEAR_DELAY_REPEAT_MS : APPEAR_DELAY_FIRST_MS;
    const timer = window.setTimeout(() => {
      setStartedAt(performance.now());
    }, delay);
    return () => window.clearTimeout(timer);
  }, [spawn, alreadyWitnessed]);

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
    // Applique opacité à tous les mesh matérialistes du group
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
    <group ref={groupRef} rotation={[0, Math.PI / 2, 0]} visible={false}>
      {/* Corps — capsule allongée */}
      <mesh position={[0, 0.45, 0]}>
        <capsuleGeometry args={[0.18, 0.6, 4, 8]} />
        <meshBasicMaterial color={XOLOTL_COLOR} transparent opacity={0} depthWrite={false} />
      </mesh>
      {/* Tête — sphere avant corps */}
      <mesh position={[0, 0.6, 0.45]}>
        <sphereGeometry args={[0.14, 8, 8]} />
        <meshBasicMaterial color={XOLOTL_COLOR} transparent opacity={0} depthWrite={false} />
      </mesh>
      {/* 4 pattes — cylindres */}
      {([[-0.13, 0.15, 0.25], [0.13, 0.15, 0.25], [-0.13, 0.15, -0.25], [0.13, 0.15, -0.25]] as const).map((pos, i) => (
        <mesh key={i} position={pos}>
          <cylinderGeometry args={[0.035, 0.035, 0.3, 6]} />
          <meshBasicMaterial color={XOLOTL_COLOR} transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
      {/* Queue — petit cylindre incliné */}
      <mesh position={[0, 0.5, -0.45]} rotation={[0, 0, Math.PI / 5]}>
        <cylinderGeometry args={[0.025, 0.025, 0.25, 6]} />
        <meshBasicMaterial color={XOLOTL_COLOR} transparent opacity={0} depthWrite={false} />
      </mesh>
      {/* Museau — petit cône devant tête */}
      <mesh position={[0, 0.58, 0.55]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.08, 0.15, 6]} />
        <meshBasicMaterial color={XOLOTL_COLOR} transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}
