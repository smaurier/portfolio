"use client";

import { useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { clampProgress } from "@/lib/camera-path";
import { getPerfProfile, type PerfProfile } from "@/lib/mobile-perf";
import { getNavEmphasis, type ColorRgb } from "@/lib/reveal-arc";
import { deriveFogTint, hexToRgb, readDirectionColor, type DirectionKey } from "./direction-colors";
import LoadingVeil from "./loading-veil";
import PostFX from "./post-fx";
import SceneTextOverlay from "./scene-text-overlay";
import styles from "./scene-stage.module.css";

/**
 * Contexte partagé passé aux render props `scene` et `overlay` de
 * SceneStage : refs de progression/notice, ref de préférence réduction
 * de mouvement, profil perf, et les couleurs dérivées de la direction
 * courante (fog + rim). Le consommateur les propage à SceneContent /
 * RevealLighting / StagModel — jamais lus deux fois, une seule source
 * de vérité par mount.
 */
export type SceneStageCtx = {
  progressRef: MutableRefObject<number>;
  noticedRef: MutableRefObject<boolean>;
  reducedMotionRef: MutableRefObject<boolean>;
  perfProfile: PerfProfile;
  climaxRimColor: string;
  fogTint: ColorRgb;
};

export type LoadingVeilProps = {
  phrase: string;
  translation: string;
  label: string;
};

// Classe plate (pas une classe du module CSS scopé) : posée sur <body>,
// lue depuis globals.css qui ne connaît pas les classes hashées de ce
// module — cf règle .header nav a sous body.nahual-lab-reveal.
const REVEAL_SCOPE_CLASS = "nahual-lab-reveal";

// Deux viewports de scroll = arc de reveal complet (équivalent au
// scroll track 300vh - sticky 100vh = 200vh scrollables du pattern
// précédent). Choisi fixe volontairement : sur une page à contenu court
// (Contact) l'arc se joue quand même sur cette distance ; sur une page
// longue (Projets), l'arc se joue sur les premières 200vh puis le
// contenu continue de se révéler par-dessus le canvas figé à "chemins
// révélés".
const ARC_SCROLL_VIEWPORTS = 2;

/**
 * Ossature partagée de toutes les pages à scène 3D (home + Services/
 * Projets/Contact/Mémoire depuis le 25/08, cf memory project-nahual-da).
 * Le canvas vit dans un layer `position:fixed` plein écran (jamais dans
 * le flux, jamais en sticky) — il reste visible pendant toute la
 * navigation dans la page. Le contenu HTML (overlay hero/à-propos pour
 * la home, `<main>` pour les pages écho) s'empile au-dessus via `flow`,
 * qui garantit au moins 300vh de hauteur scrollable — assez pour que
 * l'arc de reveal (200vh) se joue complètement, même quand la page
 * elle-même est plus courte.
 *
 * Prop `directionKey` (25/08, retour Sylvain "chaque scène sera
 * spécifique et enrichie") : sélectionne la teinte cible du fog, du
 * liseré du cerf, et de l'emphase de nav — Codex Nahual section 03.
 * Défaut = jade (home / centre).
 */
export default function SceneStage({
  loading,
  scene,
  overlay,
  children,
  directionKey = "jade",
}: {
  loading: LoadingVeilProps;
  scene: (ctx: SceneStageCtx) => ReactNode;
  overlay?: (ctx: SceneStageCtx) => ReactNode;
  children?: ReactNode;
  directionKey?: DirectionKey;
}) {
  const progressRef = useRef(0);
  const reducedMotionRef = useRef(false);
  // "A-t-il remarqué le visiteur ?" — partagé entre le scroll (StagModel)
  // et le mouvement de souris (CursorRevealScene), jamais remis à false
  // une fois vrai (retour de Sylvain le 18/08).
  const noticedRef = useRef(false);
  // Filet mobile MINIMAL (cf src/lib/mobile-perf.ts, retour de Sylvain
  // le 19/08) : 0 avant la première mesure côté client -> profil
  // desktop par défaut (jamais de flash "version allégée" pendant
  // l'hydratation).
  const [viewportWidth, setViewportWidth] = useState(0);
  const perfProfile = getPerfProfile(viewportWidth);

  // Résolu une seule fois par mount (deps [directionKey]) : la valeur
  // renvoyée par readDirectionColor dépend du thème système actif au
  // moment de la lecture — si l'utilisateur change de thème sans
  // reload, la teinte 3D ne suit pas (compromis assumé, cf
  // direction-colors.ts). Les uniforms 3D et l'inline style de nav
  // dérivent tous de ces mêmes valeurs — une seule source de vérité.
  const climaxRimColor = useMemo(() => readDirectionColor(directionKey), [directionKey]);
  const fogTint = useMemo(() => deriveFogTint(climaxRimColor), [climaxRimColor]);
  const navRgb = useMemo(() => hexToRgb(climaxRimColor), [climaxRimColor]);

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

    // Scope l'emphase de nav ("chemins révélés") à cette page (héritée
    // du pattern /lab). La classe est aussi posée en dur sur <body>
    // dans layout.tsx (SSR sans flash) — cet ajout reste par sécurité
    // au cas où SceneStage serait utilisé isolément d'un layout
    // futur.
    document.body.classList.add(REVEAL_SCOPE_CLASS);

    function applyNavEmphasis(progress: number) {
      const emphasis = getNavEmphasis(progress);
      const links = document.querySelectorAll<HTMLAnchorElement>(".header_bottom nav a");
      links.forEach((link) => {
        link.style.textDecorationLine = emphasis > 0.01 ? "underline" : "none";
        link.style.textDecorationColor = `rgba(${navRgb.r}, ${navRgb.g}, ${navRgb.b}, ${emphasis})`;
      });
    }

    function handleScroll() {
      // prefers-reduced-motion : le cerf reste sur le cadrage par défaut
      // (progress=0), aucune trajectoire pilotée par le scroll.
      if (reducedMotionRef.current) return;

      const arcScroll = window.innerHeight * ARC_SCROLL_VIEWPORTS;
      progressRef.current = clampProgress(
        arcScroll > 0 ? window.scrollY / arcScroll : 0,
      );
      applyNavEmphasis(progressRef.current);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.body.classList.remove(REVEAL_SCOPE_CLASS);
      // Remet la nav dans son état neutre.
      document.querySelectorAll<HTMLAnchorElement>(".header_bottom nav a").forEach((link) => {
        link.style.removeProperty("text-decoration-line");
        link.style.removeProperty("text-decoration-color");
      });
    };
    // navRgb en dep : si la direction change (navigation entre pages),
    // le handler doit se réabonner avec la nouvelle couleur cible.
  }, [navRgb]);

  const ctx: SceneStageCtx = {
    progressRef,
    noticedRef,
    reducedMotionRef,
    perfProfile,
    climaxRimColor,
    fogTint,
  };

  return (
    <>
      <div className={styles.stage}>
        <Canvas camera={{ fov: 45, near: 0.1, far: 100 }} dpr={[1, perfProfile.dprCap]}>
          {scene(ctx)}
          {/* Post-processing coupé sous le seuil mobile (cf
           * mobile-perf.ts) : le coût le plus concentré de la scène
           * après le DPR, désactivé plutôt que réglé plus léger faute
           * de valeur intermédiaire qui vaille le coup. */}
          {perfProfile.postFx && <PostFX />}
        </Canvas>
        {overlay && <SceneTextOverlay>{overlay(ctx)}</SceneTextOverlay>}
      </div>
      <div className={styles.flow}>{children}</div>
      <LoadingVeil phrase={loading.phrase} translation={loading.translation} label={loading.label} />
    </>
  );
}
