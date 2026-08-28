import type { Locale } from "../dictionaries";

export const pageKeys = [
  "services",
  "projets",
  "contact",
  "memoire",
  "codex",
  "mentionsLegales",
  "planDuSite",
  "accessibilite",
  "confidentialite",
  "credits",
] as const;
export type PageKey = (typeof pageKeys)[number];

// Slug par langue et par page — permet des URLs traduites.
// Pages legales (28/08 retour Sylvain) : slugs multilingues clairs
// pour SEO + comprehension utilisateur, tous rendus avec direction
// jade (centre / neutre) pour ne pas casser le pattern cardinal.
export const slugs: Record<PageKey, Record<Locale, string>> = {
  services: { fr: "services", en: "services", es: "servicios" },
  projets: { fr: "projets", en: "projects", es: "proyectos" },
  contact: { fr: "contact", en: "contact", es: "contacto" },
  memoire: { fr: "memoire", en: "memory", es: "memoria" },
  codex: { fr: "codex", en: "codex", es: "codice" },
  mentionsLegales: { fr: "mentions-legales", en: "legal-notices", es: "aviso-legal" },
  planDuSite: { fr: "plan-du-site", en: "sitemap", es: "mapa-del-sitio" },
  accessibilite: { fr: "accessibilite", en: "accessibility", es: "accesibilidad" },
  confidentialite: { fr: "confidentialite", en: "privacy", es: "privacidad" },
  credits: { fr: "credits", en: "credits", es: "creditos" },
};

export function getPath(locale: Locale, key: PageKey): string {
  return `/${locale}/${slugs[key][locale]}`;
}

export function getPageKeyFromSlug(locale: Locale, slug: string): PageKey | undefined {
  return pageKeys.find((key) => slugs[key][locale] === slug);
}
