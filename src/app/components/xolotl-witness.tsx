"use client";

import { useEffect, useState } from "react";
import { getPath } from "@/lib/routes";
import type { Locale } from "@/dictionaries";

/**
 * XolotlWitnessMessage (29/08). Message discret sous le footer bottom
 * si l'utilisateur a vu Xolotl passer au moins une fois ET n'a pas
 * encore visité le Codex depuis. Invite implicite à découvrir la
 * section Xolotl du Codex.
 *
 * Signal easter egg propre : ne surgit pas d'ailleurs, n'utilise pas
 * de notification agressive. Juste un lien italique de couleur
 * discret dans le pied de page — la découverte reste optionnelle.
 *
 * Trois localStorage keys pilotent :
 *  - nahual-xolotl-witnessed = "1" au premier passage complet
 *  - nahual-xolotl-codex-read = "1" après visite Codex post-témoignage
 *  - (state dérivé : message visible si witnessed && !codex-read)
 */
export default function XolotlWitnessMessage({
  message,
  locale,
}: {
  message: string;
  locale: Locale;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function refresh() {
      try {
        const witnessed = localStorage.getItem("nahual-xolotl-witnessed") === "1";
        const codexRead = localStorage.getItem("nahual-xolotl-codex-read") === "1";
        // Sync body classes (persist entre reloads pour CSS easter egg)
        document.body.classList.toggle("xolotl-witnessed", witnessed);
        document.body.classList.toggle("xolotl-codex-read", codexRead);
        setVisible(witnessed && !codexRead);
      } catch {
        setVisible(false);
      }
    }
    refresh();
    // Ecoute changements cross-tab + intra-tab (custom event dispatched
    // par XolotlCodexReader au mount codex ou XolotlCompanion au
    // premier passage complet).
    window.addEventListener("storage", refresh);
    window.addEventListener("nahual-xolotl-state", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("nahual-xolotl-state", refresh);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="xolotlWitnessMessage">
      <a href={getPath(locale, "codex")} className="footerLink">
        {message}
      </a>
    </div>
  );
}
