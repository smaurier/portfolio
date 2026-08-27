"use client";

import Link from "next/link";
import { useEffect, useRef, type CSSProperties, type MutableRefObject } from "react";
import { getNavEmphasis } from "@/lib/reveal-arc";
import { getPath, type PageKey } from "@/lib/routes";
import type { Locale } from "../../../dictionaries";
import {
  DIRECTION_ACCENT_COMPLEMENTARY,
  DIRECTION_COLOR_VIVID,
  type DirectionKey,
} from "./direction-colors";
import styles from "./page-closure.module.css";

/**
 * Bloc de closure narratif au climax des pages écho — signature
 * "Codex nahua" (27/08, retour Sylvain "overlay fait grossier").
 *
 * Card glass avec gradient direction, border 1px cardinale qui se
 * trace, H2 split par mot avec stagger, underline dorée qui se
 * dessine, micro-glyphe cardinal en marge, CTA pill avec chevron
 * animé. Timings enchaînés (~800ms total).
 *
 * Contenu par direction (Codex Nahual s3) :
 *  - jade / Centre / Tlalxicco
 *  - dore / Est / Tlahuizcalpan
 *  - turquoise / Sud / Huitztlampa
 *  - cendre / Ouest / Cihuatlampa
 *  - obsidienne / Nord / Mictlampa (retour Centre pour fermer le cycle)
 *
 * La classe `.revealed` est posée en fonction de getNavEmphasis > 0.05
 * (rAF interne, pas de useState pour éviter les re-renders inutiles) —
 * mêmes fenêtres que FadingBlock ancienne version, mais transitions CSS
 * enchaînées au lieu d'un simple opacity fade.
 */

type ClosureContent = {
  cardinal: string;
  poetic: string;
  nextKey: PageKey | null;
  nextLabel: string;
};

const CLOSURES: Record<DirectionKey, ClosureContent> = {
  jade: {
    cardinal: "Centre · Tlalxicco",
    poetic: "Le nombril du monde — d'où partent les chemins.",
    nextKey: "services",
    nextLabel: "Est · Doré",
  },
  dore: {
    cardinal: "Est · Tlahuizcalpan",
    poetic: "L'aube dorée — Tonatiuh se lève, la journée s'ouvre.",
    nextKey: "projets",
    nextLabel: "Sud · Turquoise",
  },
  turquoise: {
    cardinal: "Sud · Huitztlampa",
    poetic: "Xochitl, la fleur — Huitzilopochtli veille sur ce qui pousse.",
    nextKey: "contact",
    nextLabel: "Ouest · Cendre",
  },
  cendre: {
    cardinal: "Ouest · Cihuatlampa",
    poetic: "Le crépuscule mauve — Cihuateteo raccompagnent le soleil.",
    nextKey: "memoire",
    nextLabel: "Nord · Obsidienne",
  },
  obsidienne: {
    cardinal: "Nord · Mictlampa",
    poetic: "Le lieu du repos — Mictlán reçoit ce qui a été vécu.",
    nextKey: null,
    nextLabel: "Retour au Centre",
  },
};

/**
 * Micro-glyphes cardinaux SVG 24×24, tracés en stroke pour hériter de
 * la teinte via `currentColor`. Formes procédurales inspirées du Codex
 * Nahual mais simplifiées (pas de reproduction textuelle d'un glyphe
 * historique — évocation, pas citation).
 */
function DirectionGlyph({ direction }: { direction: DirectionKey }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: styles.glyph,
    "aria-hidden": true,
  };
  switch (direction) {
    case "jade":
      // Centre — quinconce (Nahui Ollin simplifié) : croix + 4 points.
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
      // Est — soleil rayonnant (Tonatiuh) : cercle + 8 rayons.
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
      // Ouest — Iztli (silex/couteau d'obsidienne), triangle pointu.
      return (
        <svg {...common}>
          <path d="M12 3l5 14H7L12 3z" />
          <path d="M9.5 10.5h5" />
        </svg>
      );
    case "obsidienne":
      // Nord — Ollin (mouvement) : spirale.
      return (
        <svg {...common}>
          <path d="M12 12m-0.5-0.5a1.5 1.5 0 0 1 2.5 1.5a3 3 0 0 1-4.5 2a5 5 0 0 1-2-6.5a7 7 0 0 1 9-2.5" />
        </svg>
      );
  }
}

export default function PageClosure({
  directionKey,
  locale,
  progressRef,
  reducedMotionRef,
}: {
  directionKey: DirectionKey;
  locale: Locale;
  progressRef: MutableRefObject<number>;
  reducedMotionRef: MutableRefObject<boolean>;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const closure = CLOSURES[directionKey];
  const nextHref = closure.nextKey ? getPath(locale, closure.nextKey) : `/${locale}`;

  // Toggle `.revealed` en fonction de getNavEmphasis via rAF — pas de
  // useState pour éviter re-renders. Sous prefers-reduced-motion, le CSS
  // court-circuite les animations, mais on veut quand même que la card
  // soit VISIBLE (pas cachée par le clip-path initial) — on force
  // .revealed en dur au montage dans ce cas.
  useEffect(() => {
    let raf: number;
    function tick() {
      const el = rootRef.current;
      if (el) {
        const reduced = reducedMotionRef.current;
        const emphasis = reduced ? 1 : getNavEmphasis(progressRef.current);
        const shouldReveal = emphasis > 0.05;
        el.classList.toggle(styles.revealed, shouldReveal);
        // pointer-events uniquement quand la card est visible — évite
        // qu'un CTA invisible reste cliquable en début de scroll.
        el.style.pointerEvents = emphasis > 0.15 ? "auto" : "none";
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progressRef, reducedMotionRef]);

  const cardinalWords = closure.cardinal.split(" ");
  const style: CSSProperties = {
    "--closure-color": DIRECTION_COLOR_VIVID[directionKey],
    "--closure-accent": DIRECTION_ACCENT_COMPLEMENTARY[directionKey],
  } as CSSProperties;

  return (
    <div ref={rootRef} className={styles.closure} style={style}>
      <DirectionGlyph direction={directionKey} />
      <h2 className={styles.title}>
        {cardinalWords.map((word, i) => (
          <span key={i} className={styles.word}>
            {word}
          </span>
        ))}
      </h2>
      <div className={styles.underline} />
      <p className={styles.poetic}>{closure.poetic}</p>
      <Link href={nextHref} className={styles.cta}>
        {closure.nextLabel}
        <span className={styles.arrow} aria-hidden>
          {closure.nextKey ? "→" : "↺"}
        </span>
      </Link>
    </div>
  );
}
