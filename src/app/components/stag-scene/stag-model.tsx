"use client";

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import { Box3, Vector3, type Group } from "three";
import { getDirectionalIntensity, getIdleClipName } from "@/lib/reveal-arc";
import { applyRimLight, setRimLightIntensity, type RimLightUniforms } from "./rim-light";

const MODEL_PATH = "/models/stag.glb";
// Hauteur voulue en unités de scène, pas l'échelle native du GLB (les packs
// Quaternius exportent parfois dans une autre unité — mesurée, pas devinée :
// sans normalisation le modèle remplissait l'écran dès la hanche).
// Essai à 2.6 le 17/08 ("le cerf pourrait être plus grand") : remis à 2,
// l'idée reste ouverte mais mitigée (cf project-nahual-da) — mélangée à un
// changement de rayon caméra en même temps, on ne pouvait plus dire lequel
// des deux produisait quoi. À retester isolément si l'hypothèse revient.
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
  // useMemo plutôt qu'un ref réassigné dans un effet : eslint-plugin-react-
  // hooks (compilateur React 19) refuse de muter une valeur affectée
  // dans/à partir d'un effet — useMemo garde le tableau d'uniforms stable
  // par référence (recalculé seulement si `scene` change), et useFrame
  // ci-dessous mute juste leurs `.value`, le seul moyen d'animer un uniform
  // Three.js par frame.
  const rimUniforms: RimLightUniforms[] = useMemo(() => applyRimLight(scene), [scene]);

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

  useFrame(() => {
    // Le liseré capte la lumière qui monte avec l'arc de reveal, comme le
    // reste de la scène (RevealLighting) — jamais dominant (×0.4), un
    // simple accent qui suit le même rythme dramatique plutôt qu'une
    // intensité fixe déconnectée de la narration.
    const intensity = getDirectionalIntensity(progressRef.current) * 0.4;
    setRimLightIntensity(rimUniforms, intensity);
  });

  return <primitive ref={group} object={scene} />;
}

useGLTF.preload(MODEL_PATH);
