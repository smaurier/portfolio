"use client";

import { useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { applyDepthFade } from "./depth-fade";

/**
 * Enveloppe les éléments de fond/décor (sol, montagnes, flore) dans un seul
 * group patché en perspective atmosphérique (cf depth-fade.ts) ; plus
 * simple qu'appeler applyDepthFade dans chacun des 5 composants concernés
 * (Ground, Mountains, BackgroundFlora, Ocotillo, Grass) : le traverse()
 * d'applyDepthFade descend tout le sous-arbre quel que soit le composant
 * qui a créé chaque matériau.
 *
 * Patché dans useFrame plutôt qu'un useEffect au montage : certains enfants
 * (flore CC0 sous Suspense) montent après le premier rendu, leurs matériaux
 * n'existent pas encore au moment d'un effet posé une seule fois, même
 * raison déjà documentée pour le recadrage par bounding box ailleurs dans
 * ce projet. applyDepthFade est idempotent (WeakSet), le coût par frame
 * quand tout est déjà patché est négligeable (un traverse + des `.has()`).
 */
export default function EnvironmentDepthFade({ children }: { children: ReactNode }) {
  const groupRef = useRef<Group>(null);

  useFrame(() => {
    if (groupRef.current) applyDepthFade(groupRef.current);
  });

  return <group ref={groupRef}>{children}</group>;
}
