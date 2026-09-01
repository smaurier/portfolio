"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Lenis smooth scroll (28/08 task #48). Signature léché SOTY :
 * scroll silky au lieu du snap-scroll natif brut de Chrome/Firefox.
 * Mount une seule fois dans le layout (persistent), rAF loop tick
 * jusqu'à unmount.
 *
 * Respect prefers-reduced-motion : si l'utilisateur préfère moins de
 * mouvement, on ne mount pas Lenis du tout — scroll natif conservé,
 * pas de lissage.
 *
 * Compatibilité scène 3D : Lenis met à jour window.scrollY à chaque
 * tick lisse, donc les useFrame qui lisent progressRef (calculé
 * depuis window.scrollY) restent synchro. Aucun patch de reveal-arc
 * nécessaire.
 */

export default function SmoothScroll() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
      smoothWheel: true,
    });

    // Lenis rAF loop autonome (28/08 retour Sylvain "molette sur cerf
    // glitche" : coordination gsap ticker + ScrollTrigger creait
    // feedback loop avec FaceAFacePin desactive). Retour raf standalone.
    let rafId = 0;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return null;
}
