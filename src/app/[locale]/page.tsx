import { notFound } from "next/navigation";
import { getDictionary, isLocale } from "../../dictionaries";
import { getPath } from "../../lib/routes";
import StagScene from "../components/stag-scene/stag-scene";

// Home en prod : la scene du cerf. Le LoadingVeil est monte globalement par
// [locale]/layout.tsx (une seule instance, persistante entre navigations).
//
// Composant SERVEUR depuis le 11/09. Il etait client, pour deballer params
// avec use(), et de ce fait il importait les trois dictionnaires dans le
// bundle du navigateur (188 Ko bruts, 64 Ko compresses, un dixieme du
// JavaScript que le voile attend). StagScene est un composant client, ce qui
// n'oblige en rien la page a l'etre : elle ne lui passe que des donnees.
export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <StagScene
      home={dict.home}
      locale={locale}
      closure={dict.closure}
      servicesHref={getPath(locale, "services")}
      sceneDescription={dict.common.sceneDescriptions.jade}
    />
  );
}
