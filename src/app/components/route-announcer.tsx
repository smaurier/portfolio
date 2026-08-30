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
 * DEPLACE le focus vers le h1 de la nouvelle page (30/08 retour RGAA :
 * "SPA React : oublier de repositionner le focus au changement de
 * page = non conforme recurrent"). L'annonce aria-live seule ne
 * suffit pas — sans repositionnement du focus, l'utilisateur
 * clavier/SR reste sur l'element de nav qu'il vient de cliquer, doit
 * re-tabuler dans tout le header avant d'atteindre le nouveau contenu.
 * Reproduit le comportement "premier chargement" (SR annonce le
 * titre directement). Recommandation Access42 pour la conformite
 * RGAA 12.8 sur les SPA : "conteneur avec tabindex='-1' qui reprend
 * le titre de la page". Fallback sur <main> si le h1 n'existe pas
 * (edge case, ex : page 404).
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
      const main = document.getElementById("main");
      const h1 = main?.querySelector<HTMLElement>("h1");
      const title = h1?.textContent?.trim() || document.title;
      // Toujours reset a vide avant, sinon setState avec la meme
      // valeur ne re-declenche pas l'aria-live (ex : nav back a
      // une page deja visitee dont le titre est identique).
      setMessage("");
      window.setTimeout(() => setMessage(title), 50);
      // Deplace le focus vers le h1 de la nouvelle page — reproduit
      // le comportement "premier chargement" (focus en haut de page,
      // SR annonce le titre directement). Recommandation Access42
      // pour RGAA 12.8 SPA : "conteneur avec tabindex='-1' qui
      // reprend le titre de la page". tabindex ajoute
      // dynamiquement ici pour rendre le h1 focusable
      // programmatiquement sans polluer l'ordre de Tab clavier.
      // Fallback sur <main> si pas de h1 (edge case).
      const focusTarget = h1 ?? main;
      if (focusTarget) {
        focusTarget.setAttribute("tabindex", "-1");
        focusTarget.focus({ preventScroll: false });
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {message ? renderWithNahuatl(message) : ""}
    </div>
  );
}
