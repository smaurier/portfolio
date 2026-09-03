"use client";

import gsap from "gsap";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { NEPANTLA_TIMING, enterOffset, exitOffset } from "@/lib/nepantla";

/**
 * Contexte de la transition cardinale, refondu 03/09 (chantier
 * Nepantla, plan valide par Sylvain). La View Transitions API est
 * DEPOSEE : elle snapshotait la page entiere, donc le monde 3D
 * persistant (cerf + Piedra + montagnes) etait fige en screenshot et
 * glissait en double = le "hache". Desormais une timeline GSAP unique
 * orchestre tout le passage sur UNE horloge :
 *
 *  - le progress 0→1 lu en useFrame par StagModel (head-look) et
 *    OrbitCamera (whip pan) : inchange pour les consommateurs ;
 *  - la sortie du contenu DOM seul (la frame enregistree par
 *    NepantlaFrame), emporte par Ehecatl dans la direction cardinale,
 *    ease .in = le vent accelere ;
 *  - router.push au coeur du mouvement (fin de sortie, contenu hors
 *    ecran) : React swap les children pendant que la frame est
 *    invisible, le canvas ne s'arrete jamais ;
 *  - l'entree du nouveau contenu depuis le cote oppose, ease .out =
 *    il se pose. Declenchee par NepantlaFrame quand le pathname a
 *    reellement change (commit React garanti, plus de double-rAF ni
 *    de flushSync).
 *
 * Offsets et tempo viennent de lib/nepantla.ts (source unique, TDD).
 * Refs et pas state pour progress : useFrame tire a ~60fps.
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

// Conservee pour les consommateurs existants (duree du progress).
export const TRANSITION_DURATION_MS = NEPANTLA_TIMING.progressDuration * 1000;

// Opacite du contenu pendant le glissement : il ne disparait pas en
// fondu (il SORT de l'ecran), juste attenue pour laisser la scene
// porter. Le jade (implosion sans deplacement) fond a zero.
const SLIDE_OPACITY = 0.3;

type TransitionState = {
  transitionDirection: CardinalDirection | null;
  transitionProgressRef: React.MutableRefObject<number>;
  startTransition: (direction: CardinalDirection, onComplete: () => void) => void;
  /** NepantlaFrame enregistre ici l'element qui porte le contenu de page. */
  registerFrame: (el: HTMLElement | null) => void;
  /** Appele par NepantlaFrame quand le pathname a change : joue l'entree. */
  completeArrival: () => void;
};

