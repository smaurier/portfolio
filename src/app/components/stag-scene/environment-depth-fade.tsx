"use client";

import { useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3, type Group } from "three";
import { HEARTH_WORLD } from "@/lib/foyer";
import { applyDepthFade, fireGradeUniforms } from "./depth-fade";
import { useAtmosphereHour } from "./use-atmosphere-hour";
import { useSceneRefs } from "./scene-refs-context";

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
 *
 * 08/09 : pilote aussi LA DÉSATURATION PAR LE FEU (lib/fire-grade). Au
 * Centre, ce n'est plus la distance à la caméra qui retire la couleur mais
 * la distance au foyer. Deux écritures par image pour toute la scène : le
 * fondu et la position du foyer en espace caméra. Le cerf n'est pas
 * concerné, il vit hors de ce group : il se tient près du feu et garde sa
 * couleur.
 *
 * L'heure ATMOSPHÉRIQUE et non la route (useAtmosphereHour) : pendant un
 * passage cardinal, la désaturation traverse les heures avec le fog, le rig
 * et le grade, au lieu de basculer d'un coup à la navigation.
 */

/** Même cadence de crossfade que les autres blends du rig (~800 ms). */
const FIRE_BLEND_SPEED = 0.06;

export default function EnvironmentDepthFade({ children }: { children: ReactNode }) {
  const groupRef = useRef<Group>(null);
  const hour = useAtmosphereHour();
  const sceneRefs = useSceneRefs();
  const hearthWorld = useMemo(
    () => new Vector3(HEARTH_WORLD.x, HEARTH_WORLD.y, HEARTH_WORLD.z),
    [],
  );

  useFrame(({ camera }) => {
    if (groupRef.current) applyDepthFade(groupRef.current);

    const target = hour === "jade" ? 1 : 0;
    const blend = fireGradeUniforms.uFireBlend;
    // Sous mouvement réduit, le canvas tourne en frameloop "demand" et cesse
    // de rendre : un fondu progressif y resterait figé à mi-chemin. On pose
    // la valeur d'arrivée tout de suite (même réflexe que CardinalAmbience).
    if (sceneRefs?.reducedMotionRef.current) {
      blend.value = target;
    } else {
      const next = blend.value + (target - blend.value) * FIRE_BLEND_SPEED;
      // Accroche exacte aux deux bornes : sinon `uFireBlend` traîne un
      // résidu à 0,0004 et le branchement du shader reste allumé pour rien.
      blend.value = Math.abs(target - next) < 0.001 ? target : next;
    }

    if (blend.value > 0) {
      // worldToLocal met à jour la matrice monde de la caméra avant de
      // l'inverser : la position est donc juste même si OrbitCamera a déjà
      // bougé la caméra dans son propre useFrame ce tour-ci.
      fireGradeUniforms.uFireHearthView.value.copy(hearthWorld);
      camera.worldToLocal(fireGradeUniforms.uFireHearthView.value);
    }
  });

  return <group ref={groupRef}>{children}</group>;
}
