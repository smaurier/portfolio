"use client";

import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { deriveFogTint, readDirectionAccentColor, readDirectionColor } from "./direction-colors";
import PostFX from "./post-fx";
import SceneContent from "./scene-content";
import { useSceneRefs } from "./scene-refs-context";
import { useCurrentDirection } from "./use-current-direction";
import styles from "./scene-stage.module.css";

/**
 * Scène 3D persistante montée UNE seule fois dans layout.tsx
 * (28/08 refactor Phase A). Le canvas WebGL survit à toutes les
 * navigations SPA — plus de coupure structurelle au router.push,
 * plus de flash blanc, plus de reconstruction shader.
 *
 * Direction cardinale lue via usePathname (useCurrentDirection). Au
 * changement d'URL, seules les couleurs propagées (climaxRimColor,
 * climaxAccentColor, fogTint) changent — les enfants scène (StagModel,
 * RevealLighting, SpiritParticles) réagissent progressivement via
 * leurs useFrame internes (les uniforms sont mutés en douceur par
 * les setters existants, pas re-créés).
 *
 * Refs partagés (progressRef, noticedRef, etc.) viennent de
 * SceneRefsProvider, aussi monté au layout. Cohérent : tout ce qui
 * doit persister sur toute la session vit dans layout.
 */
export default function PersistentScene() {
  const refs = useSceneRefs();
  const direction = useCurrentDirection();
  // Frameloop demand quand tab hidden (28/08 task #60 perf). Canvas
  // r3f prop frameloop "always" (defaut) tourne rAF permanent meme
  // en tab background = drain CPU/GPU + batterie. "demand" gele le
  // canvas jusqu'a next invalidate. Bascule via visibilitychange.
  const [frameloop, setFrameloop] = useState<"always" | "demand">("always");

  useEffect(() => {
    if (typeof document === "undefined") return;
    function onVisibility() {
      setFrameloop(document.hidden ? "demand" : "always");
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const climaxRimColor = useMemo(() => readDirectionColor(direction), [direction]);
  const climaxAccentColor = useMemo(() => readDirectionAccentColor(direction), [direction]);
  const fogTint = useMemo(() => deriveFogTint(climaxRimColor), [climaxRimColor]);

  if (!refs) return null;

  return (
    <div className={styles.stage} data-direction={direction}>
      <Canvas
        camera={{ fov: 45, near: 0.1, far: 100 }}
        dpr={[1, refs.perfProfile.dprCap]}
        frameloop={frameloop}
      >
        <SceneContent
          progressRef={refs.progressRef}
          noticedRef={refs.noticedRef}
          climaxRimColor={climaxRimColor}
          climaxAccentColor={climaxAccentColor}
          fogTint={fogTint}
        />
        {refs.perfProfile.postFx && <PostFX />}
      </Canvas>
    </div>
  );
}
