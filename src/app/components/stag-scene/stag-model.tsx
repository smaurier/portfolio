"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import { Box3, Vector3, type Group } from "three";
import { getIdleClipName } from "@/lib/reveal-arc";

const MODEL_PATH = "/models/stag.glb";
// Hauteur voulue en unités de scène, pas l'échelle native du GLB (les packs
// Quaternius exportent parfois dans une autre unité — mesurée, pas devinée :
// sans normalisation le modèle remplissait l'écran dès la hanche).
const TARGET_HEIGHT = 2;

/**
 * Le cerf (Quaternius, CC0, pack "Animated Animal Pack" — cf memory
 * project-nahual-da). Palier 1 : crossfade Idle_Headlow → Idle au rythme de
 * l'arc de reveal (tête basse tant qu'il n'a pas remarqué le visiteur,
 * cf src/lib/reveal-arc.ts) — toujours pas de tête qui pivote vers la
 * caméra, ce beat-là reste au palier suivant (pas de clip dédié dans le rig,
 * nécessite une rotation d'os pilotée par code).
 */
export default function StagModel({
  progressRef,
}: {
  progressRef: MutableRefObject<number>;
}) {
  const group = useRef<Group>(null);
  const { scene, animations } = useGLTF(MODEL_PATH);
  const { actions } = useAnimations(animations, group);
  const currentClipRef = useRef<string | null>(null);

  useEffect(() => {
    // Recadre le modèle sur son propre bounding box : hauteur fixée à
    // TARGET_HEIGHT, posé au sol (y=0), centré en X/Z. Mutation directe de
    // `scene` (pas de clone) : une seule instance sur cette page pour
    // l'instant — à revoir avec SkeletonUtils.clone() le jour où le même
    // cerf est réutilisé sur plusieurs pages (écho Services/Projets/Contact,
    // cf project-nahual-da).
    const box = new Box3().setFromObject(scene);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const scale = size.y > 0 ? TARGET_HEIGHT / size.y : 1;

    scene.scale.setScalar(scale);
    scene.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
  }, [scene]);

  useEffect(() => {
    const clip = getIdleClipName(progressRef.current);
    actions[clip]?.reset().fadeIn(0.3).play();
    currentClipRef.current = clip;
    return () => {
      actions[clip]?.fadeOut(0.3);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- progressRef lu une fois au montage, la suite est gérée par useFrame ci-dessous.
  }, [actions]);

  useFrame(() => {
    const wantClip = getIdleClipName(progressRef.current);
    if (wantClip === currentClipRef.current) return;

    actions[currentClipRef.current ?? ""]?.fadeOut(0.4);
    actions[wantClip]?.reset().fadeIn(0.4).play();
    currentClipRef.current = wantClip;
  });

  return <primitive ref={group} object={scene} />;
}

useGLTF.preload(MODEL_PATH);
