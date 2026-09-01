"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

/**
 * Mode "recit accessible", opt-in (29/08 chantier a11y). Signature
 * "l'accessibilite comme UX a part entiere" : un mode calme, lisible,
 * sans surcharge visuelle ni animation, active depuis un bouton
 * header. Utile pour :
 *  - utilisateurs troubles vestibulaires qui n'ont pas active
 *    prefers-reduced-motion systeme (setting global trop large)
 *  - utilisateurs cognitivement fatigues (fin de journee, migraine)
 *  - utilisateurs SR qui veulent une lecture propre sans layer 3D
 *  - lecture longue (memoire, codex) sans distraction ambiante
 *
 * Le mode :
 *  - Cache le canvas WebGL (PersistentScene return null)
 *  - Force reduced-motion pour tous les FadingBlock / RevealText
 *  - Retire curseurs custom, trails, tilt, mask reveal, ripples
 *  - Fond noir opaque (plus de blur transparent)
 *  - Contenu centre max-width lisible
 *
 * Persist localStorage (nahual-reading-mode). Default = off.
 */

const STORAGE_KEY = "nahual-reading-mode";
const BODY_CLASS = "reading-mode";

type ReadingModeApi = {
  active: boolean;
  toggle: () => void;
};

const ReadingModeContext = createContext<ReadingModeApi | null>(null);

export function ReadingModeProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);

  // Hydrate depuis localStorage au mount (SSR-safe : default false, sync
  // apres l'hydratation, un flash tres bref possible mais accepte :
  // mieux qu'une mismatch React).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved === "1") setActive(true);
    } catch {}
  }, []);

  // Sync body class + localStorage a chaque changement.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle(BODY_CLASS, active);
    try {
      window.localStorage.setItem(STORAGE_KEY, active ? "1" : "0");
    } catch {}
  }, [active]);

  const toggle = useCallback(() => setActive((v) => !v), []);

  return (
    <ReadingModeContext.Provider value={{ active, toggle }}>
      {children}
    </ReadingModeContext.Provider>
  );
}

export function useReadingMode(): ReadingModeApi {
  const ctx = useContext(ReadingModeContext);
  if (!ctx) {
    // Fallback safe si consomme hors provider (ex : test unit sans
    // wrapper). Retourne un no-op plutot que throw pour ne pas casser
    // le rendu.
    return { active: false, toggle: () => {} };
  }
  return ctx;
}
