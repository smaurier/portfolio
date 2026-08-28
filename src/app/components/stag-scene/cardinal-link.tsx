"use client";

import Link, { type LinkProps } from "next/link";
import { useRouter } from "next/navigation";
import { forwardRef, type MouseEvent, type ReactNode } from "react";
import { pageKeys, slugs, type PageKey } from "@/lib/routes";
import { useCardinalTransition, type CardinalDirection } from "./cardinal-transition-context";

/**
 * Drop-in replacement pour Next Link (28/08). Intercepte le click,
 * calcule la direction cardinale de la page cible, joue le burst
 * "cerf mène" pendant 500ms, puis navigue.
 *
 * Convention Codex Nahual (cf memory) : chaque page a sa direction :
 *   home        → jade (Centre)
 *   services    → dore (Est)
 *   projets     → turquoise (Sud)
 *   contact     → cendre (Ouest)
 *   memoire     → obsidienne (Nord)
 *
 * Liens externes (http/https/mailto) ou même page = pas de burst,
 * comportement Link natif.
 */

const DIRECTION_BY_KEY: Record<PageKey, CardinalDirection> = {
  services: "dore",
  projets: "turquoise",
  contact: "cendre",
  memoire: "obsidienne",
};

/** Extrait la direction cardinale d'une href locale de l'app. */
function directionFromHref(href: string): CardinalDirection | null {
  // Externe : jamais de burst.
  if (/^(?:https?:|mailto:|tel:)/i.test(href)) return null;

  // /fr, /en, /es (racines locale) = Centre / jade.
  if (/^\/[a-z]{2}\/?$/i.test(href)) return "jade";

  // /fr/services etc. → cherche le slug dans la table `slugs`.
  const match = href.match(/^\/[a-z]{2}\/([^/?#]+)/i);
  if (!match) return null;
  const slug = match[1];
  for (const key of pageKeys) {
    for (const locale of ["fr", "en", "es"] as const) {
      if (slugs[key][locale] === slug) return DIRECTION_BY_KEY[key];
    }
  }
  return null;
}

type CardinalLinkProps = Omit<LinkProps, "href"> & {
  href: string;
  children: ReactNode;
  className?: string;
  target?: string;
  rel?: string;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
  "aria-label"?: string;
  "aria-current"?: React.AriaAttributes["aria-current"];
  hrefLang?: string;
  lang?: string;
};

const CardinalLink = forwardRef<HTMLAnchorElement, CardinalLinkProps>(function CardinalLink(
  { href, children, onClick, ...rest },
  ref,
) {
  const router = useRouter();
  const transition = useCardinalTransition();

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    // Laisse passer clicks middle / cmd / target=_blank → nav standard.
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      rest.target === "_blank"
    ) {
      onClick?.(e);
      return;
    }
    const direction = directionFromHref(href);
    if (!direction || !transition) {
      onClick?.(e);
      return;
    }
    // Intercepte : burst 3D (cerf/camera/bloom) puis navigation via
    // View Transitions API si supportée — la page ENTIÈRE glisse
    // dans la direction cardinale, ancienne sort, nouvelle arrive.
    // Signature "vraie transition de page" (retour Sylvain 28/08
    // "faudrait vraiment que les pages coulissent et soient
    // remplacées"). Fallback nav sec si browser sans support.
    e.preventDefault();
    onClick?.(e);
    transition.startTransition(direction, () => {
      // Pose l'attribut sur <html> pour que les @keyframes CSS
      // ::view-transition-old/new sélectionnent la bonne animation
      // cardinale (défini dans globals.css).
      document.documentElement.setAttribute("data-cardinal-nav", direction);
      const doNav = () => router.push(href);
      // Chrome/Edge/Safari 18.2+ supportent. Firefox pas encore.
      // Fallback gracieux = nav standard sans view transition.
      type ViewTransitionDocument = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };
      const doc = document as ViewTransitionDocument;
      if (typeof doc.startViewTransition === "function") {
        const vt = doc.startViewTransition(doNav);
        vt.finished.finally(() => {
          document.documentElement.removeAttribute("data-cardinal-nav");
        });
      } else {
        doNav();
        setTimeout(() => document.documentElement.removeAttribute("data-cardinal-nav"), 500);
      }
    });
  }

  return (
    <Link ref={ref} href={href} onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
});

export default CardinalLink;
