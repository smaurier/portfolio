"use client";

import Link, { type LinkProps } from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  codex: "jade",
  mentionsLegales: "jade",
  planDuSite: "jade",
  accessibilite: "jade",
  confidentialite: "jade",
  credits: "jade",
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
  tabIndex?: number;
};

const CardinalLink = forwardRef<HTMLAnchorElement, CardinalLinkProps>(function CardinalLink(
  { href, children, onClick, ...rest },
  ref,
) {
  const router = useRouter();
  const pathname = usePathname();
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
    // Click sur lien page courante (28/08 retour Sylvain) : au lieu
    // de rejouer le burst + VT inutile (snapshot new === old = anim
    // invisible), scroll to top smooth. Retour au sanctuaire de la
    // scene. Signature "tu es deja ici, remonte au centre".
    const currentPath = pathname?.replace(/\/$/, "") || "";
    const targetPath = href.replace(/\/$/, "");
    if (currentPath === targetPath) {
      e.preventDefault();
      onClick?.(e);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const direction = directionFromHref(href);
    if (!direction || !transition) {
      onClick?.(e);
      return;
    }
    // Intercepte : la timeline Nepantla (contexte) orchestre burst 3D
    // + sortie du contenu + navigation au coeur du mouvement. L'entree
    // du nouveau contenu est jouee par NepantlaFrame au changement de
    // pathname. Plus de View Transitions API (03/09) : elle snapshotait
    // le canvas 3D vivant en screenshot fige = le "hache".
    e.preventDefault();
    onClick?.(e);
    transition.startTransition(direction, () => {
      router.push(href);
    });
  }

  const direction = directionFromHref(href);
  return (
    <Link
      ref={ref}
      href={href}
      onClick={handleClick}
      data-cardinal-direction={direction ?? undefined}
      data-magnetic={direction ? "" : undefined}
      {...rest}
    >
      {children}
    </Link>
  );
});

export default CardinalLink;
