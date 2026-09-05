"use client";

import type { MutableRefObject } from "react";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, type AmbientLight, type DirectionalLight, type Fog } from "three";
import {
  getAmbientIntensity,
  getDirectionalIntensity,
  getFogColor,
  getRevealFloor,
  getRimColorBlend,
  type ColorRgb,
} from "@/lib/reveal-arc";
import { remapNorthArc } from "@/lib/direction-arc";
import { approachFog, getFogRange, type FogRange } from "@/lib/direction-fog";
import { approachRig, getLightRig, rigAtArc, type LightRig } from "@/lib/direction-light";
import { useCurrentDirection } from "./use-current-direction";
import { useAtmosphereHour } from "./use-atmosphere-hour";
import { useSceneRefs } from "./scene-refs-context";
import { getSceneControls } from "../scene-controls-store";

/**
 * Lumière (+ brouillard, depuis le 20/08) de l'arc de reveal (palier 1, cf
 * memory project-nahual-da) : pénombre → prise de conscience → face-à-face
 * → chemins révélés, pilotée par la même progression de scroll que la
 * caméra (src/lib/reveal-arc.ts). Intensités/couleur appliquées via ref +
 * useFrame plutôt que prop/state React, même raison que OrbitCamera : ça
 * change à chaque frame de scroll.
 *
 * Le brouillard vivait avant dans stag-scene.tsx (couleur fixe #000000) :
 * déplacé ici : retour de Sylvain le 20/08 (intégrer le jade à la scène,
 * cf memory project-nahual-da : étude concurrentielle, piste "lueur
 * d'ambiance") : sa teinte fait maintenant partie du même système que
 * l'intensité lumineuse plutôt qu'un prop statique séparé.
 */
