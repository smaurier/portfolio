import type { Locale } from "../dictionaries";

export const pageKeys = ["services", "projets", "contact", "blog"] as const;
export type PageKey = (typeof pageKeys)[number];

// Slug par langue et par page — permet des URLs traduites
// (/es/servicios, /en/projects) plutôt que le même slug partout.
export const slugs: Record<PageKey, Record<Locale, string>> = {
  services: { fr: "services", en: "services", es: "servicios" },
  projets: { fr: "projets", en: "projects", es: "proyectos" },
  contact: { fr: "contact", en: "contact", es: "contacto" },
  blog: { fr: "blog", en: "blog", es: "blog" },
};

export function getPath(locale: Locale, key: PageKey): string {
  return `/${locale}/${slugs[key][locale]}`;
}

export function getPageKeyFromSlug(locale: Locale, slug: string): PageKey | undefined {
  return pageKeys.find((key) => slugs[key][locale] === slug);
}
