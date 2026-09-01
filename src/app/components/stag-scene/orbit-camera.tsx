/* eslint-disable react-hooks/immutability -- fichier 3D r3f : useFrame mutations 60 fps, refs pour valeurs frame-based, Math.random init particules. Patterns gamedev legitimes. */
"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { PerspectiveCamera } from "three";
import { getOrbitCameraPosition, getOrbitCameraTarget } from "@/lib/camera-path";
import { remapNorthArc } from "@/lib/direction-arc";
import { CARDINAL_VECTORS, useCardinalTransition } from "./cardinal-transition-context";
import { useCurrentDirection } from "./use-current-direction";
import { useSceneRefs } from "./scene-refs-context";

/**
 * Applique à chaque frame la trajectoire pure de src/lib/camera-path.ts.
 * progressRef est un ref (pas un state) : la position du scroll change à
 * haute fréquence, la faire transiter par le state React re-rendrait tout
 * l'arbre à chaque tick pour rien : useFrame lit le ref directement.
 *
 * Parallaxe souris (27/08, retour Sylvain "effet paralaxe sur cerf pour
 * les mouvements de souris"). Signature Awwwards-level classique :
 * la caméra décale légèrement selon la position souris (XY normalisée
 * -1..1), la cible reste sur le cerf → l'orbite pivote autour du sujet
 * en fonction de l'utilisateur. Amplitude sub-unitaire pour rester
 * subtile (pas de gimmick), lerp 0.08 pour lisser les tremblements du
 * pointeur.
 *
 * Respect prefers-reduced-motion : parallaxe désactivée sous ce media,
 * même garde-fou d'accessibilité que le reste de l'arc (cf reveal-arc.ts
 * et cursor-reveal.ts).
 */
const PARALLAX_X = 0.5;
const PARALLAX_Y = 0.35;
const MOUSE_LERP = 0.08;
// Multiplicateur maximum du parallax pendant une onde Ollin (29/08).
// Au peak du press, la camera suit ×2.5 plus fort le curseur, decroit
// avec l'onde (~800ms). Signature "l'onde tire aussi le regard".
const OLLIN_PARALLAX_BOOST = 1.5;

/**
 * Touch drag orbit (28/08 task #50 mobile). Sur devices touch, un
 * swipe horizontal/vertical dérive l'orbite caméra avec accumulation
 * persistante : le cerf peut être observé sous plusieurs angles au
 * lieu du parallax souris limité aux -1..1 souris. Reset progressif
 * au relâchement pour ne pas rester bloqué.
 */
const TOUCH_ORBIT_X = 0.008; // rad par px horizontal
const TOUCH_ORBIT_Y = 0.005;
const TOUCH_DECAY = 0.02; // retour à 0 par frame

/**
 * Dolly amplitude par direction (28/08 task #44 camera cinéma). Chaque
 * direction reçoit son intensité de recul caméra pendant le burst,
 * conforme à sa signature mytho :
 *  - Est/dore Tonatiuh : dolly ample (+1.7) = ouverture solaire
 *  - Sud/turquoise Huitzilopochtli : dolly ample (+1.7) = envol vif
 *  - Ouest/cendre Ehecatl : dolly modéré (+1.3) = souffle latéral
 *  - Nord/obsidienne Mictlantecuhtli : dolly lent (+1.0) = enfoncement
 *  - Centre/jade Xiuhtecuhtli : dolly discret (+0.8) = recentrement axial
 */
const DOLLY_BY_DIRECTION: Record<string, number> = {
  dore: 1.7,
  turquoise: 1.7,
  cendre: 1.3,
  obsidienne: 1.0,
  jade: 0.8,
};

/**
 * Whip pan amplitude par direction (28/08 task #44). Pendant le burst,
 * la target du lookAt dérive dans la direction cardinale : la caméra
 * "regarde vers" la direction cible avant de revenir. Signature cinéma
 * (whip pan classique) sans faire tourner tout le monde 3D.
 */
const WHIP_PAN_AMPLITUDE = 1.6;

