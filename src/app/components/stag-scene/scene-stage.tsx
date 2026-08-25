"use client";

import { useEffect, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { clampProgress } from "@/lib/camera-path";
import { getPerfProfile, type PerfProfile } from "@/lib/mobile-perf";
import { getNavEmphasis } from "@/lib/reveal-arc";
import LoadingVeil from "./loading-veil";
import PostFX from "./post-fx";
import SceneTextOverlay from "./scene-text-overlay";
import styles from "./scene-stage.module.css";

/**
 * Contexte partagé passé aux render props `scene` et `overlay` de
 * SceneStage : refs de progression/notice, ref de préférence réduction
 * de mouvement, profil perf (utile aux consommateurs qui veulent adapter
 * la densité 3D côté mobile — même seuil que le DPR/PostFX gérés ici).
 */
export type SceneStageCtx = {
  progressRef: MutableRefObject<number>;
  noticedRef: MutableRefObject<boolean>;
  reducedMotionRef: MutableRefObject<boolean>;
  perfProfile: PerfProfile;
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

/** "#00a86b" -> {r,g,b}. Suffisant pour --jade-bg (toujours un hex 6
 * chiffres dans globals.css) — pas un parseur de couleur CSS général. */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const match = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) return { r: 0, g: 168, b: 107 }; // repli sur le vert jade connu
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}

/**
 * Ossature partagée de toutes les pages à scène 3D (home + Services/
 * Projets/Contact/Mémoire depuis le 25/08, cf memory project-nahual-da).
 * Le canvas vit dans un layer `position:fixed` plein écran (jamais dans
 * le flux, jamais en sticky) — il reste visible pendant toute la
 * navigation dans la page. Le contenu HTML (overlay hero/à-propos pour
 * la home, `<main>` pour les pages écho) s'empile au-dessus via `flow`,
 * qui garantit au moins 300vh de hauteur scrollable — assez pour que
 * l'arc de reveal (200vh) se joue complètement, même quand la page
 * elle-même est plus courte. La progression est calculée sur les deux
 * premières viewports de scroll, indépendamment de la longueur totale
 * du contenu.
 */
export default function SceneStage({
  loading,
  scene,
  overlay,
  children,
}: {
  loading: LoadingVeilProps;
  scene: (ctx: SceneStageCtx) => ReactNode;
  overlay?: (ctx: SceneStageCtx) => ReactNode;
  children?: ReactNode;
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

    // Scope l'emphase de nav ("chemins révélés") à cette page : cette
    // classe ne sert plus qu'à borner la sélection des liens ci-dessous,
    // jamais à affecter la nav sur les autres pages.
    document.body.classList.add(REVEAL_SCOPE_CLASS);

    // Couleur/ligne posées inline en JS plutôt qu'en CSS pur : color-mix()
    // et la syntaxe de couleur relative laissaient toutes deux un
    // underline visible même à émphase 0 dans ce navigateur (constaté
    // par inspection directe des styles calculés, pas juste à l'œil) —
    // un rgba() construit à la main n'a pas cette ambiguïté.
    const jadeRgb = hexToRgb(
      getComputedStyle(document.documentElement).getPropertyValue("--jade-bg").trim(),
    );

    function applyNavEmphasis(progress: number) {
      const emphasis = getNavEmphasis(progress);
      const links = document.querySelectorAll<HTMLAnchorElement>(".header_bottom nav a");
      links.forEach((link) => {
        link.style.textDecorationLine = emphasis > 0.01 ? "underline" : "none";
        link.style.textDecorationColor = `rgba(${jadeRgb.r}, ${jadeRgb.g}, ${jadeRgb.b}, ${emphasis})`;
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
      // Remet la nav dans son état neutre (header/footer partagés avec
      // toutes les autres pages, ne doivent rien garder de ce reveal).
      document.querySelectorAll<HTMLAnchorElement>(".header_bottom nav a").forEach((link) => {
        link.style.removeProperty("text-decoration-line");
        link.style.removeProperty("text-decoration-color");
      });
    };
  }, []);

  const ctx: SceneStageCtx = { progressRef, noticedRef, reducedMotionRef, perfProfile };

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
