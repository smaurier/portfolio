/* eslint-disable react-hooks/set-state-in-effect -- fichier 3D r3f : useFrame mutations 60 fps, refs pour valeurs frame-based, Math.random init particules. Patterns gamedev legitimes. */
"use client";

import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { deriveFogTint, readDirectionAccentColor, readDirectionColor } from "./direction-colors";
import PostFX from "./post-fx";
import SceneContent from "./scene-content";
import { useSceneRefs } from "./scene-refs-context";
import { useCurrentDirection } from "./use-current-direction";
import { useAtmosphereHour } from "./use-atmosphere-hour";
import { isBot } from "@/lib/is-bot";
import { getFogTint } from "@/lib/direction-fog";
import { useReadingMode } from "@/lib/reading-mode-context";
import XolotlCompanion from "./xolotl-companion";
import EhecatlWind from "./ehecatl-wind";
import styles from "./scene-stage.module.css";

/**
 * Scène 3D persistante montée UNE seule fois dans layout.tsx
 * (28/08 refactor Phase A). Le canvas WebGL survit à toutes les
 * navigations SPA : plus de coupure structurelle au router.push,
 * plus de flash blanc, plus de reconstruction shader.
 *
 * Direction cardinale lue via usePathname (useCurrentDirection). Au
 * changement d'URL, seules les couleurs propagées (climaxRimColor,
 * climaxAccentColor, fogTint) changent : les enfants scène (StagModel,
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
  const hour = useAtmosphereHour();
  const readingMode = useReadingMode();
  // Frameloop demand quand tab hidden (28/08 task #60 perf). Canvas
  // r3f prop frameloop "always" (defaut) tourne rAF permanent meme
  // en tab background = drain CPU/GPU + batterie. "demand" gele le
  // canvas jusqu'a next invalidate. Bascule via visibilitychange.
  //
  // Egalement "demand" en permanence si prefers-reduced-motion :
  // gele le breath cycle du cerf, la parallax camera, les
  // particles, les ambiances 5 directions. Utilisateur voit une
  // scene statique lisible (RGAA 13.6, WCAG 2.3.3).
  const [frameloop, setFrameloop] = useState<"always" | "demand">("always");
  // Skip Canvas WebGL pour bots (Lighthouse/PageSpeed/crawlers).
  // Detection post-hydration via useEffect pour eviter mismatch SSR.
  // Contenu overlay HTML reste servi (pas de cloaking).
  const [bot, setBot] = useState(false);

  useEffect(() => {
    if (isBot()) setBot(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reducedMotionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    function computeFrameloop() {
      if (reducedMotionMq.matches) return "demand" as const;
      if (typeof document !== "undefined" && document.hidden) return "demand" as const;
      return "always" as const;
    }
    setFrameloop(computeFrameloop());
    function onVisibility() {
      setFrameloop(computeFrameloop());
    }
    function onReducedMotionChange() {
      setFrameloop(computeFrameloop());
    }
    document.addEventListener("visibilitychange", onVisibility);
    reducedMotionMq.addEventListener("change", onReducedMotionChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      reducedMotionMq.removeEventListener("change", onReducedMotionChange);
    };
  }, []);

  // Palette sur l'HEURE atmospherique (03/09 etage 3 Nepantla) : au
  // repos = la route ; pendant un passage cardinal, la palette
  // traverse les heures intermediaires du voyage du soleil. Les
  // enfants lissent deja ces couleurs via leurs useFrame : la
  // traversee se lit comme un balayage de teintes. data-direction et
  // les gates d'identite restent sur la route.
  const climaxRimColor = useMemo(() => readDirectionColor(hour), [hour]);
  const climaxAccentColor = useMemo(() => readDirectionAccentColor(hour), [hour]);
  // Sud : ciel de midi (getFogTint deroge a la derivation, cf direction-fog.ts).
  const fogTint = useMemo(() => getFogTint(hour, deriveFogTint(climaxRimColor)), [hour, climaxRimColor]);

  if (!refs) return null;
  if (bot) return null;
  // Mode recit accessible : demonte le Canvas WebGL pour une lecture
  // calme sans layer 3D. Les rAF Three.js s'arretent, gains CPU et
  // batterie. Le contenu HTML reste visible sur fond noir opaque.
  if (readingMode.active) return null;

  return (
    <div className={styles.stage} data-direction={direction}>
      <Canvas
        // Sonde de dev (05/09) : la scene three exposee pour Playwright
        // (diagnostics visuels), jamais en production.
        onCreated={(state) => {
          if (process.env.NODE_ENV !== "production") (window as unknown as { __nahualScene?: unknown }).__nahualScene = state.scene;
        }}
        // Ombres (05/09, Sud : « un jeu d'ombres delicats ») : shadow map
        // activee au niveau du Canvas, la directionnelle ne projette qu'au
        // Sud (reveal-lighting), les autres pages restent sans ombre.
        shadows
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
        {/* Xolotl (29/08) : chien-frère de Quetzalcoatl, guide vers
            Mictlán. Spawn aléatoire session-based par direction :
            15% pages écho, 40% Mémoire (Nord), 0% home. Traverse
            fugitivement en fond ~18s. Voir codex.xolotl. */}
        <XolotlCompanion />
        {/* Ehecatl (03/09, etage 4 Nepantla) : le vent du passage
            cardinal rendu visible : filaments qui balaient l'orbite
            plus vite que la camera. Invisible hors transition. */}
        <EhecatlWind />
        {refs.perfProfile.postFx && <PostFX />}
      </Canvas>
    </div>
  );
}
