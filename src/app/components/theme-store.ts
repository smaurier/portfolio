"use client";

import { useSyncExternalStore } from "react";
import { THEME_COLOR, THEME_EVENT, THEME_STORAGE_KEY, parseStoredTheme, type Theme } from "@/lib/theme";

/**
 * La face courante du monde, partagee par l'interface et la scene (13/09).
 * Une seule ecriture : `applyTheme`, qui pose l'attribut sur <html>, la
 * couleur du chrome mobile, la memoire, et previent tout le monde. Le
 * script inline du layout a deja pose l'attribut avant le premier paint ;
 * ce module ne fait que le lire au depart.
 */
type Listener = () => void;
const listeners = new Set<Listener>();

function readDocumentTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return parseStoredTheme(document.documentElement.getAttribute("data-theme")) ?? "dark";
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

/** La face courante, reactive. Rendu serveur : la nuit. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, readDocumentTheme, () => "dark");
}
