import localFont from "next/font/local";
import { notFound } from "next/navigation";
import "../globals.css";
import Header from "../components/header";
import LoadingVeil from "../components/stag-scene/loading-veil";
import { getDictionary, isLocale, locales, type Locale } from "../../dictionaries";

const geistSans = localFont({
  src: "../fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "../fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = getDictionary(locale);
  return {
    title: dict.metadata.title,
    description: dict.metadata.description,
    alternates: {
      languages: Object.fromEntries(locales.map((l) => [l, `/${l}`])),
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;
  const dict = getDictionary(locale);

  return (
    <html lang={locale}>
      <head>
        <link rel="icon" href="/img/logo.svg" type="image/svg+xml" />
      </head>
      {/* nahual-lab-reveal posé en dur ici (pas seulement dans le useEffect
          de SceneStage) depuis le 25/08 : toutes les pages du site sont
          désormais des scènes 3D plein écran (cf memory project-nahual-da),
          donc le scope est permanent. Le poser SSR évite le flash pendant
          l'hydratation (texte sombre invisible sur canvas noir avant que
          l'effet client réapplique le scope). */}
      <body className={`${geistSans.variable} ${geistMono.variable} nahual-lab-reveal`}>
        <Header locale={locale} dict={dict.common} />
        {children}
        <footer className="siteFooter">
          © {new Date().getFullYear()} NAHUAL Studio
        </footer>
        {/* LoadingVeil monté ici (une seule instance par session)
            plutôt que dans SceneStage (une par mount de page) depuis
            le 25/08 : retour Sylvain "on ne doit pas avoir l'écran
            de chargement à chaque changement de page. L'écran doit
            charger toutes les ressources pour ensuite avoir une
            navigation super fluide". Layout persiste entre les
            navigations SPA — LoadingVeil s'auto-démonte après le
            premier fondu (setMounted(false)) et ne remonte plus
            jamais tant que l'utilisateur ne reload pas. */}
        <LoadingVeil
          phrase={dict.lab.loadingPhrase}
          translation={dict.lab.loadingTranslation}
          label={dict.lab.loadingLabel}
        />
      </body>
    </html>
  );
}
