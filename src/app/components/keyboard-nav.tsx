"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { flushSync } from "react-dom";
import { pageKeys, slugs, getPath, type PageKey } from "@/lib/routes";
import type { Locale } from "@/dictionaries";
import { useCardinalTransition, type CardinalDirection } from "./stag-scene/cardinal-transition-context";

/**
 * Navigation clavier flèches gauche/droite (28/08 task #58). Signature
 * portfolio interactif "toi aussi tu es nahual — tu voyages entre les
 * mondes". Ordre nav identique au header (Accueil premier, puis
 * rotation cardinale Est→Sud→Ouest→Nord→Centre).
 *
 * Skip si focus dans input/textarea/contenteditable (ne pas piéger
 * la frappe de l'utilisateur). Trigger transitions cardinales
 * exactement comme le click sur CardinalLink (burst 3D + View
 * Transitions API).
 */

const NAV_ORDER: PageKey[] = ["services", "projets", "contact", "memoire", "codex"];

const DIRECTION_BY_KEY: Record<PageKey, CardinalDirection> = {
  services: "dore",
  projets: "turquoise",
  contact: "cendre",
  memoire: "obsidienne",
  codex: "jade",
};

function isLocale(v: string): v is Locale {
  return v === "fr" || v === "en" || v === "es";
}

export default function KeyboardNav() {
  const router = useRouter();
  const pathname = usePathname();
  const transition = useCardinalTransition();

  useEffect(() => {
    function isTypingContext(target: EventTarget | null): boolean {
      const el = target as HTMLElement | null;
      const tag = el?.tagName?.toLowerCase();
      return tag === "input" || tag === "textarea" || !!el?.isContentEditable;
    }

    function currentIndex(): number {
      // Extract locale + slug de pathname
      const match = pathname.match(/^\/([a-z]{2})(?:\/([^/?#]+))?/);
      if (!match) return 0;
      const [, locale, slug] = match;
      if (!isLocale(locale)) return 0;
      // Home (pas de slug) = index 0 (avant NAV_ORDER)
      if (!slug) return 0;
      for (let i = 0; i < NAV_ORDER.length; i++) {
        if (slugs[NAV_ORDER[i]][locale] === slug) return i + 1;
      }
      return 0;
    }

    function localeFromPath(): Locale {
      const match = pathname.match(/^\/([a-z]{2})/);
      const l = match?.[1];
      return l && isLocale(l) ? l : "fr";
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

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (isTypingContext(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const idx = currentIndex();
      const dir = e.key === "ArrowRight" ? 1 : -1;
      const totalPages = NAV_ORDER.length + 1; // +1 pour home
      const nextIdx = (idx + dir + totalPages) % totalPages;
      const locale = localeFromPath();

      let href: string;
      let direction: CardinalDirection | null;
      if (nextIdx === 0) {
        href = `/${locale}`;
        direction = "jade";
      } else {
        const key = NAV_ORDER[nextIdx - 1];
        href = getPath(locale, key);
        direction = DIRECTION_BY_KEY[key];
      }
      navigate(href, direction);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pathname, router, transition]);

  return null;
}
