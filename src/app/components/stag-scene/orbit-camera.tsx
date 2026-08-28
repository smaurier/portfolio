"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { getOrbitCameraPosition, getOrbitCameraTarget } from "@/lib/camera-path";
import { CARDINAL_VECTORS, useCardinalTransition } from "./cardinal-transition-context";

/**
 * Applique à chaque frame la trajectoire pure de src/lib/camera-path.ts.
 * progressRef est un ref (pas un state) : la position du scroll change à
 * haute fréquence, la faire transiter par le state React re-rendrait tout
 * l'arbre à chaque tick pour rien — useFrame lit le ref directement.
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
const PARALLAX_X = 0.35;
const PARALLAX_Y = 0.25;
const MOUSE_LERP = 0.08;

export default function OrbitCamera({
  progressRef,
}: {
  progressRef: MutableRefObject<number>;
}) {
  const { camera } = useThree();
  // Position souris cible (normalisée -1..1) et position lissée qui
  // rattrape doucement — évite un mouvement caméra saccadé sur chaque
  // événement pointermove.
  const mouseTargetRef = useRef({ x: 0, y: 0 });
  const mouseSmoothRef = useRef({ x: 0, y: 0 });
  const reducedMotionRef = useRef(false);
  const transition = useCardinalTransition();

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function onPointerMove(event: PointerEvent) {
      // -1..1 normalisé sur toute la fenêtre. clientY inversé plus tard
      // dans useFrame (convention "haut d'écran = vers le haut du monde"
      // pour le décalage caméra).
      mouseTargetRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseTargetRef.current.y = (event.clientY / window.innerHeight) * 2 - 1;
    }
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, []);

  useFrame(() => {
    // Lissage exponentiel de la souris (pas de deriv brusque au tick suivant).
    mouseSmoothRef.current.x += (mouseTargetRef.current.x - mouseSmoothRef.current.x) * MOUSE_LERP;
    mouseSmoothRef.current.y += (mouseTargetRef.current.y - mouseSmoothRef.current.y) * MOUSE_LERP;

    const position = getOrbitCameraPosition(progressRef.current);
    const target = getOrbitCameraTarget();

    // Parallaxe : décale la position caméra XY selon la souris, la cible
    // reste ancrée sur le cerf → orbite légère autour du sujet. Y inversé
    // (clientY descend, caméra doit monter).
    const parallaxX = reducedMotionRef.current ? 0 : mouseSmoothRef.current.x * PARALLAX_X;
    const parallaxY = reducedMotionRef.current ? 0 : -mouseSmoothRef.current.y * PARALLAX_Y;

    // Burst cardinal "cerf mène" (28/08) — pendant la fenêtre de
    // transition (500ms), la caméra dérive doucement dans la
    // direction cible en plus de sa position d'orbite normale. Bell
    // curve sur le progress transition, amplitude ~0.6 unité monde
    // (subtile). Combiné au head-look cerf : les 2 tirent le regard
    // vers la nouvelle direction avant le mount de la nouvelle page.
    let burstX = 0;
    let burstY = 0;
    let burstZ = 0;
    if (transition?.transitionDirection && transition.transitionProgressRef.current > 0) {
      const t = transition.transitionProgressRef.current;
      const bell = Math.sin(t * Math.PI); // 0→1→0
      const amp = bell * 0.6;
      const vec = CARDINAL_VECTORS[transition.transitionDirection];
      burstX = vec[0] * amp;
      burstY = vec[1] * amp;
      burstZ = vec[2] * amp;
    }

    camera.position.set(
      position.x + parallaxX + burstX,
      position.y + parallaxY + burstY,
      position.z + burstZ,
    );
    camera.lookAt(target.x, target.y, target.z);
  });

  return null;
}
