"use client";

import { useEffect } from "react";

/**
 * Mask reveal curseur (28/08 boite outil #4). Sur hover d'un
 * .projectCase (ou .serviceCard), un radial gradient direction
 * suit le curseur → révèle une teinte lumineuse cardinale sous
 * le contenu. Signature "regarde derrière le voile".
 *
 * Implémentation : listener pointermove global, calcule position
 * relative au rect de la card hovered, pose --mx --my CSS vars
 * (0-100%) sur l'element hovered. Le ::after CSS lit ces vars pour
 * positionner un radial-gradient.
 */

const SELECTOR = ".projectCase, .serviceCard";

export default function MaskReveal() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let currentCard: HTMLElement | null = null;

    function onMove(e: PointerEvent) {
      if (!currentCard) return;
      const rect = currentCard.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * 100;
      const my = ((e.clientY - rect.top) / rect.height) * 100;
      currentCard.style.setProperty("--mx", `${mx}%`);
      currentCard.style.setProperty("--my", `${my}%`);
    }

    function onOver(e: PointerEvent) {
      const target = e.target as HTMLElement | null;
      const card = target?.closest?.(SELECTOR) as HTMLElement | null;
      if (!card || card === currentCard) return;
      currentCard = card;
      currentCard.setAttribute("data-mask-reveal", "true");
    }

    function onOut(e: PointerEvent) {
      if (!currentCard) return;
      const related = e.relatedTarget as HTMLElement | null;
      if (related?.closest?.(SELECTOR) === currentCard) return;
      currentCard.removeAttribute("data-mask-reveal");
      currentCard = null;
    }

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("pointerout", onOut, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);
      if (currentCard) {
        currentCard.removeAttribute("data-mask-reveal");
        currentCard.style.removeProperty("--mx");
        currentCard.style.removeProperty("--my");
      }
    };
  }, []);

  return null;
}
