"use client";

import { useEffect } from "react";
import type { Dictionary } from "@/dictionaries";
import styles from "./compass-overlay.module.css";

/**
 * Compass expand overlay (28/08 boite outil C). Modal fullscreen
 * qui detaille les 5 directions cardinales du Codex Nahual. Reuse
 * dict.codex.cosmos.directions (nom nahuatl + description mytho).
 * Disposition croix cardinale grille 3x3.
 *
 * Ferme au click backdrop, touche Escape, ou bouton X.
 */

const DIR_COLORS: Record<string, string> = {
  jade: "#00c078",
  dore: "#ffb400",
  turquoise: "#0f6bb8",
  cendre: "#d76464",
  obsidienne: "#6b3fa8",
};

const SLOT_CLASS = [styles.slotC, styles.slotE, styles.slotS, styles.slotW, styles.slotN];
const SLOT_COLOR: (keyof typeof DIR_COLORS)[] = ["jade", "dore", "turquoise", "cendre", "obsidienne"];

export default function CompassOverlay({
  cosmos,
  closeLabel,
  onClose,
}: {
  cosmos: Dictionary["codex"]["cosmos"];
  closeLabel: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={cosmos.title}
    >
      <button type="button" className={styles.close} onClick={onClose} aria-label={closeLabel}>
        ✕
      </button>
      <div className={styles.grid}>
        {cosmos.directions.map((d, i) => (
          <article
            key={i}
            className={`${styles.direction} ${SLOT_CLASS[i] ?? ""}`}
            style={{ ["--dir-color" as string]: DIR_COLORS[SLOT_COLOR[i]] ?? DIR_COLORS.jade }}
          >
            <span className={styles.dot} aria-hidden="true" />
            <h3 className={styles.name}>{d.name}</h3>
            <p className={styles.text}>{d.text}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
