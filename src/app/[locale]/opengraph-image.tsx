import { ImageResponse } from "next/og";
import { getDictionary, isLocale, locales } from "@/dictionaries";
import { STUDIO_NAME } from "@/lib/seo";
import { CarteOg, OG_SIZE, piedraDataUrl } from "@/lib/og-carte";

/**
 * OG image de l'accueil, par langue (28/08). Depuis le 13/09, la carte
 * elle-meme vit dans `lib/og-carte` : les pages interieures en ont une
 * aussi, chacune dans sa direction. Ici, le Centre : jade, le nom du
 * studio, la phrase du Codex.
 */
export const alt = "Nahual · studio de création";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
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
        titre={STUDIO_NAME}
        description={dict.metadata.description}
        piedra={piedra}
      />
    ),
    { ...size },
  );
}
