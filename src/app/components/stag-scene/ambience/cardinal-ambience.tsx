/* eslint-disable react-hooks/immutability, react-hooks/refs -- pattern gamedev r3f useFrame : mutations de refs 60 fps sont legitimes en 3D. */
"use client";

import { Suspense, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import type { DirectionKey } from "../direction-colors";
import { useAtmosphereHour } from "../use-atmosphere-hour";
import { useSceneRefs } from "../scene-refs-context";
import EastTonatiuh from "./east-tonatiuh";
import SouthHuitzilopochtli from "./south-huitzilopochtli";
import WestEhecatl from "./west-ehecatl";
import NorthMictlantecuhtli from "./north-mictlantecuhtli";
import CenterXiuhtecuhtli from "./center-xiuhtecuhtli";

/**
 * Ambiances mytho par direction (28/08, task #43 audit SOTY). Chaque
 * point cardinal reçoit son mood signature nahua :
 *  - Est / doré        → god-rays Tonatiuh (soleil)
 *  - Sud / turquoise   → colibri Huitzilopochtli
 *  - Ouest / cendre    → streamers vent Ehecatl
 *  - Nord / obsidienne → fumée + éclats Mictlantecuhtli
 *  - Centre / jade     → embers Xiuhtecuhtli (feu axial)
 *
 * Les 5 moods sont montés en permanence, chacun avec son uAlpha
 * uniform variant 0..1 selon la direction courante. Fade smooth 800ms
 * quand la direction change (lerp ref frame-based, pas de state
 * React à chaque frame). Cost : 5 Points systems modestes, mais 4
 * d'entre eux ont uAlpha ~= 0 la plupart du temps donc leurs frags
 * sont discardés très vite dans le shader.
 */

const FADE_SPEED = 0.06; // ~800ms pour aller de 0 à 1 (60fps × 0.06 = 3.6/frame, capé)

export default function CardinalAmbience() {
  // Heure atmospherique (03/09 etage 3 Nepantla) : pendant un passage
  // cardinal, les 5 moods s'allument tour a tour au fil des heures
  // traversees du voyage du soleil (god-rays de l'aube, colibri du
  // zenith, vent du crepuscule, fumee de minuit).
  const direction = useAtmosphereHour();
  // Refs alpha par mood, mutés dans useFrame, lus par les shaders des
  // enfants via un objet uniforms partagé.
  const alphaRefs = useMemo(
    () => ({
      dore: { current: 0 } as MutableRefObject<number>,
      turquoise: { current: 0 } as MutableRefObject<number>,
      cendre: { current: 0 } as MutableRefObject<number>,
      obsidienne: { current: 0 } as MutableRefObject<number>,
      jade: { current: 1 } as MutableRefObject<number>, // home = jade actif au boot
    }),
    []
  );

  const activeDirectionRef = useRef(direction);
  // Pattern gamedev useFrame : mutation de ref pour piloter les
  // valeurs frame-based sans re-render. Legitime dans un contexte 3D
  // r3f, le lint react-hooks/refs et immutability sont trop stricts
  // pour ce cas (60 fps de re-render React tuerait la perf).
   
  activeDirectionRef.current = direction;
  const sceneRefs = useSceneRefs();

  useFrame(() => {
    // Freeze crossfade si prefers-reduced-motion (RGAA 13.6) :
    // snap direction active a 1, autres a 0, sans lerp.
    const active = activeDirectionRef.current;
    if (sceneRefs?.reducedMotionRef.current) {
      for (const key of Object.keys(alphaRefs) as DirectionKey[]) {
         
        alphaRefs[key].current = key === active ? 1 : 0;
      }
      return;
    }
    for (const key of Object.keys(alphaRefs) as DirectionKey[]) {
      const target = key === active ? 1 : 0;
      const cur = alphaRefs[key].current;
      const diff = target - cur;
      if (Math.abs(diff) < 0.001) {
         
        alphaRefs[key].current = target;
      } else {
         
        alphaRefs[key].current = cur + Math.sign(diff) * Math.min(Math.abs(diff), FADE_SPEED);
      }
    }
  });

  return (
    <>
      <EastTonatiuh alphaRef={alphaRefs.dore} />
      <SouthHuitzilopochtli alphaRef={alphaRefs.turquoise} />
      <WestEhecatl alphaRef={alphaRefs.cendre} />
      {/* Suspense : North charge le sprite de volute via useTexture. */}
      <Suspense fallback={null}>
        <NorthMictlantecuhtli alphaRef={alphaRefs.obsidienne} />
      </Suspense>
      <CenterXiuhtecuhtli alphaRef={alphaRefs.jade} />
    </>
  );
}
