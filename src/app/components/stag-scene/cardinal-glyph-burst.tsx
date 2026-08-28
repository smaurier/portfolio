"use client";

import { useEffect, useRef, useState } from "react";
import { DIRECTION_COLOR_VIVID } from "./direction-colors";
import DirectionGlyph from "./direction-glyph";
import {
  TRANSITION_DURATION_MS,
  useCardinalTransition,
  type CardinalDirection,
} from "./cardinal-transition-context";
import styles from "./cardinal-glyph-burst.module.css";

/**
 * Glyphe cardinal qui se dessine au centre du viewport pendant le
 * burst de transition (28/08, Cabbi pattern adapté nahua). Amplifie
 * le signal "cerf mène" avec un marqueur pictographique fort — le
 * codex se signe visuellement chaque changement de direction.
 *
 * Rendu dans le Provider (dernier enfant), position fixed, très haut
 * z-index. Pas d'interception d'événements (pointer-events:none).
 *
 * Timing 500ms burst partagé avec l'orchestration :
 *  - 0→0.4s : glyphe fade in + dessin stroke (dasharray 0→1)
 *  - 0.4→1.0s : hold complet
 *  - 1.0s→retour repos : géré par le remount de la nouvelle page
 *    (le burst dure exactement TRANSITION_DURATION_MS puis nav)
 */
export default function CardinalGlyphBurst() {
  const transition = useCardinalTransition();
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!transition) return;
    function tick() {
      const p = transition!.transitionProgressRef.current;
      setProgress(p);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [transition]);

  if (!transition?.transitionDirection || progress <= 0) return null;

  const direction: CardinalDirection = transition.transitionDirection;
  // Trace du glyphe : 0→1 sur la première moitié du burst, tenu ensuite.
  const traceLength = Math.min(1, progress / 0.5);
  // Fade : monte vite (0→0.15), reste à 1, redescend en fin (0.85→1).
  const fade =
    progress < 0.15
      ? progress / 0.15
      : progress > 0.85
        ? Math.max(0, 1 - (progress - 0.85) / 0.15)
        : 1;
  // Léger scale sur l'entrée (0.85→1) et une inspiration sortante
  // (1→0.94) au delà de 0.85.
  const scale =
    progress < 0.3
      ? 0.85 + 0.15 * (progress / 0.3)
      : progress > 0.85
        ? 1 - 0.06 * ((progress - 0.85) / 0.15)
        : 1;

  return (
    <div
      className={styles.wrap}
      aria-hidden
      style={{
        opacity: fade,
        transform: `translate(-50%, -50%) scale(${scale})`,
        color: DIRECTION_COLOR_VIVID[direction],
      }}
    >
      <DirectionGlyph
        direction={direction}
        size={148}
        strokeWidth={1.15}
        traceLength={traceLength}
      />
    </div>
  );
}
