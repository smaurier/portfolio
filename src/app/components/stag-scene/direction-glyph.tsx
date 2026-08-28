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
      // Centre — motif quinconce + moulinet stylisé (évocation
      // Centre/Tlalxicco "le nombril du monde"). Cinq points +
      // 4 arcs giratoires vers le centre. Motif géométrique cosmique
      // universel (quinconce se retrouve dans de nombreuses cultures
      // ancestrales), pas revendication de reproduction fidèle d'un
      // glyphe sacré nahua précis — hommage stylisé familial
      // (option A du 28/08).
      return (
        <svg {...common}>
          {/* 4 arcs courbes reliant le centre aux 4 points cardinaux (moulinet) */}
          <path d="M12 12 Q10 8 12 5" />
          <path d="M12 12 Q16 10 19 12" />
          <path d="M12 12 Q14 16 12 19" />
          <path d="M12 12 Q8 14 5 12" />
          {/* Centre plein */}
          <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
          {/* 4 disques cardinaux */}
          <circle cx="12" cy="5" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="19" cy="12" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="12" cy="19" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      );
    case "dore":
      // Est — motif solaire stylisé (évocation Est/Tlahuizcalpan
      // "l'aube dorée"). Disque central + 4 rayons cardinaux longs +
      // 4 rayons diagonaux courts. Visage sacré volontairement omis
      // pour respecter la sacralité de l'iconographie religieuse
      // mésoaméricaine (option A du 28/08 : évocation ornementale,
      // pas reproduction).
      return (
        <svg {...common}>
          {/* Disque central plein */}
          <circle cx="12" cy="12" r="4.2" />
          {/* Petit cercle intérieur ornemental (motif géométrique
              universel, pas de connotation sacrée). */}
          <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
          {/* 4 rayons cardinaux principaux */}
          <path d="M12 1.8 v3 M12 19.2 v3 M1.8 12 h3 M19.2 12 h3" />
          {/* 4 rayons secondaires diagonaux plus courts */}
          <path d="M4.7 4.7 l1.5 1.5 M17.8 17.8 l1.5 1.5 M4.7 19.3 l1.5 -1.5 M17.8 6.2 l1.5 -1.5" />
        </svg>
      );
    case "turquoise":
      // Sud — motif fleur stylisée (évocation Sud/Huitztlampa
      // "Xochitl, la fleur"). 4 pétales en goutte + tige haute +
      // centre plein. La fleur = motif ornemental universel (présent
      // dans quasi toutes les cultures), inspiration mésoaméricaine
      // libre, pas reproduction d'un glyphe calendaire sacré précis
      // (option A du 28/08).
      return (
        <svg {...common}>
          {/* Tige d'entrée depuis le haut */}
          <path d="M12 1.5 v2.5" />
          {/* Pétale nord (goutte, arrondi vers extérieur, pointe vers centre) */}
          <path d="M12 4 C9.5 5 8 7.5 12 12 C16 7.5 14.5 5 12 4 Z" />
          {/* Pétale est */}
          <path d="M20 12 C19 9.5 16.5 8 12 12 C16.5 16 19 14.5 20 12 Z" />
          {/* Pétale sud */}
          <path d="M12 20 C14.5 19 16 16.5 12 12 C8 16.5 9.5 19 12 20 Z" />
          {/* Pétale ouest */}
          <path d="M4 12 C5 14.5 7.5 16 12 12 C7.5 8 5 9.5 4 12 Z" />
          {/* Centre plein */}
          <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      );
    case "cendre":
      // Ouest — motif silex/lame stylisé (évocation Ouest/
      // Cihuatlampa "le crépuscule mauve"). Deux triangles pointés
      // convergents + double bandeau ornemental. Décoration
      // sacrificielle spécifique (œil frontal Iztli) volontairement
      // omise pour respecter la sacralité de l'iconographie
      // religieuse mésoaméricaine (option A du 28/08).
      return (
        <svg {...common}>
          {/* Triangle supérieur */}
          <path d="M12 2.5 L9 12 L15 12 Z" />
          {/* Triangle inférieur */}
          <path d="M12 21.5 L9 12 L15 12 Z" />
          {/* Bandeau central double (ornementation géométrique) */}
          <path d="M8 12 h8" />
          <path d="M8.5 13.2 h7" />
        </svg>
      );
    case "obsidienne":
      // Nord — motif X courbé + disques cardinaux (évocation
      // Nord/Mictlampa "le lieu du repos"). 4 branches courbes qui
      // convergent au centre + disques aux extrémités. Motif
      // géométrique cosmique évocateur, pas reproduction d'un glyphe
      // calendaire sacré précis (option A du 28/08).
      return (
        <svg {...common}>
          {/* Branche haut-gauche → centre (courbe) */}
          <path d="M4 4 Q8 8 12 12" />
          {/* Branche haut-droite → centre */}
          <path d="M20 4 Q16 8 12 12" />
          {/* Branche bas-gauche → centre */}
          <path d="M4 20 Q8 16 12 12" />
          {/* Branche bas-droite → centre */}
          <path d="M20 20 Q16 16 12 12" />
          {/* 4 disques aux extrémités */}
          <circle cx="4" cy="4" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="20" cy="4" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="4" cy="20" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="20" cy="20" r="1.5" fill="currentColor" stroke="none" />
          {/* Centre plein */}
          <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}
