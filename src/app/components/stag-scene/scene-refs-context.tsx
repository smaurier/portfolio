"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { clampProgress } from "@/lib/camera-path";
import { getPerfProfile, type PerfProfile } from "@/lib/mobile-perf";

/**
 * Contexte partagé des refs et de l'état runtime de la scène 3D
 * (28/08 refactor Phase A "PersistentScene in layout"). Extrait de
 * l'ancien SceneStage pour vivre au niveau layout — le canvas WebGL
 * persiste ainsi entre navigations SPA, plus de coupure structurelle
 * au router.push.
 *
 * Contient :
 *  - progressRef : scroll 0..1 partagé par tous les composants scène
 *    (RevealLighting, OrbitCamera, StagModel, SpiritParticles, etc.)
 *  - noticedRef : "a-t-il remarqué le visiteur", partagé scroll+souris
 *  - reducedMotionRef : préférence utilisateur, évalué au mount
 *  - perfProfile : profil mobile-friendly (dprCap, postFx flag)
 *
 * Scroll listener et lifecycle handlers montés une seule fois par
 * session (layout persist), pas remontés à chaque page. Reset scroll
 * au mount initial uniquement (pas à chaque nav SPA, geste normal
 * quand on reste dans l'univers).
 */

// 2 viewports scroll = arc reveal complet (200vh scrollables). Choix
// fixe : contenus courts (Contact) jouent quand même l'arc entier,
// contenus longs jouent l'arc sur les 200vh initiaux puis contenu
// continue au-dessus du canvas figé "chemins révélés".
const ARC_SCROLL_VIEWPORTS = 2;

// Classe scope pour globals.css (les .header_bottom nav a etc.).
const REVEAL_SCOPE_CLASS = "nahual-lab-reveal";

export type SceneRefs = {
  progressRef: MutableRefObject<number>;
  noticedRef: MutableRefObject<boolean>;
  reducedMotionRef: MutableRefObject<boolean>;
  perfProfile: PerfProfile;
  // Pin face-a-face progress (28/08 boite outil #6) — 0..1 sur la
  // fenetre de scroll pin (300vh apres l'arc reveal). Alimente par
  // FaceAFacePin composant via GSAP ScrollTrigger scrub. Consommé par
  // PostFX (bloom boost) + OrbitCamera (dolly + fov).
  pinProgressRef: MutableRefObject<number>;
};

const SceneRefsContext = createContext<SceneRefs | null>(null);

export function SceneRefsProvider({ children }: { children: ReactNode }) {
  const progressRef = useRef(0);
  const reducedMotionRef = useRef(false);
  const noticedRef = useRef(false);
  const pinProgressRef = useRef(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const perfProfile = getPerfProfile(viewportWidth);

  useEffect(() => {
    function handleResize() {
      setViewportWidth(window.innerWidth);
    }
    handleResize();
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = reducedMotionQuery.matches;

    // Reset scroll uniquement au mount initial de la session (layout
    // persist entre navs SPA, donc ce reset ne se rejoue plus au
    // changement de page — comportement correct : l'utilisateur qui
    // navigue en interne ne veut pas repartir de zéro à chaque nav,
    // il veut voir la scène continue de la nouvelle direction).
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    document.body.classList.add(REVEAL_SCOPE_CLASS);

    function handleScroll() {
      if (reducedMotionRef.current) return;
      const arcScroll = window.innerHeight * ARC_SCROLL_VIEWPORTS;
      progressRef.current = clampProgress(
        arcScroll > 0 ? window.scrollY / arcScroll : 0,
      );
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.body.classList.remove(REVEAL_SCOPE_CLASS);
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  const value = useMemo<SceneRefs>(
    () => ({ progressRef, noticedRef, reducedMotionRef, perfProfile, pinProgressRef }),
    [perfProfile],
  );

  return <SceneRefsContext.Provider value={value}>{children}</SceneRefsContext.Provider>;
}

/** Consomme les refs partagés — null hors provider. Chaque composant
 *  scène 3D (StagModel/OrbitCamera/…) doit être monté sous ce provider
 *  (layout.tsx en pratique). */
export function useSceneRefs(): SceneRefs | null {
  return useContext(SceneRefsContext);
}
