"use client";

import { useSyncExternalStore } from "react";
import { THEME_COLOR, THEME_EVENT, THEME_STORAGE_KEY, faceInitiale, parseStoredTheme, type Theme } from "@/lib/theme";

/**
 * La face courante du monde, partagee par l'interface et la scene (13/09).
 * Une seule ecriture : `applyTheme`, qui pose l'attribut sur <html>, la
 * couleur du chrome mobile, la memoire, et previent tout le monde. Le
 * script inline du layout a deja pose l'attribut avant le premier paint ;
 * ce module ne fait que le lire au depart.
 */
type Listener = () => void;
const listeners = new Set<Listener>();

/**
 * 16/09 : plus de nuit en dur ici non plus. L'attribut est normalement
 * deja pose par le script du layout ; s'il manque (script en echec), on
 * retombe sur la meme regle que lui plutot que sur une face choisie
 * d'avance. Les deux faces sont egales, voir lib/theme.
 */
function readDocumentTheme(): Theme {
  if (typeof document === "undefined") return faceSansDocument();
  const pose = parseStoredTheme(document.documentElement.getAttribute("data-theme"));
  if (pose) return pose;
  return faceInitiale(null, prefereLaNuit());
}

function prefereLaNuit(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Rendu serveur : personne ne peut connaitre la preference du visiteur
 * avant qu'il ait recu la page. Ce n'est donc pas un defaut de design,
 * c'est un pis-aller de quelques millisecondes : le script du layout pose
 * la vraie face avant le premier paint, et le depot la relit a
 * l'hydratation. On prend la face claire, celle du silence.
 */
function faceSansDocument(): Theme {
  return "light";
}

export function getTheme(): Theme {
  return readDocumentTheme();
}

export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "light") root.setAttribute("data-theme", "light");
  else root.setAttribute("data-theme", "dark");
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = THEME_COLOR[theme];
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Stockage refuse : la face ne survivra pas au rechargement, c'est tout.
  }
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { theme } }));
  for (const l of listeners) l();
}

function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** La face courante, reactive. Rendu serveur : voir faceSansDocument. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, readDocumentTheme, faceSansDocument);
}
