import localFont from "next/font/local";
import { notFound } from "next/navigation";
import "../globals.css";
import CustomCursor from "../components/custom-cursor";
import EasterEgg from "../components/easter-egg";
import Header from "../components/header";
import NahualIntro from "../components/nahual-intro";
import SkipNav from "../components/skip-nav";
import SmoothScroll from "../components/smooth-scroll";
import LoadingVeil from "../components/stag-scene/loading-veil";
import { CardinalTransitionProvider } from "../components/stag-scene/cardinal-transition-context";
import PersistentScene from "../components/stag-scene/persistent-scene";
import { SceneRefsProvider } from "../components/stag-scene/scene-refs-context";
import { getDictionary, isLocale, locales, type Locale } from "../../dictionaries";
import { getPath } from "../../lib/routes";
import {
  AUTHOR_EMAIL,
  AUTHOR_GITHUB,
  AUTHOR_LINKEDIN,
  AUTHOR_NAME,
  SITE_NAME,
  SITE_URL,
} from "../../lib/seo";

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
  const title = dict.metadata.title;
  const description = dict.metadata.description;
  const url = `${SITE_URL}/${locale}`;
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    applicationName: SITE_NAME,
    authors: [{ name: AUTHOR_NAME, url: AUTHOR_LINKEDIN }],
    creator: AUTHOR_NAME,
    publisher: AUTHOR_NAME,
    formatDetection: { email: false, address: false, telephone: false },
    alternates: {
      canonical: url,
      languages: Object.fromEntries(locales.map((l) => [l, `/${l}`])),
    },
    openGraph: {
      type: "website",
      url,
      siteName: SITE_NAME,
      title,
      description,
      locale: locale === "fr" ? "fr_FR" : locale === "en" ? "en_US" : "es_MX",
      alternateLocale: locales.filter((l) => l !== locale).map((l) => (l === "fr" ? "fr_FR" : l === "en" ? "en_US" : "es_MX")),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      creator: `@${AUTHOR_NAME.replace(" ", "")}`,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    },
    icons: {
      icon: [{ url: "/img/logo.svg", type: "image/svg+xml" }],
    },
    category: "portfolio",
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

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Person",
      name: AUTHOR_NAME,
      url: SITE_URL,
      email: `mailto:${AUTHOR_EMAIL}`,
      jobTitle: "Frontend Developer · Creative Developer · RGAA Auditor",
      sameAs: [AUTHOR_LINKEDIN, AUTHOR_GITHUB],
      knowsAbout: ["Accessibility", "RGAA", "WCAG", "React", "Next.js", "React Three Fiber", "TypeScript", "WebGL"],
      worksFor: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
      inLanguage: locale,
      author: { "@type": "Person", name: AUTHOR_NAME },
      description: dict.metadata.description,
    },
    {
      "@context": "https://schema.org",
      "@type": "ProfessionalService",
      name: SITE_NAME,
      url: SITE_URL,
      description: dict.metadata.description,
      areaServed: { "@type": "Country", name: "France" },
      provider: { "@type": "Person", name: AUTHOR_NAME },
      serviceType: ["Web Development", "Accessibility Audit", "RGAA Audit"],
    },
  ];

  return (
    <html lang={locale}>
      <head>
        <link rel="icon" href="/img/logo.svg" type="image/svg+xml" />
        {/* JSON-LD structuré (28/08) — Person + WebSite + ProfessionalService.
            Injecté dans <head> plutôt que <body> pour être détecté par les
            crawlers dès le premier byte. Un script par entité (schema.org
            recommande cette forme plutôt qu'un @graph unique — plus simple à
            debugger avec Rich Results Test). */}
        {jsonLd.map((entry, i) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(entry) }}
          />
        ))}
      </head>
      {/* nahual-lab-reveal posé en dur ici (pas seulement dans le useEffect
          de SceneStage) depuis le 25/08 : toutes les pages du site sont
          désormais des scènes 3D plein écran (cf memory project-nahual-da),
          donc le scope est permanent. Le poser SSR évite le flash pendant
          l'hydratation (texte sombre invisible sur canvas noir avant que
          l'effet client réapplique le scope). */}
      <body className={`${geistSans.variable} ${geistMono.variable} nahual-lab-reveal`}>
        {/* Provider transition cardinale "cerf mène" (28/08) — expose
            transitionDirection + progressRef aux consommateurs scène
            3D (StagModel head-look override, OrbitCamera burst
            orbit) et l'API startTransition à CardinalLink. Persiste
            au niveau layout (survit aux navigations SPA), sinon la
            transition serait cassée par le mount de la nouvelle page
            avant que le burst finisse. */}
        <SceneRefsProvider>
        <CardinalTransitionProvider>
          {/* Skip nav a11y (28/08 task #49) — premier element focusable,
              premier tab depuis top = "aller au contenu principal".
              Sr-only par defaut, visible au focus. */}
          <SkipNav label={dict.common.skipNav} />
          {/* Lenis smooth scroll (28/08 task #48) — signature silky
              scroll. Respect reducedMotion (pas monte du tout).
              window.scrollY reste synchro, la scene 3D reveal-arc
              n'est pas cassee. */}
          <SmoothScroll />
          <Header locale={locale} dict={dict.common} />
          {/* Scène 3D persistante (28/08 Phase A refactor) — Canvas
              vit ici pour survivre à toutes les navigations SPA,
              plus de coupure. Direction cardinale lue via
              usePathname côté PersistentScene, palette anime en
              douceur au changement d'URL. */}
          <PersistentScene />
          {children}
          <footer className="siteFooter">
            <span>© {new Date().getFullYear()} NAHUAL Studio</span>
            <span aria-hidden="true"> · </span>
            <a href={getPath(locale, "codex")} className="footerLink">
              {dict.common.nav.codex}
            </a>
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
          {/* Intro cinématique one-shot par session (28/08 task #45) —
              letterbox reveal + phrase Codex + Piedra del Sol + logo.
              LocalStorage flag nahual-intro-seen : joue une seule
              fois. Skip button visible. Signature "premier wow jury"
              SOTY. */}
          <NahualIntro locale={locale} />
          {/* Curseur custom (28/08 task #47) — point cardinal + ring
              qui suit, morph cardinal au survol des liens nav
              (data-cardinal-direction), magnetic attraction sur CTAs
              (data-magnetic). Actif uniquement hover:hover + pointer:fine. */}
          <CustomCursor />
          {/* Easter egg (28/08 task #56) — tape "nahual" au clavier
              n'importe ou sur le site (hors input), reveal toast
              discret 5s. Signature "site vivant" cachee. */}
          <EasterEgg locale={locale} />
        </CardinalTransitionProvider>
        </SceneRefsProvider>
      </body>
    </html>
  );
}
