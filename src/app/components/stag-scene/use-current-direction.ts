"use client";

import { usePathname } from "next/navigation";
import { pageKeys, slugs, type PageKey } from "@/lib/routes";
import type { DirectionKey } from "./direction-colors";

/**
 * Hook client qui dérive la direction cardinale courante depuis le
 * pathname (28/08 refactor Phase A). Utilisé par PersistentScene pour
 * animer les couleurs de la scène 3D en douceur (lerp) au changement
 * de page — la scène persiste, seule la palette évolue.
 *
 * Mapping (Codex Nahual section 03) :
 *  - Racine locale (/fr, /en, /es) = jade (Centre)
 *  - Services = dore (Est)
 *  - Projets = turquoise (Sud)
 *  - Contact = cendre (Ouest)
 *  - Memoire = obsidienne (Nord)
 *
 * Fallback jade si pathname non reconnu (404, edge cases).
 */

const DIRECTION_BY_KEY: Record<PageKey, DirectionKey> = {
  services: "dore",
  projets: "turquoise",
  contact: "cendre",
  memoire: "obsidienne",
  codex: "jade",
};

export function useCurrentDirection(): DirectionKey {
  const pathname = usePathname();
  if (!pathname) return "jade";

  // Racine locale /xx ou /xx/
  if (/^\/[a-z]{2}\/?$/i.test(pathname)) return "jade";

  const match = pathname.match(/^\/[a-z]{2}\/([^/?#]+)/i);
  if (!match) return "jade";
  const slug = match[1];
  for (const key of pageKeys) {
    for (const locale of ["fr", "en", "es"] as const) {
      if (slugs[key][locale] === slug) return DIRECTION_BY_KEY[key];
    }
  }
  return "jade";
}
