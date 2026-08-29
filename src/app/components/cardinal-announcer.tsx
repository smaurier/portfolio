"use client";

import { useEffect, useRef, useState } from "react";
import type { Dictionary } from "@/dictionaries";
import { renderWithNahuatl } from "@/lib/nahuatl";
import { useCurrentDirection } from "./stag-scene/use-current-direction";
import type { DirectionKey } from "./stag-scene/direction-colors";

/**
 * Live region cardinale (29/08 chantier a11y "SR enrichi"). Complete
 * le RouteAnnouncer generique (qui annonce le titre de la page) avec
 * une couche narrative-mytho : a chaque changement de direction
 * cardinale, annonce le nom nahuatl du gardien + son role symbolique.
 *
 * "Vous vous dirigez vers l'Est. Tonatiuh, le soleil levant, eclaire
 * la voie."
 *
 * NVDA/JAWS/VoiceOver lisent les 2 regions aria-live en sequence
 * (queue polite) : titre court d'abord ("Services"), puis annonce
 * riche cardinale. L'utilisateur SR recoit le meme dispositif
 * immersif que l'utilisateur voyant recoit via les couleurs +
 * View Transitions.
 *
 * Skip le premier mount (l'utilisateur au chargement lit deja la
 * scene description sr-only complete via <main>).
 */
export default function CardinalAnnouncer({
  dict,
}: {
  dict: Dictionary["common"]["cardinalAnnouncement"];
}) {
  const direction = useCurrentDirection();
  const [message, setMessage] = useState("");
  const previousDirRef = useRef<DirectionKey | null>(null);
  const skipFirstRef = useRef(true);

  useEffect(() => {
    if (skipFirstRef.current) {
      skipFirstRef.current = false;
      previousDirRef.current = direction;
      return;
    }
    // Ne re-annonce que si la direction CHANGE reellement (evite
    // un re-annonce sur nav vers meme cardinale — ex : sub-pages
    // legales toutes jade).
    if (previousDirRef.current === direction) return;
    previousDirRef.current = direction;

    const timer = window.setTimeout(() => {
      // Meme pattern reset-puis-set que RouteAnnouncer : garantit
      // que aria-live re-declenche meme si le message est identique.
      setMessage("");
      window.setTimeout(() => setMessage(dict[direction]), 50);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [direction, dict]);

  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {message ? renderWithNahuatl(message) : ""}
    </div>
  );
}