const CardinalTransitionContext = createContext<TransitionState | null>(null);

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function CardinalTransitionProvider({ children }: { children: ReactNode }) {
  const [transitionDirection, setTransitionDirection] = useState<CardinalDirection | null>(null);
  const transitionProgressRef = useRef(0);
  const frameRef = useRef<HTMLElement | null>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  // Direction en ref pour completeArrival (appele hors cycle React).
  const directionRef = useRef<CardinalDirection | null>(null);

  // Classe body pendant la transition : le CSS lit
  // `body.nahual-transitioning` pour couper les pointer-events le
  // temps du passage (l'opacite/transform sont desormais pilotes par
  // GSAP, plus par le CSS).
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle("nahual-transitioning", transitionDirection !== null);
    return () => {
      document.body.classList.remove("nahual-transitioning");
    };
  }, [transitionDirection]);

  const registerFrame = useCallback((el: HTMLElement | null) => {
    frameRef.current = el;
  }, []);

  const startTransition = useCallback((direction: CardinalDirection, onComplete: () => void) => {
    // Mode recit : nav seche immediate, aucun tween (le canvas est
    // cache, le voyage n'a rien a raconter ; et le CSS animation:none
    // du reading-mode ne couperait pas des styles inline GSAP).
    if (typeof document !== "undefined" && document.body.classList.contains("reading-mode")) {
      onComplete();
      return;
    }
    // Passage deja en cours : on ignore (double-click, spam clavier).
    if (directionRef.current !== null) return;
    directionRef.current = direction;
    setTransitionDirection(direction);
    transitionProgressRef.current = 0;

    timelineRef.current?.kill();
    const tl = gsap.timeline();
    timelineRef.current = tl;

    // Horloge des consommateurs 3D (head-look, whip pan) : lineaire,
    // chacun met en forme avec sa propre cloche comme avant.
    tl.to(transitionProgressRef, {
      current: 1,
      duration: NEPANTLA_TIMING.progressDuration,
      ease: "none",
    }, 0);

    const frame = frameRef.current;
    if (frame && !prefersReducedMotion()) {
      const out = exitOffset(direction);
      tl.to(frame, {
        x: out.x * window.innerWidth,
        y: out.y * window.innerHeight,
        scale: out.scale,
        opacity: direction === "jade" ? 0 : SLIDE_OPACITY,
        duration: NEPANTLA_TIMING.exitDuration,
        ease: NEPANTLA_TIMING.exitEase,
        onComplete,
      }, NEPANTLA_TIMING.exitDelay);
    } else if (frame) {
      // Reduced motion (RGAA 13.6 / prefers-reduced-motion) : fondu
      // court, aucun deplacement.
      tl.to(frame, {
        opacity: 0,
        duration: NEPANTLA_TIMING.reducedFadeDuration,
        onComplete,
      }, 0);
    } else {
      // Pas de frame enregistree (garde-fou) : nav au meme moment.
      tl.call(onComplete, [], NEPANTLA_TIMING.exitDelay + NEPANTLA_TIMING.exitDuration);
    }
  }, []);

  const completeArrival = useCallback(() => {
    const direction = directionRef.current;
    if (!direction) return; // nav directe (back/forward, URL) : rien a jouer.
    const frame = frameRef.current;

    const reset = () => {
      timelineRef.current = null;
      transitionProgressRef.current = 0;
      directionRef.current = null;
      setTransitionDirection(null);
    };
    // L'entree du contenu peut finir AVANT la fin du tour de camera
    // (progressDuration) : couper la timeline ici ferait sauter
    // l'orbite en plein vol. On laisse le voyage s'achever (il retombe
    // exactement sur la position de repos, 2π periodique) et on reset
    // a son terme.
    const finish = () => {
      const tl = timelineRef.current;
      if (tl && tl.isActive()) {
        tl.eventCallback("onComplete", reset);
      } else {
        tl?.kill();
        reset();
      }
    };

    if (!frame) {
      finish();
      return;
    }
    if (prefersReducedMotion()) {
      gsap.fromTo(frame, { opacity: 0 }, {
        opacity: 1,
        duration: NEPANTLA_TIMING.reducedFadeDuration,
        clearProps: "opacity,transform",
        onComplete: finish,
      });
      return;
    }
    const inn = enterOffset(direction);
    gsap.fromTo(frame, {
      x: inn.x * window.innerWidth,
      y: inn.y * window.innerHeight,
      scale: inn.scale,
      opacity: direction === "jade" ? 0 : SLIDE_OPACITY,
    }, {
      x: 0,
      y: 0,
      scale: 1,
      opacity: 1,
      duration: NEPANTLA_TIMING.enterDuration,
      ease: NEPANTLA_TIMING.enterEase,
      // clearProps : aucun transform residuel apres le passage (un
      // transform sur la frame ferait d'elle le containing block des
      // position:fixed descendants).
      clearProps: "transform,opacity",
      onComplete: finish,
    });
  }, []);

  const value = useMemo(
    () => ({ transitionDirection, transitionProgressRef, startTransition, registerFrame, completeArrival }),
    [transitionDirection, startTransition, registerFrame, completeArrival],
  );

  return (
    <CardinalTransitionContext.Provider value={value}>
      {children}
    </CardinalTransitionContext.Provider>
  );
}

/** Hook consommateur. Retourne null hors du Provider : les composants
 *  scène 3D (StagModel/OrbitCamera) peuvent tomber sans casser si le
 *  Provider n'a pas encore été monté. */
export function useCardinalTransition(): TransitionState | null {
  return useContext(CardinalTransitionContext);
}
