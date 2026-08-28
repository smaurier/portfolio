import type { MetadataRoute } from "next";
import { locales } from "@/dictionaries";
import { pageKeys, getPath } from "@/lib/routes";
import { SITE_URL } from "@/lib/seo";

/**
 * Sitemap App Router (28/08). Une entrée par (locale, page) avec
 * hreflang alternates pour signaler l'équivalence multilingue à
 * Google. Priorité 1 pour la home, 0.8 pour les sous-pages.
 * changeFrequency monthly = portfolio, pas un site d'actu.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: MetadataRoute.Sitemap = [];

  const homeAlts = Object.fromEntries(locales.map((l) => [l, `${SITE_URL}/${l}`]));
  for (const l of locales) {
    routes.push({
      url: `${SITE_URL}/${l}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 1,
      alternates: { languages: homeAlts },
    });
  }

  for (const key of pageKeys) {
    const pageAlts = Object.fromEntries(locales.map((l) => [l, `${SITE_URL}${getPath(l, key)}`]));
    for (const l of locales) {
      routes.push({
        url: `${SITE_URL}${getPath(l, key)}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.8,
        alternates: { languages: pageAlts },
      });
    }
  }

  return routes;
}
