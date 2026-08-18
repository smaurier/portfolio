"use client";

import { Suspense, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { clampProgress } from "@/lib/camera-path";
import { getNavEmphasis } from "@/lib/reveal-arc";
import BackgroundFlora from "./background-flora";
import Grass from "./grass";
import Ground from "./ground";
import Milpa from "./milpa";
import Mountains from "./mountains";
import Ocotillo from "./ocotillo";
import OrbitCamera from "./orbit-camera";
import RevealLighting from "./reveal-lighting";
import StagModel from "./stag-model";
import Vines from "./vines";
import styles from "./stag-scene.module.css";

// Classe plate (pas une classe du module CSS scopé) : posée sur <body>,
// lue depuis globals.css qui ne connaît pas les classes hashées de ce
// module — cf règle .header nav a sous body.nahual-lab-reveal.
const REVEAL_SCOPE_CLASS = "nahual-lab-reveal";

/** "#00a86b" -> {r,g,b}. Suffisant pour --jade-bg (toujours un hex 6 chiffres
 * dans globals.css) — pas un parseur de couleur CSS général. */
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
 * Palier 0+1 de la DA Nahual (cf memory project-nahual-da) : le cerf
 * Quaternius, caméra en orbite pilotée par le scroll, et l'arc de reveal en
 * 4 temps (pénombre → conscience → face-à-face → chemins révélés, cf
 * src/lib/reveal-arc.ts). Toujours pas d'écho sur les autres pages, pas de
 * nav cardinale, pas de shader custom — paliers suivants. Volontairement
 * isolé sur /lab plutôt que branché sur la home en prod.
 */
export default function StagScene() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = reducedMotionQuery.matches;

    // Scope l'emphase de nav ("chemins révélés") à cette page : cette
    // classe ne sert plus qu'à borner la sélection des liens ci-dessous,
    // jamais à affecter la nav sur les autres pages.
    document.body.classList.add(REVEAL_SCOPE_CLASS);

    // Couleur/ligne posées inline en JS plutôt qu'en CSS pur : color-mix()
    // et la syntaxe de couleur relative laissaient toutes deux un underline
    // visible même à émphase 0 dans ce navigateur (constaté par inspection
    // directe des styles calculés, pas juste à l'œil) — un rgba() construit
    // à la main n'a pas cette ambiguïté.
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

      const section = sectionRef.current;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const scrollableHeight = rect.height - window.innerHeight;
      const scrolled = -rect.top;
      progressRef.current = clampProgress(
        scrollableHeight > 0 ? scrolled / scrollableHeight : 0,
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

  return (
    <div ref={sectionRef} className={styles.scrollTrack}>
      <div className={styles.sticky}>
        <Canvas camera={{ fov: 45, near: 0.1, far: 100 }}>
          {/* Fond pur noir (cf .sticky en CSS) : couleur de fog identique
           * pour que les éléments lointains (sol, montagnes) se fondent dans
           * le vide plutôt que de finir sur une teinte visible en bordure.
           * near/far au-delà de l'orbite caméra (radius max 9) : le fog ne
           * doit jamais assombrir la scène proche, seulement l'horizon. */}
          <fog attach="fog" args={["#000000", 10, 34]} />
          <RevealLighting progressRef={progressRef} />
          <Ground />
          <Suspense fallback={null}>
            <Mountains />
          </Suspense>
          <Suspense fallback={null}>
            <StagModel progressRef={progressRef} />
          </Suspense>
          <Suspense fallback={null}>
            <BackgroundFlora />
          </Suspense>
          <Suspense fallback={null}>
            <Ocotillo />
          </Suspense>
          <Suspense fallback={null}>
            <Grass />
          </Suspense>
          <Suspense fallback={null}>
            <Milpa progressRef={progressRef} />
          </Suspense>
          <Suspense fallback={null}>
            <Vines progressRef={progressRef} />
          </Suspense>
          <OrbitCamera progressRef={progressRef} />
        </Canvas>
      </div>
    </div>
  );
}
