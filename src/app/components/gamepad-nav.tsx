"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { flushSync } from "react-dom";
import { getPath, pageKeys, slugs, type PageKey } from "@/lib/routes";
import type { Locale } from "@/dictionaries";
import { isShortcutsEnabled, subscribeShortcuts } from "@/lib/shortcuts";
import { useCardinalTransition, type CardinalDirection } from "./stag-scene/cardinal-transition-context";

/**
 * Navigation manette (30/08). Utilise Gamepad API du navigateur pour
 * capter les D-pad + boutons de facade d'une manette connectee, et
 * navigue en cardinal RELATIF (comme WASD) — chaque direction du
 * D-pad = un delta applique a la position actuelle sur la grille
 * cardinale, pas une position absolue.
 *
 *   D-pad haut  = deplace d'une case Nord  (peut atteindre Memoire
 *                  depuis Centre, ou Centre depuis Sud, etc.)
 *   D-pad droite = deplace d'une case Est
 *   D-pad bas    = deplace d'une case Sud
 *   D-pad gauche = deplace d'une case Ouest
 *   Bouton A/X   = Home direct (Centre)
 *   Bouton B/O   = Home direct
 *
 * Si le delta mene a une case non-habitee (coins de grille) ou a la
 * page courante → feedback shake du dot cardinal correspondant, pas
 * de navigation.
 *
 * Implementation : Gamepad API ne dispatche pas d'events. Poll rAF
 * quand une manette est connectee, detecte edges (released → pressed)
 * pour navigate une seule fois par appui.
 *
 * Standard gamepad mapping :
 *   buttons[0]  = A / cross
 *   buttons[1]  = B / circle
 *   buttons[12-15] = D-pad up/down/left/right
 *
 * Skip complet si prefers-reduced-motion.
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

type GridPos = [number, number];
const PAGE_TO_POS: Record<PageKey | "home", GridPos> = {
  memoire: [0, -1],
  services: [1, 0],
  projets: [0, 1],
  contact: [-1, 0],
  home: [0, 0],
  codex: [0, 0],
  mentionsLegales: [0, 0],
  planDuSite: [0, 0],
  accessibilite: [0, 0],
  confidentialite: [0, 0],
  credits: [0, 0],
};
const HOME_POS: GridPos = [0, 0];
const POS_TO_PAGE: Record<string, PageKey | "home"> = {
  "0,-1": "memoire",
  "1,0": "services",
  "0,1": "projets",
  "-1,0": "contact",
  "0,0": "home",
};

// Bouton manette → intention. 4 D-pad = delta directionnel (relatif),
// 2 face buttons = home direct (absolu Centre).
type Intent =
  | { kind: "delta"; direction: "north" | "east" | "south" | "west"; delta: GridPos; cardinal: CardinalDirection }
  | { kind: "home" };

const BUTTON_TO_INTENT: Record<number, Intent> = {
  12: { kind: "delta", direction: "north", delta: [0, -1], cardinal: "obsidienne" },
  13: { kind: "delta", direction: "south", delta: [0, 1], cardinal: "turquoise" },
  14: { kind: "delta", direction: "west", delta: [-1, 0], cardinal: "cendre" },
  15: { kind: "delta", direction: "east", delta: [1, 0], cardinal: "dore" },
  0: { kind: "home" },
  1: { kind: "home" },
};

function isLocale(v: string): v is Locale {
  return v === "fr" || v === "en" || v === "es";
}

export default function GamepadNav() {
  const router = useRouter();
  const pathname = usePathname();
  const transition = useCardinalTransition();
  const [enabled, setEnabled] = useState(true);
  useEffect(() => {
    setEnabled(isShortcutsEnabled());
    return subscribeShortcuts(setEnabled);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let rafId: number | null = null;
    const lastPressed = new Map<number, boolean>();

    function localeFromPath(): Locale {
      const match = pathname.match(/^\/([a-z]{2})/);
      const l = match?.[1];
      return l && isLocale(l) ? l : "fr";
    }

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

    function flashNoop(direction: CardinalDirection) {
      const root = document.documentElement;
      root.setAttribute("data-nav-nowhere", direction);
      window.setTimeout(() => {
        if (root.getAttribute("data-nav-nowhere") === direction) {
          root.removeAttribute("data-nav-nowhere");
        }
      }, 500);
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

    function pressButton(intent: Intent) {
      const locale = localeFromPath();
      if (intent.kind === "home") {
        if (pathname.replace(/\/$/, "") === `/${locale}`) {
          flashNoop("jade");
        } else {
          navigate(`/${locale}`, "jade");
        }
        return;
      }
      const [cx, cy] = currentPos();
      const [dx, dy] = intent.delta;
      const key = `${cx + dx},${cy + dy}`;
      const target = POS_TO_PAGE[key];
      if (!target) {
        flashNoop(intent.cardinal);
        return;
      }
      const targetPath = target === "home" ? `/${locale}` : getPath(locale, target);
      if (pathname.replace(/\/$/, "") === targetPath.replace(/\/$/, "")) {
        flashNoop(intent.cardinal);
      } else {
        const direction = target === "home" ? "jade" : DIRECTION_BY_KEY[target];
        navigate(targetPath, direction);
      }
    }

    function poll() {
      const gamepads = navigator.getGamepads?.() ?? [];
      let anyConnected = false;
      for (const gp of gamepads) {
        if (!gp) continue;
        anyConnected = true;
        for (const [idxStr, intent] of Object.entries(BUTTON_TO_INTENT)) {
          const idx = Number(idxStr);
          const btn = gp.buttons[idx];
          if (!btn) continue;
          const wasPressed = lastPressed.get(idx) ?? false;
          const isPressed = btn.pressed;
          lastPressed.set(idx, isPressed);
          if (!wasPressed && isPressed) {
            pressButton(intent);
          }
        }
      }
      if (anyConnected) {
        rafId = requestAnimationFrame(poll);
      } else {
        rafId = null;
      }
    }

    function start() {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(poll);
    }

    function onConnect() {
      start();
    }

    const initialGamepads = navigator.getGamepads?.() ?? [];
    if (initialGamepads.some((g) => g !== null)) {
      start();
    }
    window.addEventListener("gamepadconnected", onConnect);

    return () => {
      window.removeEventListener("gamepadconnected", onConnect);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [pathname, router, transition, enabled]);

  return null;
}
