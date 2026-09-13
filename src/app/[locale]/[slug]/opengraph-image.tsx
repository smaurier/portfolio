import { ImageResponse } from "next/og";
import { getDictionary, isLocale, locales, type Locale } from "@/dictionaries";
import { getPageKeyFromSlug, pageKeys, slugs } from "@/lib/routes";
import { CarteOg, OG_SIZE, piedraDataUrl } from "@/lib/og-carte";
import type { DirectionKey } from "@/app/components/stag-scene/direction-colors";

/**
 * L'IMAGE DE PARTAGE PAR PAGE (13/09). Jusqu'ici, tout lien partage du
 * site montrait la meme image de nuit, quelle que soit la page : le lien
 * vers Services montre maintenant l'or de l'aube, celui vers Memoire
 * l'obsidienne du Nord, avec le titre de la page et le nom nahuatl de sa
 * direction. C'est la derniere case vide de la grille des laureats
 * (docs/da/profondeur-des-mecaniques), et c'est ce qu'un jure voit avant
 * meme d'ouvrir le site.
 *
 * Generee a la build pour chaque langue et chaque page (statique, pas
 * d'execution a la demande).
 */
export const alt = "Nahual · studio de création";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return locales.flatMap((locale) => pageKeys.map((key) => ({ locale, slug: slugs[key][locale] })));
}

/** La meme table que la page (elle porte sa direction depuis le 25/08). */
const DIRECTION_BY_PAGE: Record<string, DirectionKey> = {
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

/** Le nom nahuatl de la region, celui que la boussole donne deja. */
const REGION: Record<DirectionKey, string> = {
  jade: "Tlalxicco",
  dore: "Tlahuizcalpan",
  turquoise: "Huitztlampa",
  cendre: "Cihuatlampa",
  obsidienne: "Mictlampa",
};

export default async function Image({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: raw, slug } = await params;
  const locale: Locale = isLocale(raw) ? raw : "fr";
  const dict = getDictionary(locale);
  const key = getPageKeyFromSlug(locale, slug);
  const direction = key ? DIRECTION_BY_PAGE[key] : "jade";
  const page = key ? (dict[key] as { title?: string; intro?: string }) : undefined;
  const titre = page?.title ?? dict.metadata.title;
  const description = page?.intro ?? dict.metadata.description;
  const piedra = await piedraDataUrl();

  return new ImageResponse(
    (
      <CarteOg
        locale={locale}
        direction={direction}
        surtitre={REGION[direction]}
        titre={titre}
        description={description}
        piedra={piedra}
      />
    ),
    { ...size },
  );
}
