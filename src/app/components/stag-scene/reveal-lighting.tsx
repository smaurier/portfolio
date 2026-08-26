"use client";

import type { MutableRefObject } from "react";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, type AmbientLight, type DirectionalLight, type Fog } from "three";
import {
  getAmbientIntensity,
  getDirectionalIntensity,
  getFogColor,
  getRimColorBlend,
  type ColorRgb,
} from "@/lib/reveal-arc";

/**
 * Lumière (+ brouillard, depuis le 20/08) de l'arc de reveal (palier 1, cf
 * memory project-nahual-da) : pénombre → prise de conscience → face-à-face
 * → chemins révélés, pilotée par la même progression de scroll que la
 * caméra (src/lib/reveal-arc.ts). Intensités/couleur appliquées via ref +
 * useFrame plutôt que prop/state React, même raison que OrbitCamera : ça
 * change à chaque frame de scroll.
 *
 * Le brouillard vivait avant dans stag-scene.tsx (couleur fixe #000000) —
 * déplacé ici : retour de Sylvain le 20/08 (intégrer le jade à la scène,
 * cf memory project-nahual-da — étude concurrentielle, piste "lueur
 * d'ambiance") — sa teinte fait maintenant partie du même système que
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

  // Palette pour tinter les lumières au climax (26/08, retour Sylvain
  // "on a de la couleur sur le cerf mais il faudrait aussi en prévoir
  // sur plusieurs faces du décor, la scène aussi devrait suivre le
  // même traitement"). Tinter les lumières fait porter la teinte
  // cardinale à TOUT le décor PBR (sol, montagnes, milpa, vines,
  // ocotillo, cempasúchils, flore de fond) via l'éclairage — pas
  // besoin de patcher chaque matériau.
  const whiteColor = useMemo(() => new Color(1, 1, 1), []);
  const cardinalColor = useMemo(() => new Color(climaxRimColor ?? "#00c078"), [climaxRimColor]);
  // Scratchs alloués une seule fois — mutés dans useFrame plutôt que
  // recréés à chaque tick (même pattern que rim-light climaxColorScratch).
  const ambientColorScratch = useMemo(() => new Color(), []);
  const directionalColorScratch = useMemo(() => new Color(), []);

  useFrame(() => {
    const p = progressRef.current;
    const blend = getRimColorBlend(p);
    if (ambientRef.current) {
      ambientRef.current.intensity = getAmbientIntensity(p);
      // Tint ambient : 85% de la teinte cardinale au climax (26/08
      // recalibré, retour Sylvain "je ne vois pas le décor teinté"
      // après premier essai à 40% — la lumière ambient blanche à 60%
      // écrasait le tint cardinal à l'œil).
      ambientColorScratch.copy(whiteColor).lerp(cardinalColor, blend * 0.85);
      ambientRef.current.color.copy(ambientColorScratch);
    }
    if (directionalRef.current) {
      directionalRef.current.intensity = getDirectionalIntensity(p);
      // Tint directional 60% (26/08 recalibré depuis 25%). La
      // directionnelle porte les hautes lumières — plus fort et les
      // crêtes virent monochrome, plus faible et le décor ne suit pas
      // le cerf visuellement.
      directionalColorScratch.copy(whiteColor).lerp(cardinalColor, blend * 0.60);
      directionalRef.current.color.copy(directionalColorScratch);
    }
    if (fogRef.current) {
      fogRef.current.color.set(getFogColor(p, fogTint));
    }
  });

  return (
    <>
      {/* near/far au-delà de l'orbite caméra (radius max 9) : le fog ne
       * doit jamais assombrir la scène proche, seulement l'horizon —
       * inchangé depuis stag-scene.tsx, seule la couleur bouge désormais. */}
      <fog ref={fogRef} attach="fog" args={["#000000", 10, 34]} />
      <ambientLight ref={ambientRef} />
      <directionalLight ref={directionalRef} position={[4, 6, 4]} />
    </>
  );
}
