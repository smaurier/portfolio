"use client";

import { useFrame } from "@react-three/fiber";
import { strikeState } from "@/lib/strike-sequence";
import { xiuhcoatlStore } from "./xiuhcoatl-store";
import { useSceneRefs } from "./scene-refs-context";

/**
 * XiuhcoatlStrikeDirector (05/09). Un seul endroit calcule l'enveloppe de
 * la frappe (lib pure strike-sequence) a partir de `strikeAt` (pose par
 * SudSky au climax) et l'ecrit dans le store ; les composants ne lisent
 * que des nombres 0..1. Hors frappe, tout est a zero.
 */
export default function XiuhcoatlStrikeDirector() {
  const sceneRefs = useSceneRefs();
  useFrame((state) => {
    const at = xiuhcoatlStore.strikeAt;
    const reduced = sceneRefs?.reducedMotionRef.current ?? false;
    const s = at >= 0 ? strikeState(state.clock.elapsedTime - at, reduced) : strikeState(-1, reduced);
    const t = xiuhcoatlStore.strike;
    t.stiffen = s.stiffen;
    t.flash = s.flash;
    t.shake = s.shake;
    t.lift = s.lift;
    t.fire = s.fire;
    t.tint = s.tint;
  });
  return null;
}
