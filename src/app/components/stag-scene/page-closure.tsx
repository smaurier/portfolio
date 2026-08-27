"use client";

import Link from "next/link";
import type { MutableRefObject } from "react";
import { getNavEmphasis } from "@/lib/reveal-arc";
import { getPath, type PageKey } from "@/lib/routes";
import type { Locale } from "../../../dictionaries";
import type { DirectionKey } from "./direction-colors";
import FadingBlock from "./fading-block";
import overlayStyles from "./scene-text-overlay.module.css";

/**
 * Bloc de closure narratif au climax des pages écho (27/08, audit
 * top-tier post-Phase 4, cf memory project-nahual-da). Reprend le
 * pattern home (about section qui fade IN via getNavEmphasis) sur les
 * pages écho — Sylvain constat "Awwwards-level : chaque page a une
 * closure claire, pas de contentPage qui disparaît sous le fold sans
 * signal narratif de fin".
 *
 * Contenu par direction (Codex Nahual section 03, cf memory) :
 * cardinal nahuatl + baseline poétique + CTA vers la direction
 * suivante dans le cycle Centre → Est → Sud → Ouest → Nord → Centre.
 * Le Nord (obsidienne / Mictlampa) renvoie au Centre (Accueil) —
 * clôture le cycle du calendrier sacré.
 *
 * Fade IN au moment "chemins révélés" (getNavEmphasis, 0.75→1.0) :
 * exactement le même timing que la nav emphasis et le about home,
 * garantit qu'aucun bloc n'apparaît pendant la lecture du contenu
 * texte scrollé.
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
    nextLabel: "Est · Doré →",
  },
  dore: {
    cardinal: "Est · Tlahuizcalpan",
    poetic: "L'aube dorée — Tonatiuh se lève, la journée s'ouvre.",
    nextKey: "projets",
    nextLabel: "Sud · Turquoise →",
  },
  turquoise: {
    cardinal: "Sud · Huitztlampa",
    poetic: "Xochitl, la fleur — Huitzilopochtli veille sur ce qui pousse.",
    nextKey: "contact",
    nextLabel: "Ouest · Cendre →",
  },
  cendre: {
    cardinal: "Ouest · Cihuatlampa",
    poetic: "Le crépuscule mauve — Cihuateteo raccompagnent le soleil.",
    nextKey: "memoire",
    nextLabel: "Nord · Obsidienne →",
  },
  obsidienne: {
    cardinal: "Nord · Mictlampa",
    poetic: "Le lieu du repos — Mictlán reçoit ce qui a été vécu.",
    // Renvoie au Centre : ferme le cycle du calendrier sacré.
    nextKey: null,
    nextLabel: "Retour au Centre ↺",
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
  const closure = CLOSURES[directionKey];
  const nextHref = closure.nextKey ? getPath(locale, closure.nextKey) : `/${locale}`;

  return (
    <FadingBlock
      progressRef={progressRef}
      reducedMotionRef={reducedMotionRef}
      getOpacity={getNavEmphasis}
      initialOpacity={0}
    >
      <h2>{closure.cardinal}</h2>
      <p>{closure.poetic}</p>
      <div className={overlayStyles.links}>
        <Link href={nextHref} className={overlayStyles.cta}>
          {closure.nextLabel}
        </Link>
      </div>
    </FadingBlock>
  );
}
