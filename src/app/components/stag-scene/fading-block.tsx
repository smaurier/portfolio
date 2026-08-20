"use client";

import { useEffect, useRef, type MutableRefObject, type ReactNode } from "react";
import styles from "./scene-text-overlay.module.css";

/**
 * Bloc de texte dont l'opacité suit le scroll (cf reveal-arc.ts) — en flux
 * normal, pas positionné lui-même (contrairement à l'ancienne version de
 * SceneTextOverlay) : c'est SceneTextOverlay (le parent) qui empile
 * plusieurs FadingBlock verticalement, pour que deux blocs cohabitant au
 * même coin (retour de Sylvain le 20/08 : hero + à-propos tous les deux en
 * bas à gauche) ne se superposent jamais, même quand les deux sont visibles
 * en même temps (`prefers-reduced-motion`, cf garde-fou du Codex Nahual).
 *
 * `display: none` en plus de l'opacité quand le bloc est totalement
 * invisible : un bloc à opacité 0 reste sinon présent dans le flux et
 * pousse le voisin visible loin de son ancrage réel — bug constaté en vrai
 * (hero collé en haut au lieu du bas, à-propos invisible occupant quand
 * même sa hauteur dans la colonne). Sûr ici : hero (getIntroOpacity) et
 * à-propos (getNavEmphasis) n'ont jamais tous les deux une opacité non
 * nulle en même temps hors reduced-motion (fenêtres [0, 0.25[ et ]0.75, 1]
 * disjointes) — et sous reduced-motion, les deux passent à 1 ensemble,
 * jamais collapsés, donc jamais superposés (empilés en flux normal).
 *
 * Même technique que l'ancien SceneTextOverlay : requestAnimationFrame
 * plutôt qu'un listener 'scroll' séparé (évite tout risque d'ordre
 * d'exécution avec le handleScroll de stag-scene.tsx qui met à jour
 * progressRef.current pour le même événement).
 */
export default function FadingBlock({
  progressRef,
  reducedMotionRef,
  getOpacity,
  initialOpacity,
  children,
}: {
  progressRef: MutableRefObject<number>;
  reducedMotionRef: MutableRefObject<boolean>;
  getOpacity: (progress: number) => number;
  /** Opacité de tout premier rendu (avant même le premier tick JS) — posée
   * explicitement en style inline plutôt que laissée au défaut du
   * navigateur (1) : sans ça, un bloc censé démarrer invisible (l'à-propos)
   * flashait plein pot avant le premier calcul, superposé au hero — bug
   * réel constaté (cf memory project-nahual-da, 19/08), pas hypothétique. */
  initialOpacity: number;
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf: number;
    function tick() {
      const opacity = reducedMotionRef.current ? 1 : getOpacity(progressRef.current);
      const el = rootRef.current;
      if (el) {
        el.style.opacity = String(opacity);
        el.style.pointerEvents = opacity > 0.05 ? "auto" : "none";
        el.style.display = opacity > 0.001 ? "flex" : "none";
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progressRef, reducedMotionRef, getOpacity]);

  return (
    <div
      ref={rootRef}
      className={styles.block}
      style={{
        opacity: initialOpacity,
        pointerEvents: initialOpacity > 0.05 ? "auto" : "none",
        display: initialOpacity > 0.001 ? "flex" : "none",
      }}
    >
      {children}
    </div>
  );
}
