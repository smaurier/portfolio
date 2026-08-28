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
  // Trace du glyphe : 0→1 sur les 40 premiers % du burst, tenu ensuite.
  const traceLength = Math.min(1, progress / 0.4);
  // Fade : monte vite (0→0.1), reste à 1, redescend en fin (0.85→1).
  const fade =
    progress < 0.1
      ? progress / 0.1
      : progress > 0.85
        ? Math.max(0, 1 - (progress - 0.85) / 0.15)
        : 1;
  // Scale burst spring bounce (28/08 amélioration retour Sylvain
  // "devrait plus exploser"). Courbe : 0.6 → 1.28 (overshoot) → 1
  // sur les 60 premiers %, hold, puis inspiration sortante 1→0.9.
  // Simule un back easing / spring physics sans lib.
  let scale = 1;
  if (progress < 0.2) {
    // Rise rapide overshoot : 0.6 → 1.28
    const t = progress / 0.2;
    scale = 0.6 + 0.68 * t;
  } else if (progress < 0.4) {
    // Settle : 1.28 → 1
    const t = (progress - 0.2) / 0.2;
    scale = 1.28 - 0.28 * (t * t * (3 - 2 * t));
  } else if (progress > 0.85) {
    // Sortie : 1 → 0.9
    scale = 1 - 0.1 * ((progress - 0.85) / 0.15);
  }

  // Halo bloom expansion (canal B) — scale du wrapper halo indépendant :
  // 0.4 → 3.5 sur toute la durée, opacity descend en parallèle.
  const haloScale = 0.4 + progress * 3.1;
  const haloOpacity = Math.max(0, 1 - progress * 1.05);

  // Radial rings (canal C) — 3 anneaux avec offset progress staggeré.
  // Chaque ring individual progress p_i = clamp((progress - delay) / span, 0, 1).
  function ringState(delay: number) {
    const p = Math.max(0, Math.min(1, (progress - delay) / 0.6));
    return {
      scale: 0.3 + p * 3.2,
      opacity: p < 0.05 ? p / 0.05 : Math.max(0, 1 - (p - 0.05) / 0.95) * 0.7,
    };
  }
  const ring1 = ringState(0);
  const ring2 = ringState(0.1);
  const ring3 = ringState(0.22);

  const color = DIRECTION_COLOR_VIVID[direction];

  return (
    <div className={styles.wrap} aria-hidden style={{ color }}>
      {/* Halo bloom : radial gradient qui explose en volume */}
      <div
        className={styles.halo}
        style={{
          opacity: haloOpacity,
          transform: `translate(-50%, -50%) scale(${haloScale})`,
          background: `radial-gradient(circle, ${color} 0%, transparent 60%)`,
        }}
      />
      {/* Radial rings concentric */}
      <svg className={styles.rings} viewBox="0 0 200 200" aria-hidden>
        <circle
          cx="100"
          cy="100"
          r="60"
          fill="none"
          stroke={color}
          strokeWidth="1.2"
          opacity={ring1.opacity}
          transform={`translate(100 100) scale(${ring1.scale}) translate(-100 -100)`}
          style={{ transformOrigin: "center", transformBox: "fill-box" }}
        />
        <circle
          cx="100"
          cy="100"
          r="60"
          fill="none"
          stroke={color}
          strokeWidth="1"
          opacity={ring2.opacity}
          transform={`translate(100 100) scale(${ring2.scale}) translate(-100 -100)`}
        />
        <circle
          cx="100"
          cy="100"
          r="60"
          fill="none"
          stroke={color}
          strokeWidth="0.8"
          opacity={ring3.opacity}
          transform={`translate(100 100) scale(${ring3.scale}) translate(-100 -100)`}
        />
      </svg>
      {/* Glyphe central */}
      <div
        className={styles.glyphSlot}
        style={{
          opacity: fade,
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      >
        <DirectionGlyph
          direction={direction}
          size={220}
          strokeWidth={1.3}
          traceLength={traceLength}
        />
      </div>
    </div>
  );
}
