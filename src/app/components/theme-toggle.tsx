"use client";

import { useRef } from "react";
import { nextTheme } from "@/lib/theme";
import { jouerMiroir } from "./miroir-fumant";
import { useTheme } from "./theme-store";

/**
 * LE DISQUE D'OBSIDIENNE (13/09) : le bouton qui retourne le miroir. Un
 * disque sombre poli, un reflet qui tourne quand le monde est clair ; rien
 * d'autre (aucun glyphe, aucune figure : un miroir n'a pas d'iconographie).
 * `aria-pressed` dit la face courante ; le libelle dit ce que le geste va
 * faire. La ceremonie part du centre du disque.
 */
export type ThemeLabels = { toLight: string; toDark: string };

export default function ThemeToggle({ labels, className }: { labels: ThemeLabels; className?: string }) {
  const theme = useTheme();
  const ref = useRef<HTMLButtonElement>(null);
  const clair = theme === "light";
  const onClick = () => {
    const r = ref.current?.getBoundingClientRect();
    jouerMiroir({ x: r ? r.left + r.width / 2 : window.innerWidth / 2, y: r ? r.top + r.height / 2 : 0, to: nextTheme(theme) });
  };
  return (
    <button
      ref={ref}
      type="button"
      className={`themeToggle${className ? " " + className : ""}`}
      onClick={onClick}
      aria-pressed={clair}
      aria-label={clair ? labels.toDark : labels.toLight}
      title={clair ? labels.toDark : labels.toLight}
      data-theme-toggle=""
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
        <defs>
          <radialGradient id="tezcatl-obsidienne" cx="38%" cy="32%" r="75%">
            <stop offset="0" stopColor="var(--tezcatl-hi)" />
            <stop offset="0.55" stopColor="var(--tezcatl-mid)" />
            <stop offset="1" stopColor="var(--tezcatl-lo)" />
          </radialGradient>
        </defs>
        <circle cx="12" cy="12" r="10" fill="url(#tezcatl-obsidienne)" stroke="var(--tezcatl-bord)" strokeWidth="1" />
        <path className="themeToggleReflet" d="M7.5 9.2c1.8-2.6 5.4-3.4 8.1-1.9" fill="none" stroke="var(--tezcatl-reflet)" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    </button>
  );
}
