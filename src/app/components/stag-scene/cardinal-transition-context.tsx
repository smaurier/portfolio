"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

/**
 * Contexte de la transition cardinale (28/08). Signature "le cerf
 * mène" — au click d'un lien nav, on joue une animation 500ms sur la
 * scène 3D courante AVANT de naviguer : cerf tourne tête vers
 * direction cible, camera orbit subtil dans direction, content HTML
 * fade. Router.push après ce burst.
 *
 * Le contexte expose :
 *  - `transitionDirection` : direction cardinale cible active pendant
 *    la fenêtre burst, ou null en repos.
 *  - `transitionProgressRef` : ref (pas state) qui monte 0→1 sur les
 *    500ms pour que StagModel/OrbitCamera lisent en useFrame sans
 *    re-render React.
 *  - `startTransition(direction)` : déclenche le burst puis appelle
 *    le callback (typiquement router.push) au terme.
 *
 * Refs et pas state pour progress : useFrame Three.js tire à ~60fps,
 * un state React re-render forcerait tout l'arbre pour rien.
 */

export type CardinalDirection = "jade" | "dore" | "turquoise" | "cendre" | "obsidienne";

// Vecteur cardinal en repère monde (X droite, Y haut, Z arrière).
// Le head-look du cerf pointe vers cerf.position + vector * dist.
export const CARDINAL_VECTORS: Record<CardinalDirection, [number, number, number]> = {
  jade: [0, 1, 0], // Centre = ciel (haut)
  dore: [1, 0.1, 0], // Est = droite, légère montée (aube)
  turquoise: [0, 0.1, 1], // Sud = derrière (vers Z+)
  cendre: [-1, 0.1, 0], // Ouest = gauche
  obsidienne: [0, 0.1, -1], // Nord = devant (vers Z-)
};

// 500 → 1200ms (28/08 après diagnostic Sylvain "je ne vois rien" — la
// mécanique fonctionne (capture Playwright mid-burst confirme cerf +
// palette + PetalStorm rendus), mais 500ms était trop rapide pour
// que l'œil perçoive la signature. Allongé à 1200ms pour laisser
// respirer sans traîner. Reste dans la plage acceptable pour UX nav.
export const TRANSITION_DURATION_MS = 1200;

type TransitionState = {
  transitionDirection: CardinalDirection | null;
  transitionProgressRef: React.MutableRefObject<number>;
  startTransition: (direction: CardinalDirection, onComplete: () => void) => void;
};

const CardinalTransitionContext = createContext<TransitionState | null>(null);

export function CardinalTransitionProvider({ children }: { children: ReactNode }) {
  const [transitionDirection, setTransitionDirection] = useState<CardinalDirection | null>(null);
  const transitionProgressRef = useRef(0);

  // Classe body pendant la transition — le CSS lit
  // `body.nahual-transitioning` pour fader main content, appliquer
  // pointer-events:none temporaire, etc. `data-transition-direction`
  // sert au CSS pour orienter le slide translate cardinal du content.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const active = transitionDirection !== null;
    document.body.classList.toggle("nahual-transitioning", active);
    if (active && transitionDirection) {
      document.body.setAttribute("data-transition-direction", transitionDirection);
    } else {
      document.body.removeAttribute("data-transition-direction");
    }
    return () => {
      document.body.classList.remove("nahual-transitioning");
      document.body.removeAttribute("data-transition-direction");
    };
  }, [transitionDirection]);

  const startTransition = useCallback((direction: CardinalDirection, onComplete: () => void) => {
    setTransitionDirection(direction);
    transitionProgressRef.current = 0;
    const startTime = performance.now();

    function tick() {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / TRANSITION_DURATION_MS);
      transitionProgressRef.current = t;
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        // Navigation à la fin du burst — la nouvelle page mount et
        // reset progress au tick suivant du nouveau SceneStage.
        onComplete();
        // Petit délai avant reset direction pour laisser la nouvelle
        // page hydratée absorber le repos initial (l'anim de mount
        // remplace visuellement le burst finissant).
        setTimeout(() => {
          transitionProgressRef.current = 0;
          setTransitionDirection(null);
        }, 60);
      }
    }
    requestAnimationFrame(tick);
  }, []);

  const value = useMemo(
    () => ({ transitionDirection, transitionProgressRef, startTransition }),
    [transitionDirection, startTransition],
  );

  return (
    <CardinalTransitionContext.Provider value={value}>
      {children}
    </CardinalTransitionContext.Provider>
  );
}

/** Hook consommateur. Retourne null hors du Provider — les composants
 *  scène 3D (StagModel/OrbitCamera) peuvent tomber sans casser si le
 *  Provider n'a pas encore été monté. */
export function useCardinalTransition(): TransitionState | null {
  return useContext(CardinalTransitionContext);
}
