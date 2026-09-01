"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { flushSync } from "react-dom";
import { pageKeys, slugs, getPath, type PageKey } from "@/lib/routes";
import type { Locale } from "@/dictionaries";
import { isShortcutsEnabled, subscribeShortcuts } from "@/lib/shortcuts";
import { useCardinalTransition, type CardinalDirection } from "./stag-scene/cardinal-transition-context";

/**
 * Navigation clavier + manette (28/08 task #58, etendu 30/08).
 *
 * TOUS les raccourcis clavier sont CARDINAUX (retour Sylvain 30/08
 * "alt+fleche c'est incoherent" : l'ancien pattern Alt+←/→ cyclait
 * dans NAV_ORDER independamment de la direction spatiale, ce qui
 * cassait la coherence "fleche gauche = ouest"). Deux mappings
 * paralleles pour la meme grille cardinale :
 *
 * 1. Alt + fleches directionnelles (respecte a11y : Alt evite de
 *    capturer les fleches SR en browse mode NVDA/JAWS).
 *      Alt+ArrowUp    = Nord    (memoire)
 *      Alt+ArrowRight = Est     (services)
 *      Alt+ArrowDown  = Sud     (projets)
 *      Alt+ArrowLeft  = Ouest   (contact)
 *
 * 2. WASD (QWERTY) / ZQSD (AZERTY) : meme grille, event.code matche
 *    la POSITION physique : meme touche quel que soit le layout.
 *      KeyW = Nord   (memoire)
 *      KeyD = Est    (services)
 *      KeyS = Sud    (projets)
 *      KeyA = Ouest  (contact)
 *      KeyC = Centre (home)
 *
 * 3. Escape : retour Home (Centre / jade) : fallback pour user
 *    habitue au pattern Escape=close/back.
 *
 * Skip si focus dans input/textarea/contenteditable (ne pas pieger la
 * frappe). Trigger transitions cardinales exactement comme
 * CardinalLink (burst 3D + View Transitions API). Feedback shake du
 * dot cardinal si deja sur la page cible (RGAA feedback).
 */

const DIRECTION_BY_KEY: Record<PageKey, CardinalDirection> = {
  services: "dore",
  projets: "turquoise",
  contact: "cendre",
  memoire: "obsidienne",
  codex: "jade",
  mentionsLegales: "jade",
  planDuSite: "jade",
  accessibilite: "jade",
  confidentialite: "jade",
  credits: "jade",
};

// Grille cardinale (retour Sylvain 30/08 "wasd doit etre relatif a
// la position actuelle sur le plan"). Chaque page = une coordonnee
// (x, y) sur la grille 3x3 :
//         Nord (0,-1)
//   Ouest (-1,0)  Centre (0,0)  Est (1,0)
//         Sud  (0,1)
// Une touche = un delta directionnel applique a la position actuelle.
// Nouveau (x',y') doit correspondre a une case habitee (Nord, Est,
// Sud, Ouest, Centre) : sinon impasse, feedback shake sur la direction
// pressee, pas de navigation.

type GridPos = [number, number];
const PAGE_TO_POS: Record<PageKey | "home", GridPos> = {
  memoire: [0, -1],   // Nord
  services: [1, 0],   // Est
  projets: [0, 1],    // Sud
  contact: [-1, 0],   // Ouest
  home: [0, 0],       // Centre
  codex: [0, 0],      // (hors grille, mappe centre en fallback)
  mentionsLegales: [0, 0],
  planDuSite: [0, 0],
  accessibilite: [0, 0],
  confidentialite: [0, 0],
  credits: [0, 0],
};
const HOME_POS: GridPos = [0, 0];

// Reverse map : position → PageKey/home. Seulement les 5 cases
// habitees de la grille cardinale.
const POS_TO_PAGE: Record<string, PageKey | "home"> = {
  "0,-1": "memoire",
  "1,0": "services",
  "0,1": "projets",
  "-1,0": "contact",
  "0,0": "home",
};

