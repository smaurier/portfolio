"use client";

import { useEffect, useRef, type CSSProperties, type MutableRefObject } from "react";
import CardinalLink from "./cardinal-link";
import { getNavEmphasis } from "@/lib/reveal-arc";
import { getPath, type PageKey } from "@/lib/routes";
import type { Dictionary, Locale } from "../../../dictionaries";
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

/**
 * LES TEXTES SONT PARTIS DANS LES DICTIONNAIRES (09/09). Cette table etait
 * en francais SEULEMENT, alors que le composant recoit deja la locale pour
 * construire son lien : les dix pages etrangeres finissaient donc sur « Le
 * nombril du monde. D'ou partent les chemins. » ou « Retour au Centre ».
 * Mesure sur les dix URL : `lang` correct, titres traduits, mais une a deux
 * fuites de francais par page, toutes venant d'ici. Et c'est la DERNIERE
 * chose qu'un visiteur lit sur chaque page.
 *
 * Ne reste ici que la ROUTE suivante, qui n'est pas du texte. Le garde-fou
 * contre la rechute est `lib/i18n-parity.test.ts`.
 */
const NEXT_KEY: Record<DirectionKey, PageKey | null> = {
  jade: "services",
  dore: "projets",
  turquoise: "contact",
  cendre: "memoire",
  obsidienne: null,
};

export default function PageClosure({
  directionKey,
  locale,
  closure,
  progressRef,
  reducedMotionRef,
}: {
  directionKey: DirectionKey;
  locale: Locale;
  /** Le texte de cloture de cette direction, passe depuis la page serveur. */
  closure: Dictionary["closure"][DirectionKey];
  progressRef: MutableRefObject<number>;
  reducedMotionRef: MutableRefObject<boolean>;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const nextKey = NEXT_KEY[directionKey];
  const nextHref = nextKey ? getPath(locale, nextKey) : `/${locale}`;

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
          {nextKey ? "→" : "↺"}
        </span>
      </CardinalLink>
    </div>
  );
}
