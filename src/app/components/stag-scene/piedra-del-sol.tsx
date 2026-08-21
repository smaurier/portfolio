"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import { getIntroOpacity } from "@/lib/reveal-arc";
import PiedraSvg from "./piedra-svg";
import styles from "./piedra-del-sol.module.css";

// Opacité de fond de la Piedra del Sol au repos (mesurée à l'œil sur
// l'ancienne home, cf project-nahual-da) — assez discrète pour ne jamais
// manger le contraste du texte/de la scène par-dessus, gardée identique à
// avant l'intégration (aucun changement de ce réglage lui-même, seulement
// de ce avec quoi elle coexiste).
const BASE_OPACITY = 0.08;

/**
 * La Piedra del Sol, préface de la scène (cf memory project-nahual-da,
 * section mythe du Codex : "porte en son centre le glyphe Nahui Ollin —
 * 4-Mouvement, le Cinquième Soleil [...] ce monde-ci ne tient que par le
 * mouvement — un argument mythologique presque littéral pour un site
 * interactif"). Tracé SVG entièrement statique dès le montage (retour de
 * Sylvain le 20/08 : "ne doit plus se dessiner") — l'ancienne animation
 * GSAP de dessin progressif (stroke-dashoffset, un délai par chemin) est
 * retirée : la Piedra doit être là d'emblée, pas se construire sous les
 * yeux du visiteur. L'opacité s'efface au même rythme que l'accroche
 * (retour de Sylvain le 19/08 : "ce qui existe avant que le cerf
 * n'apparaisse" doit céder la place une fois qu'il apparaît).
 */
export default function PiedraDelSol({
  progressRef,
  reducedMotionRef,
}: {
  progressRef: MutableRefObject<number>;
  reducedMotionRef: MutableRefObject<boolean>;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf: number;
    function tick() {
      // Pas d'exception reduced-motion ici (contrairement à
      // SceneTextOverlay) : la Piedra est un décor discret, jamais un
      // contenu essentiel — rien dans le garde-fou d'accessibilité du
      // Codex ne l'exige visible en continu.
      const opacity = reducedMotionRef.current ? BASE_OPACITY : getIntroOpacity(progressRef.current) * BASE_OPACITY;
      if (rootRef.current) rootRef.current.style.opacity = String(opacity);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progressRef, reducedMotionRef]);

  return (
    <div ref={rootRef} className={styles.wrap}>
      <PiedraSvg />
    </div>
  );
}
