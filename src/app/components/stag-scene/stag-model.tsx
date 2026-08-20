"use client";

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import { Box3, Vector3, type AnimationAction, type Group } from "three";
import {
  getDirectionalIntensity,
  getIdleClipName,
  getNavEmphasis,
  getRevealPhase,
  getWalkCyclePhase,
  getWalkOffsetZ,
} from "@/lib/reveal-arc";
import { applyRimLight, setRimLightColor, setRimLightIntensity, type RimLightUniforms } from "./rim-light";

const MODEL_PATH = "/models/stag.glb";
// Hauteur voulue en unités de scène, pas l'échelle native du GLB (les packs
// Quaternius exportent parfois dans une autre unité — mesurée, pas devinée :
// sans normalisation le modèle remplissait l'écran dès la hanche).
// Essai à 2.6 le 17/08 ("le cerf pourrait être plus grand") : remis à 2,
// l'idée reste ouverte mais mitigée (cf project-nahual-da) — mélangée à un
// changement de rayon caméra en même temps, on ne pouvait plus dire lequel
// des deux produisait quoi. À retester isolément si l'hypothèse revient.
const TARGET_HEIGHT = 2;

// Fonctions séparées plutôt qu'une assignation directe dans les useFrame
// ci-dessous : eslint-plugin-react-hooks (compilateur React 19) refuse une
// mutation directe sur une valeur issue d'un hook (ici `actions`, issu de
// useAnimations) dans un useFrame, mais pas un appel de fonction qui mute
// en interne — même raison que setRimLightIntensity (rim-light.ts).
function stopActionRealtime(action: AnimationAction | null | undefined) {
  if (action) action.timeScale = 0;
}

function scrubAction(action: AnimationAction | null | undefined, time: number) {
  if (action) action.time = time;
}

/**
 * Le cerf (Quaternius, CC0, pack "Animated Animal Pack" — cf memory
 * project-nahual-da). Séquence d'entrée en 4 temps (retour de Sylvain le
 * 18/08, cf src/lib/reveal-arc.ts) : Walk (avance — pas de root motion dans
 * le rig, l'avancée est pilotée ici par-dessus la position de repos) →
 * Eating (se pose, broute) → Idle_2 (passage bref) → Idle (tête relevée,
 * état final dès qu'il "remarque" le visiteur). Toujours pas de tête qui
 * pivote vers la caméra, ce beat-là reste au palier suivant (pas de clip
 * dédié dans le rig, nécessite une rotation d'os pilotée par code).
 *
 * `noticedRef` : partagé avec le parent (StagScene) plutôt que dérivé
 * seulement du scroll ici — retour de Sylvain le 18/08 : "on pourrait avoir
 * d'autres événements sur la scène liés à ce point qui feront aussi que le
 * cerf lève la tête rapidement" (ex. le mouvement de souris de l'effet de
 * révélation). Ce composant pose lui-même le déclencheur scroll (dès la
 * prise de conscience) mais n'est pas le seul à pouvoir mettre `noticedRef`
 * à true — jamais remis à false une fois vrai, quelle qu'en soit la cause.
 */