// Directions cardinales = quel delta appliquer sur la grille.
const DIRECTION_DELTAS: Record<"north" | "east" | "south" | "west" | "center", GridPos> = {
  north: [0, -1],
  east: [1, 0],
  south: [0, 1],
  west: [-1, 0],
  center: [0, 0],
};

// Mapping WASD physical → direction (delta). event.code = position
// physique de la touche, meme code quel que soit le layout keyboard
// (KeyA = A en QWERTY, Q en AZERTY, meme position → meme sens).
const WASD_TO_DIRECTION: Record<string, keyof typeof DIRECTION_DELTAS> = {
  KeyW: "north",
  KeyD: "east",
  KeyS: "south",
  KeyA: "west",
  KeyC: "center",
};

// Mapping ArrowKey → direction (utilise avec Alt modifier).
const ARROW_TO_DIRECTION: Record<string, keyof typeof DIRECTION_DELTAS> = {
  ArrowUp: "north",
  ArrowRight: "east",
  ArrowDown: "south",
  ArrowLeft: "west",
};

const DIRECTION_TO_CARDINAL: Record<keyof typeof DIRECTION_DELTAS, CardinalDirection> = {
  north: "obsidienne",
  east: "dore",
  south: "turquoise",
  west: "cendre",
  center: "jade",
};

function isLocale(v: string): v is Locale {
  return v === "fr" || v === "en" || v === "es";
}

