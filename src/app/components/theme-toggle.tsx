"use client";

import { useEffect, useRef, useState } from "react";
import { THEME_STORAGE_KEY, nextTheme } from "@/lib/theme";
import { jouerMiroir } from "./miroir-fumant";
import { useTheme } from "./theme-store";

/**
 * LE DISQUE D'OBSIDIENNE (13/09) : le bouton qui retourne le miroir. Un
 * disque sombre poli, un reflet qui tourne quand le monde est clair ; rien
 * d'autre (aucun glyphe, aucune figure : un miroir n'a pas d'iconographie).
 * `aria-pressed` dit la face courante ; le libelle dit ce que le geste va
 * faire. La ceremonie part du centre du disque.
 *
 * L'ECLAT (13/09, apres la mesure de la visite type, docs/da/
 * profondeur-des-mecaniques) : la sonde a montre que le miroir, mecanique
 * la plus riche du site, ne se joue JAMAIS devant un visiteur normal :
 * rien ne designe le disque. Une fois, quand le monde vient de se poser,
 * la lumiere court sur le bord du disque : un miroir d'obsidienne poli
 * capte la lumiere, c'est son geste propre. Une seule fois par session, et
 * seulement pour qui n'a jamais retourne le miroir : celui qui connait le
 * bouton n'a pas besoin qu'on le lui montre. Rien sous mouvement reduit.
 */
const ECLAT_VU = "nahual-miroir-eclat";
export type ThemeLabels = { toLight: string; toDark: string };

export default function ThemeToggle({ labels, className }: { labels: ThemeLabels; className?: string }) {
  const theme = useTheme();
  const ref = useRef<HTMLButtonElement>(null);
  const clair = theme === "light";
  const [eclat, setEclat] = useState(false);
  // Un seul disque joue l'eclat : celui du bandeau, pas son double du menu
  // mobile (il est dans un menu ferme, la lumiere y serait perdue).
  const principal = !className;
  useEffect(() => {
    if (!principal) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    try {
      // Deja vu cette session, ou visiteur qui a deja choisi sa face : rien.
      if (sessionStorage.getItem(ECLAT_VU)) return;
      if (localStorage.getItem(THEME_STORAGE_KEY)) return;
    } catch {
      // stockage refuse : on joue quand meme, une fois, ce n'est pas grave
    }
    let fin = 0;
    const jouer = () => {
      try {
        sessionStorage.setItem(ECLAT_VU, "1");
      } catch {
        // rien a memoriser : au pire l'eclat rejouera a la page suivante
      }
      setEclat(true);
      fin = window.setTimeout(() => setEclat(false), 3200);
    };
    // Quand le monde s'est pose : la fin de l'arrivee, puis un temps.
    const pret = () => document.documentElement.getAttribute("data-foyer") === "done";
    let attente = 0;
    if (pret()) attente = window.setTimeout(jouer, 1800);
    else {
      const obs = new MutationObserver(() => {
        if (!pret()) return;
        obs.disconnect();
        attente = window.setTimeout(jouer, 1800);
      });
      obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-foyer"] });
      return () => {
        obs.disconnect();
        window.clearTimeout(attente);
        window.clearTimeout(fin);
      };
    }
    return () => {
      window.clearTimeout(attente);
      window.clearTimeout(fin);
    };
  }, [principal]);
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
      data-eclat={eclat ? "" : undefined}
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
        {/* L'eclat : une courte lumiere qui court sur le bord poli. */}
        <circle className="themeToggleEclat" cx="12" cy="12" r="10" fill="none" stroke="var(--tezcatl-eclat)" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="7 56" />
        <path className="themeToggleReflet" d="M7.5 9.2c1.8-2.6 5.4-3.4 8.1-1.9" fill="none" stroke="var(--tezcatl-reflet)" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    </button>
  );
}
