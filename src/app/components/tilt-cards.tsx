"use client";

import { useEffect } from "react";

/**
 * Hover tilt 3D micro-interaction (28/08 task #65). Signature Awwwards
 * classique. Sur hover d'un element avec class ".projectCase" ou
 * ".serviceCard", calcul mouse position relative center → rotateX/Y
 * perspective tilt subtil (~6°). Reset au leave.
 *
 * Delegue les listeners sur document via pointerover/pointerout →
 * pas d'attachement par element, se declenche automatiquement pour
 * chaque card ajoutee au DOM. Respect reducedMotion.
 */

const TILT_MAX = 6; // degres max
const SELECTOR = ".projectCase, .serviceCard";

export default function TiltCards() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let currentCard: HTMLElement | null = null;

    function onMove(e: PointerEvent) {
      if (!currentCard) return;
      const rect = currentCard.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2); // -1..1
      const dy = (e.clientY - cy) / (rect.height / 2);
      const rx = -dy * TILT_MAX;
      const ry = dx * TILT_MAX;
      currentCard.style.transform = `perspective(1000px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
    }

    function onPointerOver(e: PointerEvent) {
      const target = e.target as HTMLElement | null;
      const card = target?.closest?.(SELECTOR) as HTMLElement | null;
      if (!card || card === currentCard) return;
      // Reset previous
      if (currentCard) currentCard.style.transform = "";
      currentCard = card;
      currentCard.style.transition = "transform 0.15s ease-out";
      currentCard.style.willChange = "transform";
    }

    function onPointerOut(e: PointerEvent) {
      if (!currentCard) return;
      // Sortie hors de la card entiere (pas juste transition entre enfants)
      const related = e.relatedTarget as HTMLElement | null;
      if (related?.closest?.(SELECTOR) === currentCard) return;
      currentCard.style.transform = "";
      currentCard.style.transition = "transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)";
      currentCard = null;
    }

    document.addEventListener("pointerover", onPointerOver, { passive: true });
    document.addEventListener("pointerout", onPointerOut, { passive: true });
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("pointerout", onPointerOut);
      document.removeEventListener("pointermove", onMove);
      if (currentCard) currentCard.style.transform = "";
    };
  }, []);

  return null;
}
