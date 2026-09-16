"use client";

import { useEffect } from "react";
import { THEME_STORAGE_KEY, faceInitiale } from "@/lib/theme";
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
    // 16/09 : la meme regle qu'ailleurs (lib/theme.faceInitiale), pas une
    // face choisie d'avance. Une page d'erreur n'est pas un endroit ou
    // imposer une face que le visiteur n'a pas demandee.
    let stocke: string | null = null;
    try {
      stocke = window.localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      stocke = null;
    }
    applyTheme(faceInitiale(stocke, window.matchMedia("(prefers-color-scheme: dark)").matches));
    const root = document.documentElement;
    root.setAttribute("data-loaded", "true");
    root.setAttribute("data-foyer", "done");
    document.querySelector("[data-veil]")?.setAttribute("data-reveal-done", "true");
  }, []);
  return null;
}
