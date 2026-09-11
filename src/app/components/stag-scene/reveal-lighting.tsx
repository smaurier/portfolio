"use client";

import type { MutableRefObject } from "react";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Color, type AmbientLight, type DirectionalLight, type Fog, type Object3D, type PointLight, type SpotLight } from "three";
import { EMBER_COLOR, EMBER_DISTANCE, freezeShadow, persistentLights, thawShadow } from "./persistent-lights";
import {
  getAmbientIntensity,
  getDirectionalIntensity,
  getFogColor,
  getRimColorBlend,
  type ColorRgb,
} from "@/lib/reveal-arc";
import { remapNorthArc } from "@/lib/direction-arc";
import { remapWestArc, westFogTint } from "@/lib/ouest-arc";
import { eastFogTint } from "@/lib/est-arc";
import { dayAtArc, lightPAtArc, sunInTheWest } from "@/lib/arc-day";
import { frostStore } from "./frost-store";
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
  // Les lumieres persistantes (11/09, voir persistent-lights) : montees ici
  // sur toutes les pages, pilotees par leurs composants de direction.
  const serpentRef = useRef<SpotLight>(null);
  const serpentTargetRef = useRef<Object3D>(null);
  const sunRef = useRef<SpotLight>(null);
  const sunTargetRef = useRef<Object3D>(null);
  const emberRef = useRef<PointLight>(null);
  const gl = useThree((s) => s.gl);
  const shadowPrimedRef = useRef(false);
  const dirShadowActiveRef = useRef(false);
  const serpentShadowActiveRef = useRef(false);
  useEffect(() => {
    persistentLights.serpent = serpentRef.current;
    persistentLights.serpentTarget = serpentTargetRef.current;
    persistentLights.sun = sunRef.current;
    persistentLights.sunTarget = sunTargetRef.current;
    persistentLights.ember = emberRef.current;
    return () => {
      persistentLights.serpent = null;
      persistentLights.serpentTarget = null;
      persistentLights.sun = null;
      persistentLights.sunTarget = null;
      persistentLights.ember = null;
    };
  }, []);
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

  // LA LUMINOSITE DE LA SCENE, PUBLIEE AU CSS (11/09). Les panneaux de texte
  // sont translucides (0,32 a 0,38 d'opacite, choix de Sylvain du 27/08 :
  // « trop lourds avec le contour marque »), et l'audit du 10/09 a trouve
  // six blocs sous 4,5:1, tous pour la meme raison : la scene s'eclaircit
  // derriere eux a mi-arc. Plutot que d'alourdir la nuit, le rig, qui
  // connait deja le jour de l'arc, le publie dans --scene-lum ; les panneaux
  // se densifient avec lui (globals.css). A l'Est, le gel est blanc avant
  // que le jour se leve : la glace compte comme du jour. Ecriture seulement
  // quand la valeur bouge de plus d'un centieme, pour ne pas toucher le DOM
  // a chaque image.
  const sceneLumRef = useRef(-1);

  useFrame(() => {
    const rawP = progressRef.current;
    // Arc inverse au Nord (01/09, option A + arrivee, cf direction-arc) :
    // scroller = descendre le Mictlan, la lumiere baisse au lieu de
    // s'eveiller ; en toute fin, arrivalGlow porte le moment d'arrivee
    // violet (la lueur du puits s'intensifie et accueille).
    const north = direction === "obsidienne" ? remapNorthArc(rawP) : null;
    // Arc inverse a l'Ouest aussi (06/09, ouest-arc) : le soleil tombe, la
    // lumiere descend du clair au crepuscule.
    const west = direction === "cendre" ? remapWestArc(rawP) : null;
    // Le progres de lumiere vient de arc-day (09/09) : une seule table pour
    // les cinq directions, au lieu d'une chaine de ternaires par fichier.
    const p = lightPAtArc(direction, rawP);
    const arrivalGlow = north?.arrivalGlow ?? 0;
    const blend = getRimColorBlend(p);
    // Crossfade du rig lumiere vers la direction courante (etage 2) :
    // snap direct si prefers-reduced-motion, meme convention que le fog.
    // Lune -> soleil (05/09) : le rig de la direction a un etat de nuit ; l'arc
    // de revelation l'emmene vers le jour (rigAtArc, identite pour les autres).
    const sc = getSceneControls();
    const rigTarget = rigAtArc(getLightRig(hour), dayAtArc(direction, rawP), sunInTheWest(direction, sc.cinematic && sc.cinematicAfternoon));

    {
      const frozen = frostStore.active ? frostStore.state.frost : 0;
      const lum = Math.min(1, Math.max(dayAtArc(direction, rawP), direction === "dore" ? frozen * 0.8 : 0));
      if (Math.abs(lum - sceneLumRef.current) > 0.01) {
        sceneLumRef.current = lum;
        document.documentElement.style.setProperty("--scene-lum", lum.toFixed(2));
      }
    }
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
      // L'OMBRE INVARIANTE (11/09, voir persistent-lights) : castShadow ne
      // bascule plus par direction, il est dans la cle des programmes ; c'est
      // la passe de profondeur qu'on gele hors du Sud, carte videe. A la
      // premiere image, un rendu de chaque carte pour qu'elle existe.
      const shadows = !sceneRefs?.reducedMotionRef.current && (sceneRefs?.perfProfile.shadows ?? true);
      const dl = directionalRef.current;
      const sp = serpentRef.current;
      if (dl.castShadow !== shadows) dl.castShadow = shadows;
      if (sp && sp.castShadow !== shadows) sp.castShadow = shadows;
      if (shadows) {
        if (!shadowPrimedRef.current) {
          shadowPrimedRef.current = true;
          dl.shadow.needsUpdate = true;
          dirShadowActiveRef.current = true;
          if (sp) {
            sp.shadow.needsUpdate = true;
            serpentShadowActiveRef.current = true;
          }
        } else {
          const wantDir = hour === "turquoise";
          if (wantDir !== dirShadowActiveRef.current) {
            dirShadowActiveRef.current = wantDir;
            if (wantDir) thawShadow(dl);
            else freezeShadow(gl, dl);
          }
          const wantSerpent = persistentLights.serpentShadowWanted;
          if (sp && wantSerpent !== serpentShadowActiveRef.current) {
            serpentShadowActiveRef.current = wantSerpent;
            if (wantSerpent) thawShadow(sp);
            else freezeShadow(gl, sp);
          }
        }
      }
    }
    if (fogRef.current) {
      // A l'Ouest, la teinte suit le crepuscule (abricot -> mauve), pas la page.
      // A l'Est (06/09), la brume passe du bleu gele au rouge de l'aube puis a l'or.
      fogRef.current.color.set(getFogColor(p, west ? westFogTint(west.dusk) : direction === "dore" ? eastFogTint(rawP) : fogTint));
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
      {/* Les lumieres persistantes (11/09) : le projecteur du serpent (Sud,
       * pilote par XiuhcoatlCompanion), le rayon de soleil (Est, SunBeam),
       * la braise de Xolotl (Nord). Intensite zero hors de leur direction :
       * le jeu de lumieres ne change jamais, les programmes non plus. */}
      <spotLight
        ref={serpentRef}
        color="#ff7a1a"
        intensity={0}
        distance={16}
        decay={2}
        angle={1.05}
        penumbra={0.7}
        shadow-mapSize={[512, 512]}
        shadow-bias={-0.0005}
        shadow-normalBias={0.05}
        shadow-camera-near={0.5}
        shadow-camera-far={45}
      />
      <object3D ref={serpentTargetRef} />
      <spotLight ref={sunRef} color="#ffd9a0" intensity={0} distance={40} angle={0.26} penumbra={0.7} decay={1.2} />
      <object3D ref={sunTargetRef} position={[0, 0.9, 0]} />
      <pointLight ref={emberRef} color={EMBER_COLOR} intensity={0} distance={EMBER_DISTANCE} decay={2} />
    </>
  );
}