export default function KeyboardNav() {
  const router = useRouter();
  const pathname = usePathname();
  const transition = useCardinalTransition();
  // Preference user (RGAA 12.10) : WASD peut etre desactive.
  // Alt+ArrowLeft/Right et Escape (raccourcis a modifier) ne sont pas
  // concernes par 12.10 mais on les respecte quand meme par coherence.
  const [enabled, setEnabled] = useState(true);
  useEffect(() => {
    // Lecture localStorage post-hydratation (SSR-safe, initial true).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabled(isShortcutsEnabled());
    return subscribeShortcuts(setEnabled);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    function isTypingContext(target: EventTarget | null): boolean {
      const el = target as HTMLElement | null;
      const tag = el?.tagName?.toLowerCase();
      return tag === "input" || tag === "textarea" || !!el?.isContentEditable;
    }

    function localeFromPath(): Locale {
      const match = pathname.match(/^\/([a-z]{2})/);
      const l = match?.[1];
      return l && isLocale(l) ? l : "fr";
    }

    /** Position actuelle sur la grille cardinale d'apres pathname. */
    function currentPos(): GridPos {
      const match = pathname.match(/^\/([a-z]{2})(?:\/([^/?#]+))?/);
      if (!match) return HOME_POS;
      const [, locale, slug] = match;
      if (!isLocale(locale)) return HOME_POS;
      if (!slug) return HOME_POS;
      for (const key of pageKeys) {
        if (slugs[key][locale] === slug) return PAGE_TO_POS[key];
      }
      return HOME_POS;
    }

    function navigate(href: string, direction: CardinalDirection | null) {
      if (!direction || !transition) {
        router.push(href);
        return;
      }
      transition.startTransition(direction, () => {
        document.documentElement.setAttribute("data-cardinal-nav", direction);
        type ViewTransitionDocument = Document & {
          startViewTransition?: (cb: () => void) => { finished: Promise<void> };
        };
        const doc = document as ViewTransitionDocument;
        if (typeof doc.startViewTransition === "function") {
          const vt = doc.startViewTransition(() => {
            flushSync(() => {
              router.push(href);
            });
          });
          vt.finished.finally(() => {
            document.documentElement.removeAttribute("data-cardinal-nav");
          });
        } else {
          router.push(href);
          setTimeout(() => document.documentElement.removeAttribute("data-cardinal-nav"), 500);
        }
      });
    }

    function alreadyOn(page: PageKey | "home"): boolean {
      const locale = localeFromPath();
      const targetPath = page === "home" ? `/${locale}` : getPath(locale, page);
      // Normalise les trailing slashes pour comparer.
      const current = pathname.replace(/\/$/, "");
      const target = targetPath.replace(/\/$/, "");
      return current === target;
    }

    function flashNoop(direction: CardinalDirection) {
      // Feedback visuel "touche recue mais deja sur la page cible"
      // (retour Sylvain 30/08). data-attribute temporaire sur
      // <html>, CSS anime le dot cardinal correspondant (shake +
      // pulse couleur direction). Nettoie apres l'anim.
      const root = document.documentElement;
      root.setAttribute("data-nav-nowhere", direction);
      window.setTimeout(() => {
        if (root.getAttribute("data-nav-nowhere") === direction) {
          root.removeAttribute("data-nav-nowhere");
        }
      }, 500);
    }

    function navigateToPage(page: PageKey) {
      if (alreadyOn(page)) {
        flashNoop(DIRECTION_BY_KEY[page]);
        return;
      }
      const locale = localeFromPath();
      navigate(getPath(locale, page), DIRECTION_BY_KEY[page]);
    }

    function navigateToHome() {
      if (alreadyOn("home")) {
        flashNoop("jade");
        return;
      }
      const locale = localeFromPath();
      navigate(`/${locale}`, "jade");
    }

    /**
     * Applique un delta directionnel a la position actuelle sur la
     * grille cardinale. Si le resultat correspond a une case habitee
     * (Nord/Est/Sud/Ouest/Centre) → navigate. Si impasse (coin de
     * grille non habite) → feedback shake sur la direction pressee.
     * "center" ecrase la position vers Home directement (pas un delta).
     */
    function goDirection(direction: keyof typeof DIRECTION_DELTAS) {
      const flash = DIRECTION_TO_CARDINAL[direction];
      if (direction === "center") {
        if (alreadyOn("home")) {
          flashNoop(flash);
        } else {
          navigateToHome();
        }
        return;
      }
      const [cx, cy] = currentPos();
      const [dx, dy] = DIRECTION_DELTAS[direction];
      const key = `${cx + dx},${cy + dy}`;
      const target = POS_TO_PAGE[key];
      if (!target) {
        // Impasse : la direction pressee n'a pas de case habitee
        // (ex: Nord + Est depuis Nord = coin nord-est vide).
        flashNoop(flash);
        return;
      }
      if (target === "home") {
        if (alreadyOn("home")) flashNoop("jade");
        else navigateToHome();
      } else {
        navigateToPage(target);
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (isTypingContext(e.target)) return;
      // Bail-out sur meta/ctrl : eviter tout conflit avec les
      // raccourcis navigateur (Ctrl+W, Cmd+A, etc.).
      if (e.metaKey || e.ctrlKey) return;

      // === Escape : retour Home ===
      if (e.key === "Escape") {
        e.preventDefault();
        navigateToHome();
        return;
      }

      // === Alt + fleches : nav cardinale RELATIVE (retour Sylvain
      //     30/08 "wasd doit etre relatif a la position actuelle sur
      //     le plan"). Chaque touche = un delta directionnel applique
      //     depuis la position actuelle. Ex : Est + A(gauche) = Centre,
      //     Nord + D(droite) = impasse (feedback). ===
      if (e.altKey && ARROW_TO_DIRECTION[e.key]) {
        e.preventDefault();
        goDirection(ARROW_TO_DIRECTION[e.key]);
        return;
      }

      // === WASD / ZQSD (physical) : meme grille relative ===
      if (e.altKey || e.shiftKey) return;
      const direction = WASD_TO_DIRECTION[e.code];
      if (direction) {
        e.preventDefault();
        goDirection(direction);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pathname, router, transition, enabled]);

  return null;
}
