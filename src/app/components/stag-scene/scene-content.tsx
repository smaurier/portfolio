"use client";

import { Suspense, type MutableRefObject } from "react";
import BackgroundFlora from "./background-flora";
import CursorRevealScene from "./cursor-reveal-scene";
import EnvironmentDepthFade from "./environment-depth-fade";
import Grass from "./grass";
import Ground from "./ground";
import Milpa from "./milpa";
import Ocotillo from "./ocotillo";
import OrbitCamera from "./orbit-camera";
import RevealLighting from "./reveal-lighting";
import StagModel from "./stag-model";
import Vines from "./vines";

/**
 * Contenu 3D partagé entre la home et les pages écho (Services/Projets/
 * Contact/Mémoire) depuis le 25/08. Sylvain, même échange : "même arc de
 * reveal que la home mais il y aura des variantes, ne casse pas ce que
 * tu as commencé côté intérieur de la scène 3D. Chaque scène sera
 * spécifique et enrichie." — donc pour l'instant, aucune variante :
 * exactement la même scène partout, les enrichissements viendront quand
 * ils viendront (YAGNI). L'ossature de scroll/perf/loading vit dans
 * SceneStage, le mood/l'overlay HTML dans les appelants.
 */
export default function SceneContent({
  progressRef,
  noticedRef,
}: {
  progressRef: MutableRefObject<number>;
  noticedRef: MutableRefObject<boolean>;
}) {
  return (
    <>
      {/* Le fog vit dans RevealLighting (couleur pilotée par le scroll,
       * cf getFogColor) — un seul point de vérité. */}
      <RevealLighting progressRef={progressRef} />
      {/* Perspective atmosphérique (18/08, retour Sylvain : "plus on est
       * loin et plus ça devient gris, comme en peinture") — uniquement
       * sur le décor/fond, jamais sur le cerf (rim-light.ts à la place)
       * ni sur le maïs/les lianes (compagnons immédiats du sujet). */}
      {/* Révélation par curseur (18/08) — portée : toute la scène 3D,
       * cerf inclus (contrairement à EnvironmentDepthFade qui l'exclut). */}
      <CursorRevealScene noticedRef={noticedRef} progressRef={progressRef}>
        <EnvironmentDepthFade>
          <Ground />
          <Suspense fallback={null}>
            <BackgroundFlora />
          </Suspense>
          <Suspense fallback={null}>
            <Ocotillo />
          </Suspense>
          <Suspense fallback={null}>
            <Grass />
          </Suspense>
        </EnvironmentDepthFade>
        <Suspense fallback={null}>
          <StagModel progressRef={progressRef} noticedRef={noticedRef} />
        </Suspense>
        <Suspense fallback={null}>
          <Milpa progressRef={progressRef} />
        </Suspense>
        <Suspense fallback={null}>
          <Vines progressRef={progressRef} />
        </Suspense>
      </CursorRevealScene>
      <OrbitCamera progressRef={progressRef} />
    </>
  );
}
