"use client";

import { useEffect, useRef } from "react";
import { useAnimations, useGLTF } from "@react-three/drei";
import { Box3, Vector3, type Group } from "three";

const MODEL_PATH = "/models/stag.glb";
// Hauteur voulue en unités de scène, pas l'échelle native du GLB (les packs
// Quaternius exportent parfois dans une autre unité — mesurée, pas devinée :
// sans normalisation le modèle remplissait l'écran dès la hanche).
const TARGET_HEIGHT = 2;

/**
 * Le cerf (Quaternius, CC0, pack "Animated Animal Pack" — cf memory
 * project-nahual-da). Palier 0 : juste l'Idle, pas encore de mise en scène
 * (reveal/échos viennent dans un palier suivant).
 */
export default function StagModel() {
  const group = useRef<Group>(null);
  const { scene, animations } = useGLTF(MODEL_PATH);
  const { actions } = useAnimations(animations, group);

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
    const idle = actions["Idle"];
    idle?.reset().fadeIn(0.3).play();
    return () => {
      idle?.fadeOut(0.3);
    };
  }, [actions]);

  return <primitive ref={group} object={scene} />;
}

useGLTF.preload(MODEL_PATH);
