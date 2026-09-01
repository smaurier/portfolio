"use client";

import { useEffect, useRef, type MutableRefObject, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group } from "three";
import { getRevealFloor } from "@/lib/reveal-arc";
import { applyCursorReveal, createCursorRevealUniforms, setCursorRevealFloor } from "./cursor-reveal";

/**
 * Enveloppe toute la scène 3D dans la révélation par curseur (cf
 * cursor-reveal.ts) : portée confirmée par Sylvain le 18/08 ("tous les
 * éléments de la scène 3D"), donc englobe aussi le cerf/le maïs/les lianes,
 * pas seulement l'environnement (contrairement à EnvironmentDepthFade qui,
 * lui, exclut délibérément le sujet).
 *
 * `noticedRef` : le premier mouvement de souris compte comme "remarquer le
 * visiteur", au même titre que le scroll (StagModel pose aussi ce
 * déclencheur) : retour de Sylvain : "d'autres événements sur la scène
 * liés à ce point [...] feront aussi que le cerf lève la tête rapidement."
 * Jamais remis à false.
 *
 * Patché dans useFrame plutôt qu'un useEffect au montage : certains
 * enfants (flore CC0 sous Suspense) montent après le premier rendu : même
 * raison déjà documentée pour environment-depth-fade.tsx. applyCursorReveal
 * est idempotent (WeakSet dans cursor-reveal.ts), le coût par frame quand
 * tout est déjà patché est négligeable.
 *
 * `progressRef` (20/08) : le plancher de révélation (opacité/saturation
 * minimales, cf cursor-reveal.ts) suit maintenant le scroll plutôt que de
 * rester figé : retour de Sylvain : "on est encore majoritairement en noir
 * et blanc et transparence à la fin", la scène restait grise/translucide
 * hors du rayon du curseur même à "chemins révélés".
 */
export default function CursorRevealScene({
  children,
  noticedRef,
  progressRef,
}: {
  children: ReactNode;
  noticedRef: MutableRefObject<boolean>;
  progressRef: MutableRefObject<number>;
}) {
  const groupRef = useRef<Group>(null);
  const { gl } = useThree();
  const uniformsRef = useRef(createCursorRevealUniforms());
  const pointerRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = gl.domElement;

    function handlePointerMove(event: PointerEvent) {
      const rect = canvas.getBoundingClientRect();
      pointerRef.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      noticedRef.current = true;
    }

    // pointermove (pas mousemove) : couvre aussi le glisser tactile, seul
    // signal de mouvement disponible sur un écran sans souris. `window`
    // plutôt que le seul canvas : la révélation doit pouvoir commencer dès
    // qu'on approche, pas seulement une fois pile au-dessus du canvas.
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [gl, noticedRef]);

  useFrame(() => {
    const canvas = gl.domElement;
    const dpr = gl.getPixelRatio();
    const uniforms = uniformsRef.current;
    uniforms.uResolution.value.set(canvas.width, canvas.height);

    if (pointerRef.current) {
      // gl_FragCoord a son origine en bas à gauche (convention WebGL),
      // clientY en haut à gauche (convention DOM) : inversion nécessaire.
      // *dpr : clientX/Y sont en pixels CSS, gl_FragCoord en pixels du
      // framebuffer (canvas.width/height, déjà mis à l'échelle par R3F).
      uniforms.uMouse.value.set(
        pointerRef.current.x * dpr,
        canvas.height - pointerRef.current.y * dpr,
      );
    }

    if (groupRef.current) applyCursorReveal(groupRef.current, uniforms);
    setCursorRevealFloor(uniforms, getRevealFloor(progressRef.current));
  });

  return <group ref={groupRef}>{children}</group>;
}
