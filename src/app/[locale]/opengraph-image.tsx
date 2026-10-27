import { ImageResponse } from "next/og";
import { getDictionary, isLocale, locales } from "@/dictionaries";
import { CarteOg, OG_SIZE, piedraDataUrl } from "@/lib/og-carte";
import { altPartage } from "@/lib/og-partage";

/**
 * OG image de l'accueil, par langue (28/08). Depuis le 13/09, la carte
 * elle-meme vit dans `lib/og-carte` : les pages interieures en ont une
 * aussi, chacune dans sa direction. Ici, le Centre : jade, le nom du
 * studio, la phrase du Codex.
 *
 * 27/10 : le titre dessine dans la carte et son alternative suivent enfin la
 * langue. Tous deux venaient d'une constante francaise, donc un lien partage
 * depuis /en montrait une carte francaise (cf `lib/og-partage`).
 */
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

/**
 * L'alt vit ici et pas en constante : c'est le seul endroit de la convention
 * Next ou il peut dependre des params de la route, donc de la langue.
 */
export async function generateImageMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "fr";
  const dict = getDictionary(locale);
  return [
    {
      id: locale,
      alt: altPartage(dict.metadata.title),
      size: OG_SIZE,
      contentType: "image/png",
    },
  ];
}

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "fr";
  const dict = getDictionary(locale);
  const piedra = await piedraDataUrl();

  return new ImageResponse(
    (
      <CarteOg
        locale={locale}
        direction="jade"
        titre={dict.metadata.title}
        description={dict.metadata.description}
        piedra={piedra}
      />
    ),
    { ...size },
  );
}
