import type { MetadataRoute } from "next";
import { locales } from "@/dictionaries";
import { pageKeys, slugs, getPath } from "@/lib/routes";
import { SITE_URL } from "@/lib/seo";

/**
 * Sitemap App Router (28/08, enrichi 29/08 task #73 SEO).
 * - Home (priorité 1)
 * - Pages écho (0.8)
 * - Case studies détail projets (0.7)
 *
 * Chaque URL a ses hreflang alternates pour signaler l'équivalence
 * multilingue à Google.
 */

const PROJET_SLUGS = ["nuada", "kleyfrance", "synapse"] as const;

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

  // Case studies détail (29/08 task #73)
  for (const projetSlug of PROJET_SLUGS) {
    const alts = Object.fromEntries(
      locales.map((l) => [l, `${SITE_URL}/${l}/${slugs.projets[l]}/${projetSlug}`]),
    );
    for (const l of locales) {
      routes.push({
        url: `${SITE_URL}/${l}/${slugs.projets[l]}/${projetSlug}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.7,
        alternates: { languages: alts },
      });
    }
  }

  return routes;
}
