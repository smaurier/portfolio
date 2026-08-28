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

  // Refonte 28/08 (retour Sylvain "pas fin, devrait exploser vers le
  // centre, subtil et adroit"). Signature "implosion vers centre" —
  // le glyphe se MATÉRIALISE (converge depuis dispersion) plutôt que
  // d'exploser. Refs Rauno.me / Immersive Garden B&O / Studio 121
  // (convergence subtile).
  //
  // Courbes ease-out-quart cubic-bezier(0.22, 1, 0.36, 1) partout,
  // pas de spring bounce.

  // easeOutQuart (approx)
  function eoq(t: number) {
    const tt = Math.min(1, Math.max(0, t));
    return 1 - Math.pow(1 - tt, 4);
  }

  // Trace du glyphe : monte 100→300ms (progress 0.2→0.6).
  const traceLength = eoq((progress - 0.2) / 0.4);

  // Fade glyphe : in 0.2→0.35, hold, out 0.85→1.
  const fade =
    progress < 0.2
      ? 0
      : progress < 0.35
        ? eoq((progress - 0.2) / 0.15)
        : progress > 0.85
          ? Math.max(0, 1 - eoq((progress - 0.85) / 0.15))
          : 1;

  // Glyphe scale gentle : 1.4 → 1 → 0.95 sur l'arc. Overshoot INVERSE
  // (converge depuis trop grand vers taille de repos), pas de bounce.
  let scale = 1;
  if (progress < 0.4) {
    // 1.4 → 1
    scale = 1.4 - 0.4 * eoq(progress / 0.4);
  } else if (progress > 0.85) {
    // 1 → 0.95
    scale = 1 - 0.05 * eoq((progress - 0.85) / 0.15);
  }

  // Halo bloom INVERSE (canal B) — scale 2.5 → 1 shrink, fade in doux
  // puis out. Plus discret que l'explosion précédente.
  const haloScale = 2.5 - 1.5 * eoq(progress / 0.6);
  const haloOpacity =
    progress < 0.3
      ? eoq(progress / 0.3) * 0.55
      : progress > 0.75
        ? Math.max(0, 0.55 * (1 - eoq((progress - 0.75) / 0.25)))
        : 0.55;

  // Radial rings INVERSE (canal C) — 3 anneaux commencent GRANDS
  // (scale 3.5), contract lentement vers 1 (taille du glyphe),
  // fade in doux. Signature "ondes du monde qui reviennent au centre
  // pour former le signe".
  function ringState(delay: number) {
    const p = Math.max(0, Math.min(1, (progress - delay) / 0.55));
    const eased = eoq(p);
    return {
      scale: 3.5 - 2.5 * eased,
      opacity: p < 0.12 ? (p / 0.12) * 0.55 : Math.max(0, 0.55 * (1 - eased * 1.05)),
    };
  }
  const ring1 = ringState(0);
  const ring2 = ringState(0.08);
  const ring3 = ringState(0.16);

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
          size={150}
          strokeWidth={0.85}
          traceLength={traceLength}
        />
      </div>
    </div>
  );
}
