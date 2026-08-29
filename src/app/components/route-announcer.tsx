"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { renderWithNahuatl } from "@/lib/nahuatl";

/**
 * Annonce SR des changements de page (SPA) — WCAG 4.1.3 status
 * messages + RGAA 12.1. Next.js App Router ne fait pas d'annonce
 * automatique comme le faisait le RouteAnnouncer du Pages Router.
 *
 * Comportement : au changement de pathname, attend 250ms que le
 * nouveau <main> soit peint, recupere le premier <h1> et le pousse
 * dans une region aria-live="polite" sr-only. NVDA/JAWS/VoiceOver
 * annoncent le titre a haute voix ("Services", "Teyolia · Memoire"),
 * signal clair a l'utilisateur SR qu'il a change de page sans avoir
 * a reparcourir la structure.
 *
 * Ne deplace pas le focus : moins invasif, laisse l'utilisateur
 * clavier maitre de sa position. Si un besoin de focus arrive plus
 * tard (feedback utilisateur), ajouter ici.
 *
 * Skip le premier mount (initial load) : le titre est deja dans le
 * document, l'utilisateur SR le lit naturellement au chargement.
 */
export default function RouteAnnouncer() {
  const pathname = usePathname();
  const [message, setMessage] = useState("");
  const skipFirstRef = useRef(true);

  useEffect(() => {
    if (skipFirstRef.current) {
      skipFirstRef.current = false;
      return;
    }
    // 250ms : compromis entre la fin du commit React + le mount
    // du <main> nouveau. Trop court = h1 pas encore la ; trop long
    // = utilisateur a le temps de commencer a parcourir avant
    // l'annonce.
    const timer = window.setTimeout(() => {
      const h1 = document.querySelector<HTMLElement>("main h1");
      if (!h1) return;
      const title = h1.textContent?.trim() || document.title;
      // Toujours reset a vide avant, sinon setState avec la meme
      // valeur ne re-declenche pas l'aria-live (ex : nav back a
      // une page deja visitee dont le titre est identique).
      setMessage("");
      window.setTimeout(() => setMessage(title), 50);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {message ? renderWithNahuatl(message) : ""}
    </div>
  );
}
