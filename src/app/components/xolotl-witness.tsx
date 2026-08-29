"use client";

import { useEffect, useRef, useState } from "react";
import { getPath } from "@/lib/routes";
import type { Locale } from "@/dictionaries";

/**
 * XolotlWitnessMessage (29/08). Message discret entre les footer cols
 * et le copyright, visible SEULEMENT pendant que Xolotl est en train
 * de passer (traverse active) + 30s post-fin (delai grace pour laisser
 * user cliquer). Ephemere, pas persistant.
 *
 * Retour Sylvain 29/08 iter 2 : \"la phrase du codex apparait tout le
 * temps... alors qu'elle devrait n'etre la que si le chien apparait\".
 * Ancien pattern flag permanent (localStorage witnessed && !codexRead)
 * remplace par ecoute event 'nahual-xolotl-appearing' publie par
 * XolotlCompanion au start/end de la traverse.
 *
 * Comportement :
 *  - Chien commence traverse -> event visible=true -> message ON
 *  - Chien fin traverse -> event visible=false -> timer 30s -> OFF
 *  - Si user visite codex pendant fenetre -> message OFF instant
 *  - Nouvelle traverse ulterieure -> message re-ON
 */
const GRACE_MS_AFTER_HIDDEN = 30_000;

export default function XolotlWitnessMessage({
  message,
  locale,
}: {
  message: string;
  locale: Locale;
}) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    function onAppearing(e: Event) {
      const detail = (e as CustomEvent<{ visible: boolean }>).detail;
      if (detail?.visible) {
        // Traverse commence : montre message, clear tout timer decay
        if (timerRef.current !== null) {
          window.clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        // Ne pas montrer si user a deja visite codex pour ce cycle
        try {
          if (localStorage.getItem("nahual-xolotl-codex-read") === "1") return;
        } catch {}
        setVisible(true);
      } else {
        // Traverse finie : timer grace 30s puis hide
        if (timerRef.current !== null) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => {
          setVisible(false);
          timerRef.current = null;
        }, GRACE_MS_AFTER_HIDDEN);
      }
    }
    function onStateChange() {
      // Codex visite : sync body classes + hide message si active
      try {
        if (localStorage.getItem("nahual-xolotl-codex-read") === "1") {
          setVisible(false);
          if (timerRef.current !== null) {
            window.clearTimeout(timerRef.current);
            timerRef.current = null;
          }
          document.body.classList.add("xolotl-codex-read");
        }
        if (localStorage.getItem("nahual-xolotl-witnessed") === "1") {
          document.body.classList.add("xolotl-witnessed");
        }
      } catch {}
    }
    // Sync body classes au mount (pour CSS easter egg codex highlight
    // qui utilise body.xolotl-witnessed:not(.xolotl-codex-read))
    onStateChange();
    window.addEventListener("nahual-xolotl-appearing", onAppearing);
    window.addEventListener("nahual-xolotl-state", onStateChange);
    window.addEventListener("storage", onStateChange);
    return () => {
      window.removeEventListener("nahual-xolotl-appearing", onAppearing);
      window.removeEventListener("nahual-xolotl-state", onStateChange);
      window.removeEventListener("storage", onStateChange);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
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
