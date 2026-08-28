"use client";

import type { CSSProperties } from "react";
import type { DirectionKey } from "./direction-colors";

/**
 * Micro-glyphes cardinaux SVG partagés (28/08 refactor). Extraits de
 * PageClosure pour réutilisation dans CardinalGlyphBurst (le glyphe
 * qui se dessine au centre du viewport pendant la transition
 * cardinale).
 *
 * Formes procédurales inspirées du Codex Nahual mais simplifiées.
 * `stroke=currentColor` : hérite de la teinte cardinale via
 * color CSS.
 *
 * Le prop `traceLength` (optionnel, 0..1) sert au burst : quand < 1,
 * seule une portion du tracé est visible via stroke-dasharray, ce
 * qui simule le dessin qui se fait dans le viewport (comme un scribe
 * qui trace le glyphe cardinal du moment).
 */
export default function DirectionGlyph({
  direction,
  size = 24,
  strokeWidth = 1.4,
  className,
  style,
  traceLength,
  reliefFilterId,
}: {
  direction: DirectionKey;
  size?: number;
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
  /** 0..1 : proportion du tracé visible. Undefined = tracé complet. */
  traceLength?: number;
  /** Si fourni, ajoute un filter SVG "pierre gravée" — inner shadow
   *  + outer glow. Le filter doit être défini dans le même document
   *  SVG parent (via <defs>) ou dans un module global. */
  reliefFilterId?: string;
}) {
  // Longueur approximative du path pour dashoffset — mesurée à l'œil
  // pour chaque glyphe. Peu importe l'exactitude : quand traceLength=1
  // le dasharray couvre plus que le tracé, tout est visible.
  const PATH_LENGTH_ESTIMATE = 260;
  const dashoffset =
    traceLength === undefined
      ? undefined
      : PATH_LENGTH_ESTIMATE * (1 - Math.max(0, Math.min(1, traceLength)));

  const dashProps =
    traceLength === undefined
      ? {}
      : {
          strokeDasharray: PATH_LENGTH_ESTIMATE,
          strokeDashoffset: dashoffset,
        };

  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    style,
    "aria-hidden": true,
    filter: reliefFilterId ? `url(#${reliefFilterId})` : undefined,
    ...dashProps,
  };

  switch (direction) {
    case "jade":
      // Centre — quinconce (Nahui Ollin simplifié).
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="1.6" fill="currentColor" />
          <circle cx="12" cy="4" r="1.2" fill="currentColor" />
          <circle cx="12" cy="20" r="1.2" fill="currentColor" />
          <circle cx="4" cy="12" r="1.2" fill="currentColor" />
          <circle cx="20" cy="12" r="1.2" fill="currentColor" />
        </svg>
      );
    case "dore":
      // Est — soleil rayonnant (Tonatiuh).
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3.5" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
        </svg>
      );
    case "turquoise":
      // Sud — Xochitl (fleur 4 pétales).
      return (
        <svg {...common}>
          <path d="M12 5c-2 0-3.5 1.5-3.5 3.5S10 12 12 12s3.5-1.5 3.5-3.5S14 5 12 5z" />
          <path d="M5 12c0-2 1.5-3.5 3.5-3.5S12 10 12 12s-1.5 3.5-3.5 3.5S5 14 5 12z" />
          <path d="M12 19c-2 0-3.5-1.5-3.5-3.5S10 12 12 12s3.5 1.5 3.5 3.5S14 19 12 19z" />
          <path d="M19 12c0 2-1.5 3.5-3.5 3.5S12 14 12 12s1.5-3.5 3.5-3.5S19 10 19 12z" />
          <circle cx="12" cy="12" r="1.2" fill="currentColor" />
        </svg>
      );
    case "cendre":
      // Ouest — Iztli (silex/couteau d'obsidienne).
      return (
        <svg {...common}>
          <path d="M12 3l5 14H7L12 3z" />
          <path d="M9.5 10.5h5" />
        </svg>
      );
    case "obsidienne":
      // Nord — Ollin (mouvement) spirale.
      return (
        <svg {...common}>
          <path d="M12 12m-0.5-0.5a1.5 1.5 0 0 1 2.5 1.5a3 3 0 0 1-4.5 2a5 5 0 0 1-2-6.5a7 7 0 0 1 9-2.5" />
        </svg>
      );
  }
}
