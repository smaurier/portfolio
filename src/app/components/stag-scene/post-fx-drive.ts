/* eslint-disable react-hooks/immutability -- pattern gamedev r3f useFrame : etat mute a 60 fps, lu par les deux chaines de post-traitement (meme precedent que ollin-wave). */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { approachGrade, getGradeRig, type GradeRig } from "@/lib/direction-grade";
import { useCardinalTransition } from "./cardinal-transition-context";
import { useAtmosphereHour } from "./use-atmosphere-hour";
import { useSceneRefs } from "./scene-refs-context";

/**
 * Le pilotage du post-traitement, commun aux deux chaines (pmndrs en
 * WebGL, TSL en WebGPU) : grade par direction lisse sur l'heure
 * atmospherique, vignette qui respire avec l'arc, bloom (base + burst
 * cardinal + son + pin), aberration et bokeh du burst. Chaque chaine ne
 * fait plus que copier ces valeurs dans ses propres reglages.
 */

export const BLOOM_BASE = 0.6;
const BLOOM_BURST_ADD = 0.8;
export const CA_BASE = 0.0006;
const CA_BURST_ADD = 0.0012;
/** Bokeh au pic du burst cardinal : arriere-plan franchement flou, cerf net. */
const DOF_BURST_BOKEH = 3.0;

export type PostFxDrive = {
  saturation: number;
  vignette: number;
  bloom: number;
  chromaticAberration: number;
  bokeh: number;
};

type AudioWindow = { __nahualAudioLevel?: { current: number } };

export function usePostFxDrive(): PostFxDrive {
  const drive = useMemo<PostFxDrive>(() => ({ saturation: 0, vignette: 0.85, bloom: BLOOM_BASE, chromaticAberration: CA_BASE, bokeh: 0 }), []);
  const transition = useCardinalTransition();
  const refs = useSceneRefs();
  // Grade sur l'heure atmospherique (03/09 etage 3 Nepantla) : pendant un
  // passage cardinal, le grade traverse les heures intermediaires.
  const hour = useAtmosphereHour();
  const gradeRef = useRef<GradeRig>({ ...getGradeRig(hour) });

  useFrame(() => {
    // Grade par direction : snap si prefers-reduced-motion, sinon easing.
    const gradeTarget = getGradeRig(hour);
    gradeRef.current = refs?.reducedMotionRef.current ? { ...gradeTarget } : approachGrade(gradeRef.current, gradeTarget, 0.06);
    const grade = gradeRef.current;
    drive.saturation = grade.saturation;
    // Vignette qui respire avec le scroll : plus forte en penombre (0.9),
    // relachee au climax (0.65) ; le grade directionnel s'ajoute.
    const p = refs?.progressRef.current ?? 0;
    drive.vignette = 0.9 - p * 0.25 + grade.vignetteAdd;

    const tp = transition?.transitionProgressRef.current ?? 0;
    const active = !!transition && transition.transitionDirection !== null && tp > 0;
    const bell = active ? Math.sin(tp * Math.PI) : 0;
    // Bloom sound-reactive (window.__nahualAudioLevel pose par SoundDesign)
    // + pic du pin face-a-face, le tout module par le grade (Nord sourd).
    const audioLevel = typeof window !== "undefined" ? ((window as unknown as AudioWindow).__nahualAudioLevel?.current ?? 0) : 0;
    const pinLevel = refs?.pinProgressRef.current ?? 0;
    drive.bloom = (BLOOM_BASE + bell * BLOOM_BURST_ADD + audioLevel * 0.6 + pinLevel * 1.5) * grade.bloomScale;
    drive.chromaticAberration = CA_BASE + bell * CA_BURST_ADD;
    // Bokeh 0 au repos (passe quasi neutre), en cloche pendant le burst.
    drive.bokeh = bell * DOF_BURST_BOKEH;
  });

  return drive;
}
