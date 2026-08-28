"use client";

import { type CSSProperties } from "react";
import { useCardinalTransition, type CardinalDirection } from "./cardinal-transition-context";
import { DIRECTION_COLOR_VIVID } from "./direction-colors";
import styles from "./page-slicer.module.css";

/**
 * Écran découpé en slices qui glissent dans la direction cardinale
 * cible pendant la transition — signature Awwwards Immersive Garden
 * adaptée nahua "codex qui s'écarte en pages" (28/08 après retour
 * Sylvain "curtain moche"). Remplace PetalCurtain 2D confetti retiré.
 *
 * Concept : au click, 10 bandes verticales (Est/Ouest) ou horizontales
 * (Sud/Nord) apparaissent, glass gradient direction subtile, chacune
 * glisse vers la direction cardinale avec delay staggered (60ms entre
 * slices). Backdrop-filter blur au moment du reveal, se dissipe en
 * même temps que la slice sort de l'écran. Le contenu réel (scène 3D
 * + main HTML) reste derrière et se dévoile progressivement.
 *
 * Direction jade (Centre) : implosion — les slices convergent vers le
 * centre + fade, pas de translate cardinal.
 *
 * Animation via @keyframes CSS liés à data-active + data-axis +
 * data-slide sur le wrap racine. Aucun JS par frame : uniquement
 * data attributes changent quand transition commence/finit, CSS
 * anime toute la mécanique.
 */

const SLICE_COUNT = 10;

function axisAndSlide(direction: CardinalDirection): { axis: string; slide: string } {
  switch (direction) {
    case "dore": return { axis: "vertical", slide: "right" };
    case "cendre": return { axis: "vertical", slide: "left" };
    case "turquoise": return { axis: "horizontal", slide: "down" };
    case "obsidienne": return { axis: "horizontal", slide: "up" };
    case "jade": return { axis: "vertical", slide: "center" };
  }
}

export default function PageSlicer() {
  const transition = useCardinalTransition();
  const active = transition?.transitionDirection !== null;
  const dir = transition?.transitionDirection ?? null;
  const config = dir ? axisAndSlide(dir) : { axis: "vertical", slide: "center" };
  const color = dir ? DIRECTION_COLOR_VIVID[dir] : "#00c078";

  const wrapStyle: CSSProperties & Record<string, string> = {
    "--slice-color": color,
  };

  return (
    <div
      className={styles.wrap}
      data-active={active ? "true" : "false"}
      data-axis={config.axis}
      data-slide={config.slide}
      style={wrapStyle}
      aria-hidden
    >
      {Array.from({ length: SLICE_COUNT }).map((_, i) => (
        <div
          key={i}
          className={styles.slice}
          style={{ "--slice-index": i } as CSSProperties & Record<string, string>}
        />
      ))}
    </div>
  );
}
