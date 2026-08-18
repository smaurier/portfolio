"use client";

import { Bloom, ChromaticAberration, EffectComposer, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";

// ChromaticAberration a un bug de typage en amont (postprocessing@6.36 —
// Omit<Partial<...|undefined>, "offset"> perd la propriété blendFunction
// côté TS) : pas de blendFunction explicite ci-dessous, sa valeur par
// défaut (BlendFunction.NORMAL) est déjà celle qu'on veut.

/**
 * Post-processing — retour de Sylvain le 18/08, après audit comparé à des
 * sites de référence (Lusion, cf Codex Nahual/memory project-nahual-da) :
 * le plus gros écart entre /lab et une expérience "haute facture" n'était
 * pas le nombre d'objets dans la scène (sol/montagnes/herbe ajoutés plus
 * tôt ce soir), mais l'absence totale de post-processing — tout tournait
 * en meshStandardMaterial par défaut, sans bloom/vignette/grade, ce qui se
 * lit comme une démo Three.js plutôt qu'une direction artistique.
 *
 * Effets volontairement sobres : le sujet doit rester lisible, l'effet ne
 * doit jamais devenir le sujet.
 * - Bloom : seuil de luminance modéré (pas de matériau emissive dans la
 *   scène pour l'instant — capte les zones déjà les plus lumineuses,
 *   spéculaires sur le cerf, fleurs rouges éclairées).
 * - Vignette : assombrit les bords, recentre l'œil sur le sujet — le
 *   levier le plus simple pour une lecture "cinématographique" plutôt que
 *   "capture d'écran d'un moteur 3D".
 * - ChromaticAberration : décalage minime, juste assez pour casser le
 *   rendu "trop propre"/synthétique par défaut d'un rendu WebGL sans
 *   grain — pas un effet de lentille appuyé.
 */
export default function PostFX() {
  return (
    <EffectComposer multisampling={4}>
      <Bloom intensity={0.6} luminanceThreshold={0.35} luminanceSmoothing={0.3} mipmapBlur />
      <ChromaticAberration offset={[0.0006, 0.0006]} />
      <Vignette eskil={false} offset={0.25} darkness={0.85} blendFunction={BlendFunction.NORMAL} />
    </EffectComposer>
  );
}
