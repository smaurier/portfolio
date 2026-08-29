import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/seo";

/**
 * Web App Manifest (29/08 SEO pass v2). Basique — sert surtout a
 * l'installabilite PWA sur mobile (Add to Home Screen) et a un
 * indicateur SERP "installable" sur mobile Chrome. Rien de complexe.
 * theme_color obsidienne aligne la barre chrome mobile a la palette.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: "Nahual",
    description:
      "Portfolio de Sylvain Maurier · developpeur creatif et auditeur RGAA a Lyon.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0710",
    theme_color: "#0a0710",
    icons: [
      { src: "/img/mini-logo.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
    lang: "fr",
    categories: ["portfolio", "design", "development"],
  };
}
