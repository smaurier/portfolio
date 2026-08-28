"use client";

import { createElement, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import styles from "./reveal-text.module.css";

/**
 * Composant révélation de texte par mot (28/08 task #48). Split le
 * texte par word, chaque word fade+translateY à l'entrée dans le
 * viewport avec un delay décalé progressif.
 *
 * Convention : reçoit un `text` string OU children string. Un split
 * par word (pas char, moins de nodes DOM, plus performant, cohérent
 * avec la lecture naturelle). Delay 40ms par word par défaut.
 *
 * IntersectionObserver seuil 0.2 : révèle quand ~20% du bloc est
 * visible. threshold ratio = léger biais pour paragraphes longs qui
 * n'entreraient jamais entièrement.
 *
 * Respect reducedMotion : CSS media query dans le module écrase
 * l'anim, spans visibles instantanément sans translate.
 */

const DEFAULT_DELAY_PER_WORD_MS = 40;

export default function RevealText({
  text,
  as = "span",
  className,
  delayPerWord = DEFAULT_DELAY_PER_WORD_MS,
  startDelay = 0,
}: {
  text: string;
  as?: "span" | "p" | "h1" | "h2" | "h3" | "h4" | "div";
  className?: string;
  delayPerWord?: number;
  startDelay?: number;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [revealed, setRevealed] = useState(false);

  const words = useMemo(() => text.split(/(\s+)/), [text]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (revealed) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true);
            obs.disconnect();
            return;
          }
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -10% 0px" }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [revealed]);

  const children = words.map((word, i) => {
    if (/^\s+$/.test(word)) return <span key={i}>{word}</span>;
    const delay = startDelay + i * (delayPerWord / 2);
    return (
      <span key={i} className={styles.word}>
        <span
          className={styles.inner}
          style={{ ["--reveal-delay" as string]: `${delay}ms` }}
        >
          {word}
        </span>
      </span>
    );
  });

  return createElement(
    as,
    {
      ref,
      className: `${styles.wrap} ${revealed ? styles.revealed : ""} ${className ?? ""}`.trim(),
    },
    ...children
  );
}

/**
 * Variante qui reçoit des children ReactNode (utile pour wrap
 * inline sans changer la structure — mais split moins précis, on ne
 * traite que les text nodes de premier niveau).
 */
export function RevealChildren({ children }: { children: ReactNode }) {
  if (typeof children === "string") {
    return <RevealText text={children} />;
  }
  return <>{children}</>;
}
