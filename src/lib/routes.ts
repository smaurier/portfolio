import type { Locale } from "../dictionaries";

export const pageKeys = ["services", "projets", "contact", "memoire", "codex"] as const;
export type PageKey = (typeof pageKeys)[number];

// Slug par langue et par page — permet des URLs traduites
// (/es/servicios, /en/projects) plutôt que le même slug partout.
// "memoire" = Nord/Mictlampa (cf memory project-nahual-da) : le nom nahuatl
// (Teyolía) n'est jamais dans l'URL, seulement dans le titre affiché.
// "codex" = Centre/jade (28/08 task #52) : hub cosmogonique + about
// incarne, fusionne about + presentation cosmogonie nahua. Direction
// jade (comme home) car centre = cœur de l'univers Nahual.
export const slugs: Record<PageKey, Record<Locale, string>> = {
  services: { fr: "services", en: "services", es: "servicios" },
  projets: { fr: "projets", en: "projects", es: "proyectos" },
  contact: { fr: "contact", en: "contact", es: "contacto" },
  memoire: { fr: "memoire", en: "memory", es: "memoria" },
  codex: { fr: "codex", en: "codex", es: "codice" },
};

export function getPath(locale: Locale, key: PageKey): string {
  return `/${locale}/${slugs[key][locale]}`;
}

export function getPageKeyFromSlug(locale: Locale, slug: string): PageKey | undefined {
  return pageKeys.find((key) => slugs[key][locale] === slug);
}
