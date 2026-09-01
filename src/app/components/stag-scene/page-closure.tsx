"use client";

import { useEffect, useRef, type CSSProperties, type MutableRefObject } from "react";
import CardinalLink from "./cardinal-link";
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
 * Bloc de closure narratif au climax des pages écho : signature
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
 * (rAF interne, pas de useState pour éviter les re-renders inutiles) :
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
    poetic: "Le nombril du monde. D'où partent les chemins.",
    nextKey: "services",
    nextLabel: "Est · Doré",
  },
  dore: {
    cardinal: "Est · Tlahuizcalpan",
    poetic: "L'aube dorée. Tonatiuh se lève, la journée s'ouvre.",
    nextKey: "projets",
    nextLabel: "Sud · Turquoise",
  },
  turquoise: {
    cardinal: "Sud · Huitztlampa",
    poetic: "Xochitl, la fleur. Huitzilopochtli veille sur ce qui pousse.",
    nextKey: "contact",
    nextLabel: "Ouest · Cendre",
  },
  cendre: {
    cardinal: "Ouest · Cihuatlampa",
    poetic: "Le crépuscule mauve. Cihuateteo raccompagnent le soleil.",
    nextKey: "memoire",
    nextLabel: "Nord · Obsidienne",
  },
  obsidienne: {
    cardinal: "Nord · Mictlampa",
    poetic: "Le lieu du repos. Mictlán reçoit ce qui a été vécu.",
    nextKey: null,
    nextLabel: "Retour au Centre",
  },
};

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

  // Toggle `.revealed` en fonction de getNavEmphasis via rAF : pas de
  // useState pour éviter re-renders. Sous prefers-reduced-motion, le CSS
  // court-circuite les animations, mais on veut quand même que la card
  // soit VISIBLE (pas cachée par le clip-path initial) : on force
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
        // pointer-events uniquement quand la card est visible : évite
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

  // aria-hidden + tabIndex=-1 sur CTA (29/08 chantier a11y). Le bloc
  // est monte hors main via SceneStage.overlay, ordre DOM avant le
  // <main> reel : sans ce masquage, les SR annoncent le h2 cardinal
  // + le lien "prochain" AVANT le vrai h1 de la page (hierarchie
  // brisee, confusion pedagogique). Equivalent fonctionnel garanti
  // via la boussole cardinale (nav aria-label="Boussole cardinale",
  // 5 boutons labelles + boussole detaillee) et la nav du header
  // (nav aria-label a fixer, en cours). Reste 100% visible et
  // cliquable pour utilisateurs souris.
  return (
    <div ref={rootRef} className={styles.closure} style={style} aria-hidden="true">
      <h2 className={styles.title}>
        {cardinalWords.map((word, i) => (
          <span key={i} className={styles.word}>
            {word}
          </span>
        ))}
      </h2>
      <div className={styles.underline} />
      <p className={styles.poetic}>{closure.poetic}</p>
      <CardinalLink href={nextHref} className={styles.cta} tabIndex={-1}>
        {closure.nextLabel}
        <span className={styles.arrow} aria-hidden>
          {closure.nextKey ? "→" : "↺"}
        </span>
      </CardinalLink>
    </div>
  );
}
