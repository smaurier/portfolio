"use client";

import { Suspense, type MutableRefObject } from "react";
import type { ColorRgb } from "@/lib/reveal-arc";
import BackgroundFlora from "./background-flora";
import CardinalAmbience from "./ambience/cardinal-ambience";
import CursorRevealScene from "./cursor-reveal-scene";
import EnvironmentDepthFade from "./environment-depth-fade";
import Grass from "./grass";
import Ground from "./ground";
import Milpa from "./milpa";
import Ocotillo from "./ocotillo";
import OrbitCamera from "./orbit-camera";
import PiedraGround from "./piedra-ground";
import RevealLighting from "./reveal-lighting";
import StagModel from "./stag-model";
import Vines from "./vines";

/**
 * Contenu 3D partagé entre la home et les pages écho (Services/Projets/
 * Contact/Mémoire) depuis le 25/08. Première variante par direction
 * activée le 25/08 (soir) : la couleur cible du fog et du liseré du
 * cerf change par page (Codex Nahual section 03 — home=jade,
 * Services=doré, Projets=turquoise, Contact=cendre, Mémoire=obsidienne).
 * Les couleurs sont résolues une seule fois dans SceneStage (à partir
 * de la variable CSS de la direction) et propagées ici via ctx. Le
 * reste de la scène (flore, animations, cadrage caméra) reste
 * identique — les enrichissements par direction (pose du cerf,
 * densité de flore, ambiance) viendront quand nous les coderons
 * (Sylvain : "chaque scène sera spécifique et enrichie").
 */
export default function SceneContent({
  progressRef,
  noticedRef,
  climaxRimColor,
  climaxAccentColor,
  fogTint,
}: {
  progressRef: MutableRefObject<number>;
  noticedRef: MutableRefObject<boolean>;
  climaxRimColor: string;
  climaxAccentColor: string;
  fogTint: ColorRgb;
}) {
  return (
    <>
      {/* Le fog vit dans RevealLighting (couleur pilotée par le scroll,
       * cf getFogColor) — un seul point de vérité. climaxRimColor tinte
       * les lumières ambient+directional au climax pour que le décor
       * PBR entier suive la direction cardinale (retour Sylvain 26/08). */}
      <RevealLighting progressRef={progressRef} fogTint={fogTint} climaxRimColor={climaxRimColor} />
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
            <PiedraGround />
          </Suspense>
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
          <StagModel
            progressRef={progressRef}
            noticedRef={noticedRef}
            climaxRimColor={climaxRimColor}
            climaxAccentColor={climaxAccentColor}
          />
        </Suspense>
        <Suspense fallback={null}>
          <Milpa progressRef={progressRef} />
        </Suspense>
        <Suspense fallback={null}>
          <Vines progressRef={progressRef} />
        </Suspense>
      </CursorRevealScene>
      <OrbitCamera progressRef={progressRef} />
      <CardinalAmbience />
    </>
  );
}
