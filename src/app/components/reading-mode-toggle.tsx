"use client";

import { useReadingMode } from "@/lib/reading-mode-context";
import styles from "./reading-mode-toggle.module.css";

/**
 * Bouton opt-in mode recit accessible (29/08 chantier a11y).
 * Coin bas gauche, symetrique du bouton son. Icone livre ouvert.
 * aria-pressed reflete l'etat. Persist via ReadingModeProvider.
 */
export default function ReadingModeToggle({
  label,
}: {
  label: { on: string; off: string };
}) {
  const { active, toggle } = useReadingMode();
  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={toggle}
      aria-pressed={active}
      aria-label={active ? label.off : label.on}
      title={active ? label.off : label.on}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {/* Book open icon */}
        <path
          d="M4 4h6a3 3 0 0 1 3 3v13a3 3 0 0 0-3-3H4V4zm16 0h-6a3 3 0 0 0-3 3v13a3 3 0 0 1 3-3h6V4z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