export default function OrbitCamera({
  progressRef,
}: {
  progressRef: MutableRefObject<number>;
}) {
  const { camera } = useThree();
  // Position souris cible (normalisée -1..1) et position lissée qui
  // rattrape doucement : évite un mouvement caméra saccadé sur chaque
  // événement pointermove.
  const mouseTargetRef = useRef({ x: 0, y: 0 });
  const mouseSmoothRef = useRef({ x: 0, y: 0 });
  const reducedMotionRef = useRef(false);
  // Touch drag orbit (task #50 mobile). Accumule un offset X/Y en radians
  // pendant le drag, decay à 0 progressif au relâchement.
  const touchOffsetRef = useRef({ x: 0, y: 0 });
  const touchLastRef = useRef<{ x: number; y: number } | null>(null);
  const transition = useCardinalTransition();
  const sceneRefs = useSceneRefs();
  const direction = useCurrentDirection();
  // Caméra Mictlampa (01/09, fiche Nord + retour Sylvain "jouer sur la
  // caméra : parcours ET traitement") : blend 0..1 crossfadé vers 1 au
  // Nord, qui pilote a la fois le traitement (FOV compressé -5°,
  // plongée légère, parallax amorti) et le parcours (le progress
  // caméra passe par remapNorthArc : en scrollant la caméra recule
  // dans l'obscurité au lieu du dolly d'éveil, puis se rapproche
  // doucement à l'arrivée).
  const northBlendRef = useRef(direction === "obsidienne" ? 1 : 0);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function onPointerMove(event: PointerEvent) {
      if (event.pointerType === "touch" && touchLastRef.current) {
        const dx = event.clientX - touchLastRef.current.x;
        const dy = event.clientY - touchLastRef.current.y;
        touchOffsetRef.current.x += dx * TOUCH_ORBIT_X;
        touchOffsetRef.current.y += dy * TOUCH_ORBIT_Y;
        touchLastRef.current = { x: event.clientX, y: event.clientY };
        return;
      }
      // Souris / stylet : parallax comme avant
      mouseTargetRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseTargetRef.current.y = (event.clientY / window.innerHeight) * 2 - 1;
    }
    function onPointerDown(event: PointerEvent) {
      if (event.pointerType === "touch") {
        touchLastRef.current = { x: event.clientX, y: event.clientY };
      }
    }
    function onPointerUp() {
      touchLastRef.current = null;
    }
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("pointercancel", onPointerUp, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, []);

  useFrame(() => {
    // Lissage exponentiel de la souris (pas de deriv brusque au tick suivant).
    mouseSmoothRef.current.x += (mouseTargetRef.current.x - mouseSmoothRef.current.x) * MOUSE_LERP;
    mouseSmoothRef.current.y += (mouseTargetRef.current.y - mouseSmoothRef.current.y) * MOUSE_LERP;

    // Mobile-aware camera path (28/08 retour Sylvain "le cerf doit
    // etre totalement visible en fin de page aussi"). Sur mobile
    // <768px, augmente radius + height pour garder cerf entier dans
    // le cadre malgre FOV plus large. Recalcule chaque frame (cheap)
    // pour reagir au resize.
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    // Blend Nord crossfadé (même cadence que fog/rig/grade).
    const northTarget = direction === "obsidienne" ? 1 : 0;
    northBlendRef.current += (northTarget - northBlendRef.current) * 0.06;
    const nb = northBlendRef.current;
    // Parcours : au Nord le progress caméra suit l'arc inversé (descente
    // puis arrivée), ailleurs le progress brut.
    const rawP = progressRef.current;
    const pEff = nb > 0.001 ? rawP + (remapNorthArc(rawP).lightP - rawP) * nb : rawP;
    const position = getOrbitCameraPosition(
      pEff,
      isMobile ? { startRadius: 8, endRadius: 4.8, startHeight: 3.2, endHeight: 2.0 } : {}
    );
    // Plongée légère Mictlampa : la caméra monte un peu, on regarde
    // vers le bas (on descend au Mictlan).
    position.y += nb * 0.45;
    const target = getOrbitCameraTarget();

    // Parallaxe : décale la position caméra XY selon la souris, la cible
    // reste ancrée sur le cerf → orbite légère autour du sujet. Y inversé
    // (clientY descend, caméra doit monter).
    // Boost Ollin (29/08) : pendant l'onde de press, la camera amplifie
    // sa reponse au parallax. Lu depuis window.__nahualOllinBoost pose
    // par OllinShockwave. 0 au repos, 1 au peak, decay avec l'onde.
    const ollinBoost = typeof window !== "undefined"
      ? (window as unknown as { __nahualOllinBoost?: { current: number } }).__nahualOllinBoost?.current ?? 0
      : 0;
    // Amorti Mictlampa : au Nord la caméra répond moins vivement (le
    // temps s'épaissit), parallax réduit de 40%.
    const parallaxMult = (1 + ollinBoost * OLLIN_PARALLAX_BOOST) * (1 - nb * 0.4);
    const parallaxX = reducedMotionRef.current ? 0 : mouseSmoothRef.current.x * PARALLAX_X * parallaxMult;
    const parallaxY = reducedMotionRef.current ? 0 : -mouseSmoothRef.current.y * PARALLAX_Y * parallaxMult;

    // Touch orbit offset : décay progressif au relâchement, sinon
    // reste. Ajoute au parallax pour combiner drag + repos.
    if (!touchLastRef.current) {
      touchOffsetRef.current.x *= 1 - TOUCH_DECAY;
      touchOffsetRef.current.y *= 1 - TOUCH_DECAY;
    }
    const touchX = reducedMotionRef.current ? 0 : touchOffsetRef.current.x * 2.0;
    const touchY = reducedMotionRef.current ? 0 : -touchOffsetRef.current.y * 2.0;

    // Burst cardinal "cerf mène" (28/08) : pendant la fenêtre de
    // transition (500ms), la caméra dérive dans la direction cible +
    // son FOV s'ouvre en zoom-out cinématique (Phase C
    // cinématographie). Bell curve sur le progress transition.
    // Amplitude dolly 1.4 (boostée de 0.6, retour Sylvain "vraie
    // désintégration + cinématographique"), FOV shift +6°
    // (45→51→45). Combiné au head-look cerf + PostFX bloom boost
    // (PostFX) : les 3 systèmes tirent la sensation cinéma vers la
    // direction cardinale.
    let burstX = 0;
    let burstY = 0;
    let burstZ = 0;
    let whipX = 0;
    let whipY = 0;
    let whipZ = 0;
    if (transition?.transitionDirection && transition.transitionProgressRef.current > 0) {
      const t = transition.transitionProgressRef.current;
      const bell = Math.sin(t * Math.PI); // 0→1→0
      const dollyAmp = DOLLY_BY_DIRECTION[transition.transitionDirection] ?? 1.4;
      const amp = bell * dollyAmp;
      const vec = CARDINAL_VECTORS[transition.transitionDirection];
      burstX = vec[0] * amp;
      burstY = vec[1] * amp;
      burstZ = vec[2] * amp;

      // Whip pan target (28/08 task #44) : la target du lookAt dérive
      // dans la direction cardinale pendant le burst. La caméra "regarde
      // vers" la direction cible avant de revenir. Bell curve légèrement
      // décalée (Math.pow bell 1.3) : le pan précède le dolly de
      // quelques ms, sensation "l'oeil se tourne AVANT que le corps
      // suive". Amplitude 1.6 : franchement lisible sans jamais faire
      // sortir le cerf du cadre.
      const panBell = Math.pow(bell, 1.3);
      whipX = vec[0] * panBell * WHIP_PAN_AMPLITUDE;
      whipY = vec[1] * panBell * WHIP_PAN_AMPLITUDE;
      whipZ = vec[2] * panBell * WHIP_PAN_AMPLITUDE;

      // FOV shift zoom-out cinema : la caméra "respire" pendant le
      // burst. camera est une PerspectiveCamera (Canvas fov: 45),
      // updateProjectionMatrix nécessaire pour que le changement
      // prenne effet visuel.
      // Base FOV responsive (28/08 retour Sylvain "l'ecran mobile
      // coupait la partie droite de la tete") : mobile <768px : 58° pour
      // capturer cerf entier + bois, sinon 45°.
      const baseFov = (typeof window !== "undefined" && window.innerWidth < 768 ? 58 : 45) - nb * 5;
      const perspCam = camera as PerspectiveCamera;
      if (perspCam.isPerspectiveCamera) {
        perspCam.fov = baseFov + bell * 6;
        perspCam.updateProjectionMatrix();
      }
    } else {
      // Retour repos FOV : safety, réévalue le base FOV responsive.
      const baseFov = (typeof window !== "undefined" && window.innerWidth < 768 ? 58 : 45) - nb * 5;
      const perspCam = camera as PerspectiveCamera;
      if (perspCam.isPerspectiveCamera && Math.abs(perspCam.fov - baseFov) > 0.5) {
        perspCam.fov = baseFov;
        perspCam.updateProjectionMatrix();
      }
    }

    // Pin face-a-face (boite outil #6) : retire dolly + fov shift
    // definitivement (retour Sylvain 28/08 "cerf super gros" ET
    // "deforme"). Le pin garde uniquement le bloom boost via PostFX
    // + palette shift future. Camera reste path normal, cerf reste
    // meme taille. La contemplation se fait par la lumiere qui
    // pulse, pas par le zoom close.
    camera.position.set(
      position.x + parallaxX + touchX + burstX,
      position.y + parallaxY + touchY + burstY,
      position.z + burstZ,
    );
    // Whip pan : décale la target du lookAt dans la direction cardinale.
    // La caméra pivote pour "regarder vers" la direction, puis revient
    // sur le cerf en fin de burst.
    camera.lookAt(target.x + whipX, target.y + whipY, target.z + whipZ);
  });

  return null;
}
