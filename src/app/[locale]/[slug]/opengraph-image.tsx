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
 *
 * 27/10 : la constante `alt` francaise qui trainait a la racine est partie.
 * Elle ne servait a rien ici (la page declare son alternative elle-meme, via
 * `altPartage`), mais elle etait un piege : c'est exactement cette forme qui
 * a laisse l'accueil parler francais sur /en pendant deux mois.
 *
 * ⛔ Et pas de `generateImageMetadata` dans cette route : il suffixe l'URL de
 * l'image d'un identifiant, que `page.tsx` construit en dur sans lui. Mesure
 * du 27/10 : la carte de /en/services serait partie en 404.
 */
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

/**
 * Ce que la carte montre, pour une langue et un slug. Une seule lecture du
 * dictionnaire, une seule table de directions : la carte dessinee et son
 * titre ne peuvent pas se desynchroniser.
 */
function carteDeLaPage(raw: string, slug: string) {
  const locale: Locale = isLocale(raw) ? raw : "fr";
  const dict = getDictionary(locale);
  const key = getPageKeyFromSlug(locale, slug);
  const direction = key ? DIRECTION_BY_PAGE[key] : "jade";
  const page = key ? (dict[key] as { title?: string; intro?: string }) : undefined;
  return {
    locale,
    direction,
    surtitre: REGION[direction],
    titre: page?.title ?? dict.metadata.title,
    description: page?.intro ?? dict.metadata.description,
  };
}

export default async function Image({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: raw, slug } = await params;
  const carte = carteDeLaPage(raw, slug);
  const piedra = await piedraDataUrl();

  return new ImageResponse(
    (
      <CarteOg
        locale={carte.locale}
        direction={carte.direction}
        surtitre={carte.surtitre}
        titre={carte.titre}
        description={carte.description}
        piedra={piedra}
      />
    ),
    { ...size },
  );
}
