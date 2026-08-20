"use client";

import { useEffect, useRef, type MutableRefObject, type ReactNode } from "react";
import styles from "./scene-text-overlay.module.css";

/**
 * Superposition HTML au-dessus du canvas (même principe que LoadingVeil) —
 * habille les deux vrais textes du site (hero/à-propos, déjà dans les
 * dictionnaires i18n) directement sur la scène plutôt que de les cacher
 * derrière un scroll complet. Retour de Sylvain le 19/08 : "si rien
 * n'invite au scroll, l'utilisateur va-t-il forcément y penser ?" — le
 * hero (align="start") est donc visible DÈS le chargement, pas révélé.
 *
 * `getOpacity` : fonction pure du scroll (cf reveal-arc.ts) — ce composant
 * ne fait qu'interroger `progressRef.current` à chaque frame (requestAnimationFrame,
 * pas un listener 'scroll' séparé : évite tout risque d'ordre d'exécution
 * entre plusieurs listeners qui liraient une valeur pas encore à jour pour
 * le même événement).
 *
 * `prefers-reduced-motion` (garde-fou du Codex Nahual : "l'Accueil doit
 * porter l'essentiel du pitch par lui-même [...] sans jamais déclencher ni
 * voir cet arc") : reste pleinement visible, jamais gelé à l'opacité du
 * scroll figé à 0 — sinon un visiteur en reduced-motion ne verrait jamais
 * le contenu révélé en fin d'arc (à-propos, lien GitHub, CTA contact).
 * `align="start"`/`align="end"` place hero et à-propos aux deux extrémités
 * verticales de l'écran (pas l'un sur l'autre) précisément pour que les
 * deux puissent coexister sans collision dans ce cas.
 */
export default function SceneTextOverlay({
  progressRef,
  reducedMotionRef,
  getOpacity,
  align,
  children,
}: {
  progressRef: MutableRefObject<number>;
  reducedMotionRef: MutableRefObject<boolean>;
  getOpacity: (progress: number) => number;
  align: "start" | "end";
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf: number;
    function tick() {
      const opacity = reducedMotionRef.current ? 1 : getOpacity(progressRef.current);
      const el = rootRef.current;
      if (el) {
        el.style.opacity = String(opacity);
        el.style.pointerEvents = opacity > 0.05 ? "auto" : "none";
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progressRef, reducedMotionRef, getOpacity]);

  return (
    <div ref={rootRef} className={`${styles.overlay} ${styles[align]}`}>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
