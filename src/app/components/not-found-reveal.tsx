"use client";

import { useEffect } from "react";
import { THEME_STORAGE_KEY, parseStoredTheme } from "@/lib/theme";
import { applyTheme } from "./theme-store";

/**
 * LA 404 SORT DU VOILE (13/09, T4 du miroir). Next rend la page introuvable
 * dans sa coquille d'erreur (`<html id="__next_error__">`) : les scripts
 * en ligne du layout (face du monde, foyer allume) arrivent par le flux
 * React et ne s'executent donc jamais, et aucune scene ne pose
 * `data-loaded`. Resultat, verifie a la capture : la 404 restait sous le
 * voile de chargement, en noir, boutons « Entrer avec le son » compris.
 * Ici, au montage : la face memorisee est reposee, et les trois attributs
 * que la sequence d'arrivee aurait poses le sont d'un coup : pas de
 * ceremonie pour une page qui n'a pas de scene a reveler.
 */
export default function NotFoundReveal() {
  useEffect(() => {
    let theme: ReturnType<typeof parseStoredTheme> = null;
    try {
      theme = parseStoredTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
    } catch {
      theme = null;
    }
    applyTheme(theme ?? "dark");
    const root = document.documentElement;
    root.setAttribute("data-loaded", "true");
    root.setAttribute("data-foyer", "done");
    document.querySelector("[data-veil]")?.setAttribute("data-reveal-done", "true");
  }, []);
  return null;
}
