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
      // SVG carre (fond obsidienne + cerf) — safe zone 78.7% centre,
      // compatible any + maskable. Le typage Next n'accepte qu'une
      // seule valeur par entree (le spec Web App Manifest autorise
      // "any maskable" separe par espace, mais TS restreint), donc
      // on declare deux entrees pointant sur le meme fichier.
      // Voir src/app/icon.svg (meme visuel, servi par Next file
      // convention pour les onglets navigateur).
      {
        src: "/icons/icon-square.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon-square.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    lang: "fr",
    categories: ["portfolio", "design", "development"],
  };
}
