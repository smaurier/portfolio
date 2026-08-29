"use client";

import { useEffect } from "react";

/**
 * XolotlCodexReader (29/08). Monté dans CodexPage. Au mount, si
 * l'utilisateur a vu Xolotl passer (localStorage witnessed=1), marque
 * le codex comme lu (codex-read=1) + dispatch un custom event pour
 * que XolotlWitnessMessage disparaisse instantanément (sans reload).
 *
 * L'idée : visiter le codex = découvrir la section Xolotl = le message
 * a rempli sa fonction, disparaît.
 */
export default function XolotlCodexReader() {
  useEffect(() => {
    try {
      if (localStorage.getItem("nahual-xolotl-witnessed") === "1") {
        localStorage.setItem("nahual-xolotl-codex-read", "1");
        document.body.classList.add("xolotl-codex-read");
        window.dispatchEvent(new CustomEvent("nahual-xolotl-state"));
      }
    } catch {}
  }, []);
  return null;
}
