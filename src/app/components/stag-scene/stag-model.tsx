"use client";

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import { Vector3, type Group } from "three";
import {
  getDirectionalIntensity,
  getHeadTurnAmount,
  getIdleClipName,
  getRevealPhase,
  getRimColorBlend,
} from "@/lib/reveal-arc";
import { centerAndScale } from "./center-model";
import { applyHeadLook } from "./head-look";
import { applyRimLight, setBodyTintAmount, setRimLightColor, setRimLightIntensity, type RimLightUniforms } from "./rim-light";

// Nom de l'os tête dans le rig Quaternius (GLB inspecté le 21/08, cf memory
// project-nahual-da : chaîne Neck1→Neck2→Neck3→Head→Stag_Horns/Head_end).
const HEAD_BONE_NAME = "Head";

// Plafond du regard caméra (21/08) : un seul os (Head) porte déjà une
// courbure de repos importante dans le rig (le cou "grazing" du bind pose,
// ~85° entre Neck3 et Head) — un blend complet (1) remplace cette courbure
// par une orientation absolue vers la cible, ce qui pousse le cou en
// extension complète et se lit comme cassé plutôt que comme un regard
// attentif (vérifié visuellement le 21/08 : tête tendue vers le ciel à
// blend=1). Plafonner à une fraction garde une partie de la pose naturelle
// mélangée au regard — un vrai tour de tête, pas un remplacement total.
const MAX_HEAD_TURN_BLEND = 0.4;

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
 * project-nahual-da). Séquence d'entrée (retour de Sylvain le 18/08, cf
 * src/lib/reveal-arc.ts) : Eating (se pose, broute) → Idle_2 (passage
 * bref) → Idle (tête relevée, état final dès qu'il "remarque" le
 * visiteur). Un temps "Walk" (avance scroll-scrubée) a existé entre le
 * 18/08 et le 20/08 — retiré (cf reveal-arc.ts pour le pourquoi), le cerf
 * apparaît directement à sa position de repos.
 *
 * `noticedRef` : partagé avec le parent (StagScene) plutôt que dérivé
 * seulement du scroll ici — retour de Sylvain le 18/08 : "on pourrait avoir
 * d'autres événements sur la scène liés à ce point qui feront aussi que le
 * cerf lève la tête rapidement" (ex. le mouvement de souris de l'effet de
 * révélation). Ce composant pose lui-même le déclencheur scroll (dès la
 * prise de conscience) mais n'est pas le seul à pouvoir mettre `noticedRef`
 * à true — jamais remis à false une fois vrai, quelle qu'en soit la cause.
 *
 * Regard caméra (21/08) : l'os Head pivote vers la caméra pendant le
 * face-à-face (getHeadTurnAmount), en layering par-dessus la pose du mixer
 * (applyHeadLook, cf head-look.ts — jamais un remplacement total). Pas de
 * vérification explicite de prefers-reduced-motion ici : `progressRef` ne
 * dépasse jamais 0 dans ce cas (le scroll est ignoré en amont, cf
 * stag-scene.tsx), donc getHeadTurnAmount(0) = 0 sans code dédié — même
 * raisonnement déjà appliqué à OrbitCamera/RevealLighting.
 */
