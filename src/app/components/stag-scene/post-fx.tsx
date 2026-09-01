"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Bloom, ChromaticAberration, DepthOfField, EffectComposer, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useCardinalTransition } from "./cardinal-transition-context";
import { useSceneRefs } from "./scene-refs-context";
import OllinShockwave from "./ollin-shockwave";

/**
 * Post-processing : retour de Sylvain le 18/08, après audit comparé à des
 * sites de référence (Lusion, cf Codex Nahual/memory project-nahual-da) :
 * le plus gros écart entre /lab et une expérience "haute facture" n'était
 * pas le nombre d'objets dans la scène (sol/montagnes/herbe ajoutés plus
 * tôt ce soir), mais l'absence totale de post-processing : tout tournait
 * en meshStandardMaterial par défaut, sans bloom/vignette/grade, ce qui se
 * lit comme une démo Three.js plutôt qu'une direction artistique.
 *
 * Effets volontairement sobres : le sujet doit rester lisible, l'effet ne
 * doit jamais devenir le sujet.
 * - Bloom : seuil de luminance modéré (pas de matériau emissive dans la
 *   scène pour l'instant : capte les zones déjà les plus lumineuses,
 *   spéculaires sur le cerf, fleurs rouges éclairées).
 * - Vignette : assombrit les bords, recentre l'œil sur le sujet : le
 *   levier le plus simple pour une lecture "cinématographique" plutôt que
 *   "capture d'écran d'un moteur 3D".
 * - ChromaticAberration : décalage minime, juste assez pour casser le
 *   rendu "trop propre"/synthétique par défaut d'un rendu WebGL sans
 *   grain : pas un effet de lentille appuyé.
 *
 * Phase C cinématographie (28/08) : pendant le burst de transition
 * cardinale, Bloom.intensity + ChromaticAberration.offset boostés en
 * bell curve. Signal cinéma renforcé synchro avec dolly caméra + FOV
 * shift (OrbitCamera) + head-look cerf (StagModel). Rester dans les
 * ordres de grandeur "sobres" (bloom max ~1.4, CA max ~0.002) : le
 * boost doit rester subtile SOTA cinéma, pas gimmick.
 */

const BLOOM_BASE = 0.6;
const BLOOM_BURST_ADD = 0.8;
const CA_BASE = 0.0006;
const CA_BURST_ADD = 0.0012;

/**
 * Focus rack (28/08 task #44). DOF quasi-inactif au repos (bokehScale 0)
 * pour économiser le shader pass ; monte à ~3 pendant le peak burst =
 * shallow DOF, arrière-plan flou tandis que le cerf reste net. Le focus
 * suit la caméra target (getOrbitCameraTarget = origine cerf).
 * focusDistance 0.03 correspond à ~5 units world (Z du cerf) avec la
 * caméra qui orbite radius ~5-6. focalLength 0.06 = bokeh subtile
 * mais lisible. Signature cinéma directe.
 */
const DOF_BURST_BOKEH = 3.0;

export default function PostFX() {
  const bloomRef = useRef<{ intensity: number } | null>(null);
  const caRef = useRef<{ offset: { x: number; y: number } } | null>(null);
  const dofRef = useRef<{ bokehScale: number } | null>(null);
  const vignetteRef = useRef<{ darkness: number } | null>(null);
  const transition = useCardinalTransition();
  const refs = useSceneRefs();

  useFrame(() => {
    // Vignette breathing scroll (28/08 boite outil D) : vignette
    // darkness varie selon progress reveal-arc : plus forte en
    // penombre (0.9) relaxe au climax chemins reveles (0.65). Signature
    // "l'oeil s'ouvre progressivement au monde nahual".
    if (vignetteRef.current && refs) {
      const p = refs.progressRef.current;
      vignetteRef.current.darkness = 0.9 - p * 0.25;
    }

    if (!transition) return;
    const p = transition.transitionProgressRef.current;
    const active = transition.transitionDirection !== null && p > 0;
    const bell = active ? Math.sin(p * Math.PI) : 0;

    if (bloomRef.current) {
      // Sound-reactive bloom (28/08 boite outil #3) : si audio level
      // dispo (window.__nahualAudioLevel pose par SoundDesign quand
      // unmuted), ajoute pulse proportionnel. Silencieux si mute.
      const audioLevel = typeof window !== "undefined"
        ? (window as unknown as { __nahualAudioLevel?: { current: number } }).__nahualAudioLevel?.current ?? 0
        : 0;
      // Pin face-a-face bloom boost (28/08 boite outil #6) : pendant
      // scrub pin, bloom monte de 0 a +1.5 = pic dramatique "regard
      // silencieux amplifie".
      const pinLevel = refs?.pinProgressRef.current ?? 0;
      bloomRef.current.intensity = BLOOM_BASE + bell * BLOOM_BURST_ADD + audioLevel * 0.6 + pinLevel * 1.5;
    }
    if (caRef.current) {
      const offset = CA_BASE + bell * CA_BURST_ADD;
      caRef.current.offset.x = offset;
      caRef.current.offset.y = offset;
    }
    if (dofRef.current) {
      // Bokeh 0 au repos = shader DOF quasi-passthrough (perf).
      // Pendant burst : monte en bell curve, peak 3.0 = arrière-plan
      // franchement flou, cerf reste net → focus rack cinéma.
      dofRef.current.bokehScale = bell * DOF_BURST_BOKEH;
    }
  });

  return (
    <EffectComposer multisampling={4}>
      {/* OllinShockwave (29/08) : onde de pression au pointerdown user,
          signature nahua "tremblement d'Ollin". En premier de la
          chaine : deforme la scene rendue AVANT DOF/bloom/CA, effet
          plus organique (le bokeh et le bloom prennent la distortion
          en compte). Skip si prefers-reduced-motion ou reading-mode. */}
      <OllinShockwave />
      {/* DOF en second : les autres effets (bloom, CA) s'appliquent
          par-dessus le rendu focus-racké. Focus fixe sur ~cerf.
          bokehScale animé par useFrame ci-dessus. */}
      <DepthOfField
        ref={dofRef as never}
        focusDistance={0.03}
        focalLength={0.06}
        bokehScale={0}
      />
      <Bloom
        ref={bloomRef as never}
        intensity={BLOOM_BASE}
        luminanceThreshold={0.35}
        luminanceSmoothing={0.3}
        mipmapBlur
      />
      <ChromaticAberration ref={caRef as never} offset={[CA_BASE, CA_BASE]} />
      <Vignette ref={vignetteRef as never} eskil={false} offset={0.25} darkness={0.85} blendFunction={BlendFunction.NORMAL} />
    </EffectComposer>
  );
}
