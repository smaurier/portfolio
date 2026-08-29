"use client";

import { useEffect, type RefObject } from "react";

/**
 * Focus trap pour modals (RGAA 7.3, WCAG 2.4.3). Confine la
 * navigation clavier dans un container tant qu'il est actif :
 *  - Focus initial sur le premier focusable a l'activation
 *  - Tab depuis le dernier focusable revient au premier
 *  - Shift+Tab depuis le premier va au dernier
 *  - A la desactivation, rend le focus a l'element focus avant
 *    l'activation (si toujours dans le DOM)
 *
 * Ne gere pas Escape (a coupler avec un listener local qui appelle
 * onClose selon la semantique du modal). Ne pose pas de backdrop
 * ni de scroll lock : responsabilite du container appelant.
 *
 * L'appelant doit fournir un ref vers le container racine du modal.
 * Si le container n'a pas de focusable direct, il est rendu
 * focusable temporairement (tabindex=-1) pour recevoir le focus
 * initial et permettre l'annonce SR du modal.
 */

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap(
  rootRef: RefObject<HTMLElement | null>,
  active: boolean
) {
  useEffect(() => {
    if (!active) return;
    const root = rootRef.current;
    if (!root) return;

    const previousFocus = document.activeElement as HTMLElement | null;

    function getFocusables(): HTMLElement[] {
      if (!root) return [];
      return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    }

    const initialFocusables = getFocusables();
    let restoreTabIndex = false;
    if (initialFocusables.length > 0) {
      initialFocusables[0].focus();
    } else {
      root.setAttribute("tabindex", "-1");
      root.focus();
      restoreTabIndex = true;
    }

    function onKey(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const focusables = getFocusables();
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;
      if (e.shiftKey && activeEl === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    }

    root.addEventListener("keydown", onKey);

    return () => {
      root.removeEventListener("keydown", onKey);
      if (restoreTabIndex) root.removeAttribute("tabindex");
      if (previousFocus && document.contains(previousFocus)) {
        previousFocus.focus();
      }
    };
  }, [rootRef, active]);
}