export default function StagModel({
  progressRef,
  noticedRef,
}: {
  progressRef: MutableRefObject<number>;
  noticedRef: MutableRefObject<boolean>;
}) {
  const group = useRef<Group>(null);
  const { scene, animations } = useGLTF(MODEL_PATH);
  const { actions } = useAnimations(animations, group);
  const currentClipRef = useRef<string | null>(null);
  // Position Z de repos (posée par l'effet de recadrage ci-dessous) — la
  // marche d'entrée (getWalkOffsetZ) s'ajoute par-dessus dans le useFrame
  // dédié, jamais en remplacement (sinon on écraserait le recadrage).
  const restZRef = useRef(0);
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
    restZRef.current = -center.z * scale;
    scene.position.set(-center.x * scale, -box.min.y * scale, restZRef.current);
  }, [scene]);

  useEffect(() => {
    const clip = getIdleClipName(progressRef.current, noticedRef.current);
    const action = actions[clip];
    // Walk est "scrubé" par le scroll (cf useFrame plus bas), pas joué en
    // temps réel — timeScale=0 empêche le mixer de faire avancer .time tout
    // seul, seule la lecture manuelle de .time doit le faire bouger.
    if (clip === "Walk") stopActionRealtime(action);
    action?.reset().fadeIn(0.3).play();
    currentClipRef.current = clip;
    return () => {
      action?.fadeOut(0.3);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- progressRef/noticedRef lus une fois au montage, la suite est gérée par useFrame ci-dessous.
  }, [actions]);

  useFrame(() => {
    // Déclencheur scroll du "remarqué" : dès la prise de conscience, pas de
    // retour en arrière. D'autres déclencheurs (ex. mouvement de souris)
    // peuvent aussi mettre noticedRef à true ailleurs dans l'arbre — cette
    // ligne ne fait qu'ajouter celui-ci, jamais ne l'annule.
    if (!noticedRef.current && getRevealPhase(progressRef.current) !== "penombre") {
      noticedRef.current = true;
    }

    const wantClip = getIdleClipName(progressRef.current, noticedRef.current);
    if (wantClip === currentClipRef.current) return;

    actions[currentClipRef.current ?? ""]?.fadeOut(0.4);
    const nextAction = actions[wantClip];
    if (wantClip === "Walk") stopActionRealtime(nextAction);
    nextAction?.reset().fadeIn(0.4).play();
    currentClipRef.current = wantClip;
  });

  useFrame(() => {
    // Avance pendant "Walk" (cf getIdleClipName/getWalkOffsetZ) — le clip
    // lui-même n'a pas de root motion (vérifié dans le rig), l'avancée est
    // pilotée ici, par-dessus la position de repos posée par le recadrage
    // ci-dessus (jamais en remplacement).
    scene.position.setZ(restZRef.current + getWalkOffsetZ(progressRef.current));
  });

  useFrame(() => {
    // "Le cerf ne doit marcher qu'au scroll, sinon position de repos, même
    // si on est dans le pourcentage donné" (retour de Sylvain le 18/08) —
    // jouer Walk en temps réel désynchronisait les jambes de l'avancée du
    // corps (scroll-driven ci-dessus) : à scroll rapide, le corps arrivait
    // avant que les jambes n'aient eu le temps d'animer, lu comme un
    // glissement. .time posé directement chaque frame (cf getWalkCyclePhase,
    // pure fonction du scroll) plutôt que laissé au mixer : si le scroll
    // s'arrête, la pose reste figée, aucune avancée en temps réel.
    const walkAction = actions.Walk;
    if (walkAction && currentClipRef.current === "Walk") {
      const duration = walkAction.getClip().duration;
      scrubAction(walkAction, getWalkCyclePhase(progressRef.current) * duration);
    }
  });

  useFrame(() => {
    // Le liseré capte la lumière qui monte avec l'arc de reveal, comme le
    // reste de la scène (RevealLighting) — jamais dominant (×0.4), un
    // simple accent qui suit le même rythme dramatique plutôt qu'une
    // intensité fixe déconnectée de la narration.
    const intensity = getDirectionalIntensity(progressRef.current) * 0.4;
    setRimLightIntensity(rimUniforms, intensity);
    // Doré (repos) -> jade (climax) sur "chemins révélés" (retour de
    // Sylvain le 20/08) — même fenêtre que l'emphase de nav
    // (getNavEmphasis), déjà jade au même instant : le liseré et le nav
    // deviennent le même signal de révélation.
    setRimLightColor(rimUniforms, getNavEmphasis(progressRef.current));
  });

  return <primitive ref={group} object={scene} />;
}

useGLTF.preload(MODEL_PATH);
