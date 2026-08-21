import type { Locale } from "../dictionaries";

export const pageKeys = ["services", "projets", "contact", "memoire"] as const;
export type PageKey = (typeof pageKeys)[number];

// Slug par langue et par page — permet des URLs traduites
// (/es/servicios, /en/projects) plutôt que le même slug partout.
// "memoire" = Nord/Mictlampa (cf memory project-nahual-da) : le nom nahuatl
// (Teyolía) n'est jamais dans l'URL, seulement dans le titre affiché — les
// slugs restent des mots ordinaires comme les 3 autres pages.
export const slugs: Record<PageKey, Record<Locale, string>> = {
  services: { fr: "services", en: "services", es: "servicios" },
  projets: { fr: "projets", en: "projects", es: "proyectos" },
  contact: { fr: "contact", en: "contact", es: "contacto" },
  memoire: { fr: "memoire", en: "memory", es: "memoria" },
};

export function getPath(locale: Locale, key: PageKey): string {
  return `/${locale}/${slugs[key][locale]}`;
}

export function getPageKeyFromSlug(locale: Locale, slug: string): PageKey | undefined {
  return pageKeys.find((key) => slugs[key][locale] === slug);
}