export default function RevealLighting({
  progressRef,
  fogTint,
  climaxRimColor,
}: {
  progressRef: MutableRefObject<number>;
  fogTint?: ColorRgb;
  climaxRimColor?: string;
}) {
  const ambientRef = useRef<AmbientLight>(null);
  const directionalRef = useRef<DirectionalLight>(null);
  const fogRef = useRef<Fog>(null);
  const direction = useCurrentDirection();
  // Heure atmospherique (03/09 etage 3 Nepantla) : fog et rig lumiere
  // suivent l'heure traversee du voyage du soleil pendant un passage
  // cardinal (l'arc Nord, lui, reste sur la route : c'est une
  // mecanique de scroll d'identite, pas d'atmosphere).
  const hour = useAtmosphereHour();
  const sceneRefs = useSceneRefs();
  // Fog par direction (01/09, etage 1 sprint identites) : near/far
  // crossfadent vers la cible de la direction courante, meme cadence
  // que les ambiances cardinales (~800ms). Init sur la direction du
  // mount : pas de lerp-in depuis une valeur d'une autre page.
  const fogRangeRef = useRef<FogRange>({ ...getFogRange(hour) });
  // Rig lumiere par direction (01/09, etage 2 sprint identites) : meme
  // logique de crossfade que le fog. Init sur la direction du mount.
  const lightRigRef = useRef<LightRig>({ ...getLightRig(hour) });
  const rigColorScratch = useMemo(() => new Color(), []);

  // Palette pour tinter les lumières au climax (26/08, retour Sylvain
  // "on a de la couleur sur le cerf mais il faudrait aussi en prévoir
  // sur plusieurs faces du décor, la scène aussi devrait suivre le
  // même traitement"). Tinter les lumières fait porter la teinte
  // cardinale à TOUT le décor PBR (sol, montagnes, milpa, vines,
  // ocotillo, cempasúchils, flore de fond) via l'éclairage : pas
  // besoin de patcher chaque matériau.
  const whiteColor = useMemo(() => new Color(1, 1, 1), []);
  const cardinalColor = useMemo(() => new Color(climaxRimColor ?? "#00c078"), [climaxRimColor]);
  // Scratchs alloués une seule fois : mutés dans useFrame plutôt que
  // recréés à chaque tick (même pattern que rim-light climaxColorScratch).
  const ambientColorScratch = useMemo(() => new Color(), []);
  const directionalColorScratch = useMemo(() => new Color(), []);

  useFrame(() => {
    const rawP = progressRef.current;
    // Arc inverse au Nord (01/09, option A + arrivee, cf direction-arc) :
    // scroller = descendre le Mictlan, la lumiere baisse au lieu de
    // s'eveiller ; en toute fin, arrivalGlow porte le moment d'arrivee
    // violet (la lueur du puits s'intensifie et accueille).
    const north = direction === "obsidienne" ? remapNorthArc(rawP) : null;
    const p = north ? north.lightP : rawP;
    const arrivalGlow = north?.arrivalGlow ?? 0;
    const blend = getRimColorBlend(p);
    // Crossfade du rig lumiere vers la direction courante (etage 2) :
    // snap direct si prefers-reduced-motion, meme convention que le fog.
    // Lune -> soleil (05/09) : le rig de la direction a un etat de nuit ; l'arc
    // de revelation l'emmene vers le jour (rigAtArc, identite pour les autres).
    const rigTarget = rigAtArc(getLightRig(hour), getRevealFloor(p), getSceneControls().tenochtitlan && getSceneControls().tenochtitlanAfternoon);
    lightRigRef.current = sceneRefs?.reducedMotionRef.current
      ? { ...rigTarget }
      : approachRig(lightRigRef.current, rigTarget, 0.06);
    const rig = lightRigRef.current;
    rigColorScratch.set(rig.color);
    if (ambientRef.current) {
      ambientRef.current.intensity = getAmbientIntensity(p) * rig.ambientScale;
      // Tint ambient 65% (28/08 recalibré après boost raté à 100% :
      // trop d'ambient teinté coloriait le cerf ENTIER uniformément
      // via l'éclairage global, contradictoire avec l'objectif "cerf
      // sobre témoin"). 65% laisse assez de lumière blanche
      // résiduelle pour que les matériaux gardent leurs couleurs
      // natives, cardinal se lit dans les tons moyens.
      ambientColorScratch.copy(whiteColor).lerp(cardinalColor, blend * 0.15);
      ambientRef.current.color.copy(ambientColorScratch);
    }
    if (directionalRef.current) {
      // arrivalGlow : la lueur du puits s'intensifie a l'arrivee au
      // Chicunamictlan (moment violet de fin, distinct de l'eveil home).
      directionalRef.current.intensity =
        getDirectionalIntensity(p) * rig.directionalScale + arrivalGlow * 0.85;
      // Directional 45% (recalibré 28/08 depuis 75%) : la
      // directionnelle porte les hautes lumières : trop teintée elle
      // colore les crêtes cerf+décor uniformément, 45% laisse un
      // éclairage principal quasi-blanc qui préserve la lecture
      // "cerf brun mystique".
      directionalColorScratch.copy(whiteColor).lerp(cardinalColor, blend * 0.1);
      // Teinte rig par-dessus la logique historique : colorMix dose la
      // couleur de la source diegetique (0 partout sauf Nord : la lueur
      // froide du puits #8a7fb0, contre-jour Mictlampa).
      directionalColorScratch.lerp(rigColorScratch, rig.colorMix);
      // A l'arrivee, la lueur vire au violet obsidienne franc.
      if (arrivalGlow > 0) directionalColorScratch.lerp(cardinalColor, arrivalGlow * 0.6);
      directionalRef.current.color.copy(directionalColorScratch);
      directionalRef.current.position.set(rig.position[0], rig.position[1], rig.position[2]);
      const wantShadow = hour === "turquoise" && !sceneRefs?.reducedMotionRef.current && (sceneRefs?.perfProfile.shadows ?? true);
      if (directionalRef.current.castShadow !== wantShadow) directionalRef.current.castShadow = wantShadow;
    }
    if (fogRef.current) {
      fogRef.current.color.set(getFogColor(p, fogTint));
      // Densite par direction : snap direct si prefers-reduced-motion
      // (RGAA 13.6, meme convention que le crossfade des ambiances),
      // sinon easing exponentiel vers la cible.
      const target = getFogRange(hour);
      fogRangeRef.current = sceneRefs?.reducedMotionRef.current
        ? { ...target }
        : approachFog(fogRangeRef.current, target, 0.06);
      fogRef.current.near = fogRangeRef.current.near;
      fogRef.current.far = fogRangeRef.current.far;
    }
  });

  return (
    <>
      {/* near/far au-delà de l'orbite caméra (radius max 9) : le fog ne
       * doit jamais assombrir la scène proche, seulement l'horizon :
       * inchangé depuis stag-scene.tsx, seule la couleur bouge désormais. */}
      <fog ref={fogRef} attach="fog" args={["#000000", 10, 34]} />
      <ambientLight ref={ambientRef} />
      {/* Ombres (05/09) : projetees au Sud seulement (castShadow pilote par
       * useFrame), carte 2048, frustum ortho sur la scene proche (le cerf, la
       * Piedra, les epines), biais pour eviter l'acne sur le low poly. */}
      <directionalLight
        ref={directionalRef}
        position={[4, 6, 4]}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={40}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
    </>
  );
}