export default function StagModel({
  progressRef,
  noticedRef,
  climaxRimColor,
}: {
  progressRef: MutableRefObject<number>;
  noticedRef: MutableRefObject<boolean>;
  climaxRimColor?: string;
}) {
  const group = useRef<Group>(null);
  const { scene, animations } = useGLTF(MODEL_PATH);
  const { actions } = useAnimations(animations, group);
  const currentClipRef = useRef<string | null>(null);
  const { camera } = useThree();
  // Scratch réutilisé d'une frame à l'autre (pas d'allocation dans la boucle
  // de rendu) — même principe que les scratch de head-look.ts.
  const cameraWorldPos = useMemo(() => new Vector3(), []);
  // useMemo plutôt qu'un ref réassigné dans un effet : eslint-plugin-react-
  // hooks (compilateur React 19) refuse de muter une valeur affectée
  // dans/à partir d'un effet — useMemo garde le tableau d'uniforms stable
  // par référence (recalculé seulement si `scene` change), et useFrame
  // ci-dessous mute juste leurs `.value`, le seul moyen d'animer un uniform
  // Three.js par frame.
  const rimUniforms: RimLightUniforms[] = useMemo(() => applyRimLight(scene), [scene]);
  // Centrage + résolution de l'os tête faits synchronement pendant le
  // render (pas dans un useEffect) : sans ça, une fenêtre d'un frame
  // existe entre le premier montage du `<primitive>` (scene à échelle
  // native, énorme) et l'exécution de l'effet — le LoadingVeil fade déjà
  // pendant cette fenêtre (useProgress hit 100 dès que le glb est
  // chargé) et l'utilisateur voit brièvement le cerf à taille brute
  // (bug reload trouvé le 25/08, cf memory project-nahual-da).
  // centerAndScale est désormais idempotente (reset avant mesure), un
  // éventuel double-invoke de useMemo (strict mode React 19) ne cassera
  // pas la mise à l'échelle.
  const headBone = useMemo(() => {
    centerAndScale(scene, TARGET_HEIGHT);
    return scene.getObjectByName(HEAD_BONE_NAME) ?? null;
  }, [scene]);

  useEffect(() => {
    const clip = getIdleClipName(progressRef.current, noticedRef.current);
    const action = actions[clip];
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
    nextAction?.reset().fadeIn(0.4).play();
    currentClipRef.current = wantClip;
  });

  useFrame(() => {
    // Le liseré capte la lumière qui monte avec l'arc de reveal, comme le
    // reste de la scène (RevealLighting) — jamais dominant (×0.4), un
    // simple accent qui suit le même rythme dramatique plutôt qu'une
    // intensité fixe déconnectée de la narration.
    const intensity = getDirectionalIntensity(progressRef.current) * 0.4;
    setRimLightIntensity(rimUniforms, intensity);
    // Doré (repos) -> teinte de la direction courante (climax) sur la
    // fenêtre du rim (getRimColorBlend, 0.5→1.0, élargie le 25/08 par
    // retour Sylvain : "que ça monte progressivement lorsqu'on arrive à
    // la fin" — l'ancien getNavEmphasis, 0.75→1.0, se lisait comme un
    // saut de couleur au tout dernier moment). Couleur cible par
    // direction (Codex Nahual section 03, cf memory) — jade par défaut
    // (home / centre) via `climaxRimColor`.
    const rimBlend = getRimColorBlend(progressRef.current);
    setRimLightColor(rimUniforms, rimBlend, climaxRimColor);
    // Body tint diffus sur tout le corps (pas juste le liseré) — même
    // timing que le rim, retour Sylvain 25/08 : "la couleur progressive
    // doit aussi venir sur le cerf" (le liseré seul se lisait comme un
    // détail, pas une transformation).
    setBodyTintAmount(rimUniforms, rimBlend);
  });

  useFrame(() => {
    // Registrée après les useFrame ci-dessus (mixer d'animation via
    // useAnimations, puis rim-light) : dans la boucle de rendu par défaut de
    // R3F, les callbacks de même priorité s'exécutent dans l'ordre
    // d'inscription — la pose de l'os Head posée par le mixer ce tick est
    // donc déjà à jour quand applyHeadLook la lit.
    if (!headBone) return;
    const blend = getHeadTurnAmount(progressRef.current) * MAX_HEAD_TURN_BLEND;
    if (blend <= 0) return;
    camera.getWorldPosition(cameraWorldPos);
    applyHeadLook(headBone, cameraWorldPos, blend);
  });

  return <primitive ref={group} object={scene} />;
}

useGLTF.preload(MODEL_PATH);
