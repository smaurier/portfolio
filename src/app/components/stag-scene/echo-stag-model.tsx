"use client";

import { useEffect, useMemo, useRef } from "react";
import { useAnimations, useGLTF } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import type { Group } from "three";
import { centerAndScale } from "./center-model";
import { applyRimLight } from "./rim-light";

const MODEL_PATH = "/models/stag.glb";
const TARGET_HEIGHT = 2;

export type EchoClip = "Idle" | "Idle_Headlow" | "Idle_2" | "Gallop";

/**
 * Le cerf rejoué en fenêtre décorative sur Services/Projets/Contact (cf
 * echo-stag.tsx) — même glb que la scène plein écran de la home
 * (stag-model.tsx), mais une instance indépendante : `useGLTF` cache et
 * renvoie la MÊME `scene` pour chaque appel avec la même URL, donc muter
 * scale/position/matériaux directement dessus impacterait aussi le cerf de
 * la home. `SkeletonUtils.clone` (three-stdlib, dépendance transitive de
 * drei) est nécessaire plutôt qu'un `Object3D.clone()` superficiel : seul
 * lui préserve correctement le binding squelette/os d'un mesh skinné/animé
 * comme celui-ci.
 *
 * `centerAndScale` (partagé avec stag-model.tsx via center-model.ts) et
 * `applyRimLight` sont appliqués sur le clone, jamais sur `scene` — même
 * raison d'isolation. `useAnimations` gère seul la mise à jour du mixer par
 * frame (pas de second appel manuel à `getMixer().update()` : ça doublerait
 * la vitesse de lecture, cf stag-model.tsx qui a le même piège pour ses
 * clips hors Walk).
 */
export default function EchoStagModel({
  clip,
  rimColor,
}: {
  clip: EchoClip;
  rimColor: string;
}) {
  const group = useRef<Group>(null);
  const { scene, animations } = useGLTF(MODEL_PATH);
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    centerAndScale(clone, TARGET_HEIGHT);
  }, [clone]);
  useEffect(() => {
    applyRimLight(clone, { color: rimColor, intensity: 0.5 });
  }, [clone, rimColor]);
  useEffect(() => {
    const action = actions[clip];
    action?.reset().fadeIn(0.3).play();
    return () => {
      action?.fadeOut(0.3);
    };
  }, [actions, clip]);

  return <primitive ref={group} object={clone} />;
}

useGLTF.preload(MODEL_PATH);
