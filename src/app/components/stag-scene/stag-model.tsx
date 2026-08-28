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
import { applyRimLight, setBodyTintAmount, setEdgeIntensity, setEdgePulse, setRimLightColor, setRimLightIntensity, type RimLightUniforms } from "./rim-light";
import StagAura from "./stag-aura";
import SpiritParticles from "./spirit-particles";
import { CARDINAL_VECTORS, useCardinalTransition } from "./cardinal-transition-context";
import { useSceneRefs } from "./scene-refs-context";

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
  climaxAccentColor,
}: {
  progressRef: MutableRefObject<number>;
  noticedRef: MutableRefObject<boolean>;
  climaxRimColor?: string;
  climaxAccentColor?: string;
}) {
  const group = useRef<Group>(null);
  // Wrapper dedie au breath cycle (28/08 fix majeur) — separe de
  // group=<primitive> qui refere le scene interne deja scale par
  // centerAndScale. Baseline 1, multiplie par breath (0.997..1.003)
  // uniforme sans casser scene interne.
  const breathGroupRef = useRef<Group>(null);
  const sceneRefs = useSceneRefs();
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

  // Reset explicite des uniforms au mount (ou quand la couleur de la
  // direction change). Sans ce reset, les valeurs sont celles laissées
  // par la dernière frame de la page précédente (useGLTF cache les
  // materials → uniforms partagés entre navigations SPA) — visible
  // pendant les ~16 ms qui séparent le mount du premier tick useFrame
  // (retour Sylvain 25/08 : "le cerf garde la même teinte entre deux
  // scènes... toutes les valeurs doivent être réinitialisées"). Le
  // premier useFrame écrira les valeurs pour progress courant (0
  // grâce au reset scroll de SceneStage), ce reset garantit juste que
  // rien de visible dans l'intervalle ne trahisse la page précédente.
  useEffect(() => {
    setRimLightColor(rimUniforms, 0, climaxRimColor);
    setRimLightIntensity(rimUniforms, getDirectionalIntensity(0) * 0.4);
    setBodyTintAmount(rimUniforms, 0);
    setEdgeIntensity(rimUniforms, 0);
    setEdgePulse(rimUniforms, 0.65);
  }, [rimUniforms, climaxRimColor]);
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

  useFrame((state) => {
    // Le liseré capte la lumière qui monte avec l'arc de reveal, comme le
    // reste de la scène (RevealLighting) — jamais dominant (×0.4), un
    // simple accent qui suit le même rythme dramatique plutôt qu'une
    // intensité fixe déconnectée de la narration.
    // 26/08 : pulse cardiaque ~4s (retour Sylvain post-audit — mêmes
    // constantes que StagAura pour que rim et halo respirent en phase).
    const pulse = 0.65 + 0.35 * Math.pow(Math.sin(state.clock.elapsedTime * Math.PI * 0.25), 4);
    // 26/08 : multiplicateur rim boosté 0.4 → 0.75 — puisque le body
    // tint est ramené à 0.25 (retour "cerf uniforme"), le rim doit
    // porter davantage la teinte cardinale au bord pour rester
    // lisible comme signature de direction plutôt que juste un accent.
    const intensity = getDirectionalIntensity(progressRef.current) * 0.25 * pulse;
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
    // Lignes claires sur les angles low-poly (26/08). Boost 1.4→2.5
    // (retour Sylvain "edge light pourrait être encore plus prononcé").
    // Intensity porte le blend, uEdgePulse porte la modulation forme
    // + colori (le shader multiplie les deux ensuite pour l'intensité
    // finale). Ligne fine + cardinal en valley, ligne épaisse + flash
    // blanc en peak → la ligne respire au lieu de juste s'atténuer.
    setEdgeIntensity(rimUniforms, rimBlend * 0.6);
    setEdgePulse(rimUniforms, pulse);
  });

  const transition = useCardinalTransition();
  // Scratch pour cible cardinale pendant la transition "cerf mène"
  // (28/08). Évite un new Vector3 par frame.
  const cardinalTargetScratch = useMemo(() => new Vector3(), []);
  // Regard mouse actif (28/08 boite outil B) — position souris
  // normalisee -1..1 pour piloter tete + un scratch monde pour la
  // cible virtuelle "curseur projete devant la scene".
  const mouseWorldTargetScratch = useMemo(() => new Vector3(), []);
  const mouseNormalizedRef = useRef({ x: 0, y: 0 });
  const mouseSmoothRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    function onMove(e: PointerEvent) {
      mouseNormalizedRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseNormalizedRef.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    }
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((state) => {
    // Cerf breath cycle (28/08 boite outil A, FIX MAJEUR 28/08 apres
    // retour Sylvain "cerf toujours super gros" + analyse code : mon
    // group.current.scale.setScalar(breath) ecrivait sur scene.scale
    // (car ref={group} etait sur <primitive> pas sur wrapper <group>)
    // qui a un scale centerAndScale ~0.4. setScalar(1.003) → cerf 2.5x
    // plus grand. Fix : breathGroupRef sur nouveau wrapper <group>
    // parent qui commence baseline 1, multiplie par breath sans casser
    // scene interne.
    if (breathGroupRef.current) {
      // Freeze breath cycle si prefers-reduced-motion (RGAA 13.6).
      const breath = sceneRefs?.reducedMotionRef.current
        ? 1
        : 1 + Math.sin(state.clock.elapsedTime * Math.PI * 0.5) * 0.003;
      breathGroupRef.current.scale.setScalar(breath);
    }
    // Registrée après les useFrame ci-dessus (mixer d'animation via
    // useAnimations, puis rim-light) : dans la boucle de rendu par défaut de
    // R3F, les callbacks de même priorité s'exécutent dans l'ordre
    // d'inscription — la pose de l'os Head posée par le mixer ce tick est
    // donc déjà à jour quand applyHeadLook la lit.
    if (!headBone) return;

    // Signature "cerf mène" (28/08) : pendant la fenêtre de transition
    // cardinale (500ms), la tête du cerf pivote vers un vecteur cardinal
    // au lieu de la caméra. Le blend est un ease-out sur les 500ms +
    // un plafond adaptatif (au-delà de MAX_HEAD_TURN_BLEND 0.4 par
    // moment court, jamais au-delà de 0.7 pour éviter le cou en
    // extension complète documenté 21/08).
    if (transition?.transitionDirection && transition.transitionProgressRef.current > 0) {
      const t = transition.transitionProgressRef.current; // 0→1 sur 500ms
      // Bell curve : monte 0→0.55 sur première moitié, reste au plafond
      // puis relâche à la toute fin — pointe la direction au plus fort
      // au milieu du burst, pas juste à la sortie.
      const bell = Math.sin(t * Math.PI); // 0→1→0
      const blend = Math.min(0.55, bell * 0.55);
      if (blend > 0.01) {
        const vec = CARDINAL_VECTORS[transition.transitionDirection];
        // Point cardinal éloigné dans la direction, hauteur légèrement
        // relevée pour que le cou reste dans un angle naturel.
        cardinalTargetScratch.set(vec[0] * 8, 1.5 + vec[1] * 4, vec[2] * 8);
        applyHeadLook(headBone, cardinalTargetScratch, blend);
        return;
      }
    }

    // Cas normal : cible = caméra + décalage souris (28/08 boite outil
    // B "cerf regard mouse actif"). Le cerf oriente activement sa
    // tete vers le curseur — cible = camera worldpos + offset lateral
    // proportionnel a mouseSmooth. Lissage 0.08 evite tremblements.
    mouseSmoothRef.current.x += (mouseNormalizedRef.current.x - mouseSmoothRef.current.x) * 0.08;
    mouseSmoothRef.current.y += (mouseNormalizedRef.current.y - mouseSmoothRef.current.y) * 0.08;

    const blend = getHeadTurnAmount(progressRef.current) * MAX_HEAD_TURN_BLEND;
    if (blend <= 0) return;
    camera.getWorldPosition(cameraWorldPos);
    // Cible virtuelle : depuis camera, decale de mouseSmooth * amplitude
    // sur les axes lateraux (X) et vertical (Y). Le cerf regarde donc
    // legerement decale ou est le curseur, pas juste vers la camera fixe.
    mouseWorldTargetScratch.copy(cameraWorldPos);
    // Amplitude mouse offset X 1.6, Y 0.8 (retour Sylvain 28/08
    // "cerf ne suit pas trop le curseur"). Milieu entre 2.5/1.5
    // (trop, cou extension excessive) et 0.8/0.5 (trop peu, invisible).
    mouseWorldTargetScratch.x += mouseSmoothRef.current.x * 1.6;
    mouseWorldTargetScratch.y -= mouseSmoothRef.current.y * 0.8;
    applyHeadLook(headBone, mouseWorldTargetScratch, blend);
  });

  return (
    <group>
      {/* Wrapper breath cycle (fix 28/08) — reference l'os scale
          separement de scene interne. Group parent breathGroupRef
          scaled uniforme 0.997..1.003, primitive interne inchange. */}
      <group ref={breathGroupRef}>
        <primitive ref={group} object={scene} />
      </group>
      {/* Halo diffus (26/08) — parenthèse dans le même repère que la
        * scène (déjà normalisée par centerAndScale), donc positionné en
        * dur au niveau du volume du cerf. climaxRimColor fallback jade
        * comme le reste des systèmes cardinaux. */}
      <StagAura
        progressRef={progressRef}
        climaxRimColor={climaxRimColor ?? "#00a86b"}
      />
      {/* Motes d'esprit cardinales (26/08, Phase 3 mytho) — flottent
        * autour du cerf en dérive lente, pulsent en phase avec le rim
        * et l'aura. Signal "esprits qui accompagnent le nahual" plus
        * qu'un décor abstrait. */}
      <SpiritParticles
        progressRef={progressRef}
        climaxRimColor={climaxRimColor ?? "#00a86b"}
        climaxAccentColor={climaxAccentColor ?? "#f97316"}
      />
    </group>
  );
}

useGLTF.preload(MODEL_PATH);
