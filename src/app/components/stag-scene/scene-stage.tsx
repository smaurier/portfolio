"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import { getNavEmphasis } from "@/lib/reveal-arc";
import { hexToRgb, readDirectionColor, type DirectionKey } from "./direction-colors";
import { useSceneRefs, type SceneRefs } from "./scene-refs-context";
import SceneTextOverlay from "./scene-text-overlay";
import styles from "./scene-stage.module.css";

/**
 * Wrapper HTML page — overlay au-dessus du canvas persistant + flow
 * scrollable pour le contenu. Refactor 28/08 Phase A : le Canvas
 * WebGL est sorti d'ici, il vit désormais dans layout.tsx via
 * PersistentScene (persist entre navs SPA, plus de coupure).
 *
 * SceneStage ne fait plus que :
 *  - rendre l'overlay HTML dans un slot fixed au-dessus du canvas
 *  - rendre le contenu flow (min-height 300vh via .flow) qui pilote
 *    le scroll de l'arc de reveal
 *  - gérer l'emphase de nav ("chemins révélés") — teinte les liens
 *    du header quand le scroll approche du climax, direction cardinale
 *    de cette page
 *
 * Contexte overlay : consomme SceneRefsContext pour donner progressRef
 * + reducedMotionRef aux FadingBlock enfants.
 */

export type SceneStageOverlayCtx = Pick<SceneRefs, "progressRef" | "reducedMotionRef">;

export default function SceneStage({
  overlay,
  children,
  directionKey = "jade",
}: {
  overlay?: (ctx: SceneStageOverlayCtx) => ReactNode;
  children?: ReactNode;
  directionKey?: DirectionKey;
}) {
  const refs = useSceneRefs();
  const navRgb = useMemo(() => hexToRgb(readDirectionColor(directionKey)), [directionKey]);

  useEffect(() => {
    if (!refs) return;
    // Emphase de nav ("chemins révélés") — teinte les liens du
    // header progressivement selon le scroll de l'arc. Chaque page a
    // sa direction cardinale, la teinte suit.
    function applyNavEmphasis(progress: number) {
      const emphasis = getNavEmphasis(progress);
      const links = document.querySelectorAll<HTMLAnchorElement>(".header_bottom nav a");
      links.forEach((link) => {
        link.style.textDecorationLine = emphasis > 0.01 ? "underline" : "none";
        link.style.textDecorationColor = `rgba(${navRgb.r}, ${navRgb.g}, ${navRgb.b}, ${emphasis})`;
      });
    }

    let raf: number;
    function tick() {
      applyNavEmphasis(refs!.progressRef.current);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      // Reset nav neutre au démontage.
      document.querySelectorAll<HTMLAnchorElement>(".header_bottom nav a").forEach((link) => {
        link.style.removeProperty("text-decoration-line");
        link.style.removeProperty("text-decoration-color");
      });
    };
  }, [refs, navRgb]);

  if (!refs) return null;

  const overlayCtx: SceneStageOverlayCtx = {
    progressRef: refs.progressRef,
    reducedMotionRef: refs.reducedMotionRef,
  };

  return (
    <>
      {overlay && <SceneTextOverlay>{overlay(overlayCtx)}</SceneTextOverlay>}
      <div className={styles.flow}>{children}</div>
    </>
  );
}
