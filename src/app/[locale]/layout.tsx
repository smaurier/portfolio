import localFont from "next/font/local";
import { notFound } from "next/navigation";
import "../globals.css";
import CardinalAnnouncer from "../components/cardinal-announcer";
import CardinalCompass from "../components/cardinal-compass";
import CardinalHoverSync from "../components/cardinal-hover-sync";
import MaskReveal from "../components/mask-reveal";
import CustomCursor from "../components/custom-cursor";
import EasterEgg from "../components/easter-egg";
import KeyboardNav from "../components/keyboard-nav";
import ReadingModeToggle from "../components/reading-mode-toggle";
import RouteAnnouncer from "../components/route-announcer";
import XolotlWitnessMessage from "../components/xolotl-witness";
import SoundDesign from "../components/sound-design";
import TiltCards from "../components/tilt-cards";
import Header from "../components/header";
import NahualIntro from "../components/nahual-intro";
import SkipNav from "../components/skip-nav";
import SmoothScroll from "../components/smooth-scroll";
import { formatAztecYear } from "../../lib/aztec-calendar";
import { renderWithNahuatl } from "../../lib/nahuatl";
import { ReadingModeProvider } from "../../lib/reading-mode-context";
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
  AUTHOR_SITE,
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
    // openGraph.images pointe explicitement vers /[locale]/opengraph-image.png
    // (genere par Next depuis opengraph-image.tsx). Explicite plutot que
    // scan implicite pour LinkedIn/Discord/Twitter qui parsent parfois mal.
    openGraph: {
      type: "website",
      url,
      siteName: SITE_NAME,
      title,
      description,
      locale: locale === "fr" ? "fr_FR" : locale === "en" ? "en_US" : "es_MX",
      alternateLocale: locales.filter((l) => l !== locale).map((l) => (l === "fr" ? "fr_FR" : l === "en" ? "en_US" : "es_MX")),
      images: [
        {
          url: `/${locale}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} — ${title}`,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/${locale}/opengraph-image`],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    },
    icons: {
      icon: [{ url: "/img/mini-logo.svg", type: "image/svg+xml" }],
    },
    manifest: "/manifest.webmanifest",
    // Site verification (29/08 SEO pass v2). Tokens fournis via env
    // Netlify — inutile de commiter. GSC/Bing acceptent aussi la
    // methode DNS TXT, ces meta sont un fallback simple.
    verification: {
      google: process.env.NEXT_PUBLIC_GSC_VERIFICATION,
      other: {
        "msvalidate.01": process.env.NEXT_PUBLIC_BING_VERIFICATION ?? "",
        "yandex-verification": process.env.NEXT_PUBLIC_YANDEX_VERIFICATION ?? "",
      },
    },
    // theme-color obsidienne aligne l'UI chrome mobile (barre URL) sur la
    // palette du site — signal marque, evite le blanc par defaut qui casse
    // l'immersion premiere seconde apres load.
    other: {
      "theme-color": "#0a0710",
      "color-scheme": "dark",
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
      "@id": `${SITE_URL}/#person`,
      name: AUTHOR_NAME,
      url: SITE_URL,
      mainEntityOfPage: `${SITE_URL}/${locale}`,
      email: `mailto:${AUTHOR_EMAIL}`,
      jobTitle: "Frontend Developer · Creative Developer · RGAA Auditor",
      sameAs: [AUTHOR_LINKEDIN, AUTHOR_GITHUB, AUTHOR_SITE],
      knowsAbout: ["Accessibility", "RGAA", "WCAG", "React", "Next.js", "React Three Fiber", "TypeScript", "WebGL"],
      worksFor: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
      nationality: { "@type": "Country", name: "France" },
      workLocation: { "@type": "Place", name: "Lyon, France" },
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
        <link rel="icon" href="/img/mini-logo.svg" type="image/svg+xml" />
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
      {/* suppressHydrationWarning : extensions browser (ColorZilla,
          Grammarly, etc.) injectent des attributs sur body avant
          l'hydration React. Sans ce flag, react-dev throw warning
          "attributes didn't match" pour cz-shortcut-listen et co. */}
      <body
        className={`${geistSans.variable} ${geistMono.variable} nahual-lab-reveal`}
        suppressHydrationWarning
      >
        {/* Provider transition cardinale "cerf mène" (28/08) — expose
            transitionDirection + progressRef aux consommateurs scène
            3D (StagModel head-look override, OrbitCamera burst
            orbit) et l'API startTransition à CardinalLink. Persiste
            au niveau layout (survit aux navigations SPA), sinon la
            transition serait cassée par le mount de la nouvelle page
            avant que le burst finisse. */}
        <ReadingModeProvider>
        <SceneRefsProvider>
        <CardinalTransitionProvider>
          {/* Skip nav a11y (28/08 task #49) — premier element focusable,
              premier tab depuis top = "aller au contenu principal".
              Sr-only par defaut, visible au focus. */}
          <SkipNav label={dict.common.skipNav} />
          {/* Route announcer SPA (29/08 chantier a11y) — annonce le
              titre de chaque nouvelle page dans une region aria-live
              sr-only. NVDA/JAWS/VoiceOver le lisent au router.push
              sans que l'utilisateur SR ait a reparcourir la page. */}
          <RouteAnnouncer />
          {/* Cardinal announcer (29/08 chantier a11y "SR enrichi") —
              couche narrative mytho au-dessus du RouteAnnouncer :
              annonce le nom nahuatl + role du gardien de la
              direction cible a chaque changement cardinal. */}
          <CardinalAnnouncer dict={dict.common.cardinalAnnouncement} />
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
          {/* Footer exhaustif (28/08 retour Sylvain) — 4 colonnes :
              Navigation, Ressources, Légal, Contact. Bottom row : ©
              + baseline localisée. */}
          <footer className="siteFooter">
            <div className="footerCols">
              <div className="footerCol">
                <h3>{dict.common.footer.navigation}</h3>
                <ul>
                  <li><a href={`/${locale}`} className="footerLink">{dict.common.nav.home}</a></li>
                  <li><a href={getPath(locale, "memoire")} className="footerLink">{dict.common.nav.memoire}</a></li>
                  <li><a href={getPath(locale, "services")} className="footerLink">{dict.common.nav.services}</a></li>
                  <li><a href={getPath(locale, "projets")} className="footerLink">{dict.common.nav.projects}</a></li>
                  <li><a href={getPath(locale, "contact")} className="footerLink">{dict.common.nav.contact}</a></li>
                </ul>
              </div>
              <div className="footerCol">
                <h3>{dict.common.footer.resources}</h3>
                <ul>
                  <li><a href={getPath(locale, "codex")} className="footerLink">{dict.common.nav.codex}</a></li>
                  <li><a href={getPath(locale, "credits")} className="footerLink">{dict.common.footer.credits}</a></li>
                  <li><a href={getPath(locale, "planDuSite")} className="footerLink">{dict.common.footer.planDuSite}</a></li>
                </ul>
              </div>
              <div className="footerCol">
                <h3>{dict.common.footer.legal}</h3>
                <ul>
                  <li><a href={getPath(locale, "mentionsLegales")} className="footerLink">{dict.common.footer.mentionsLegales}</a></li>
                  <li><a href={getPath(locale, "accessibilite")} className="footerLink">{dict.common.footer.accessibilite}</a></li>
                  <li><a href={getPath(locale, "confidentialite")} className="footerLink">{dict.common.footer.confidentialite}</a></li>
                </ul>
              </div>
              <div className="footerCol">
                <h3>{dict.common.footer.contactCol}</h3>
                <ul>
                  <li>
                    <a
                      href={AUTHOR_LINKEDIN}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="footerLink"
                      aria-label={`${dict.common.footer.linkedin} de ${AUTHOR_NAME} (${locale === "fr" ? "nouvelle fenêtre" : locale === "en" ? "new window" : "nueva ventana"})`}
                    >
                      {dict.common.footer.linkedin}
                    </a>
                  </li>
                  <li>
                    <a
                      href={AUTHOR_GITHUB}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="footerLink"
                      aria-label={`${dict.common.footer.github} de ${AUTHOR_NAME} (${locale === "fr" ? "nouvelle fenêtre" : locale === "en" ? "new window" : "nueva ventana"})`}
                    >
                      {dict.common.footer.github}
                    </a>
                  </li>
                  <li>
                    <a
                      href={`mailto:${AUTHOR_EMAIL}`}
                      className="footerLink"
                      aria-label={`${dict.common.footer.email} : ${AUTHOR_EMAIL}`}
                    >
                      {dict.common.footer.email}
                    </a>
                  </li>
                </ul>
              </div>
            </div>
            {/* XolotlWitnessMessage (29/08 easter egg) — apparait
                seulement si user a vu Xolotl passer + n'a pas encore
                visite le Codex depuis. Positionne entre les cols et
                le copyright (retour Sylvain 29/08 : plus visible
                qu'apres la ligne credit). Renvoi discret italique. */}
            <XolotlWitnessMessage message={dict.common.xolotlSeen} locale={locale} />
            <div className="footerBottom">
              {/* Signature date rituelle (29/08) — annee Gregorienne +
                  porteur Xiuhpohualli nahua (convention Rafael Tena,
                  1519 = 2 Acatl). 2026 = 2 Tochtli · Lapin. Cycle
                  complet 52 ans (siecle nahua). Discret, en italique
                  entre parentheses. Le nom Tochtli est wrappe
                  lang=nah automatiquement via renderWithNahuatl. */}
              © {new Date().getFullYear()} NAHUAL Studio · Sylvain Maurier
              <span className="footerAztec"> · {renderWithNahuatl(formatAztecYear(new Date().getFullYear(), locale))}</span>
            </div>
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
            phrases={dict.lab.loadingPhrases}
            label={dict.lab.loadingLabel}
          />
          {/* Intro cinématique retiree 28/08 (retour Sylvain "gros
              encadré qui charge" — trop lourd au premier load).
              Composant existe encore, remonte-le si besoin.
              <NahualIntro locale={locale} /> */}
          {/* Curseur custom (28/08 task #47) — point cardinal + ring
              qui suit, morph cardinal au survol des liens nav
              (data-cardinal-direction), magnetic attraction sur CTAs
              (data-magnetic). Actif uniquement hover:hover + pointer:fine. */}
          <CustomCursor />
          {/* Easter egg (28/08 task #56) — tape "nahual" au clavier
              n'importe ou sur le site (hors input), reveal toast
              discret 5s. Signature "site vivant" cachee. */}
          <EasterEgg locale={locale} />
          {/* Sound design cardinal (28/08 task #46) — Web Audio API
              generatif, 0 fichier externe. Toggle mute persist,
              default mute. Ambient drone + chime cardinal par click
              + whoosh transition. */}
          <SoundDesign label={dict.common.sound} />
          {/* Mode recit accessible opt-in (29/08 chantier a11y) —
              bouton bas gauche, symetrique du bouton son. Toggle
              persist localStorage via ReadingModeProvider. Cache le
              canvas 3D + retire les anims + centre le contenu pour
              une lecture calme. */}
          <ReadingModeToggle label={dict.common.readingMode} />
          {/* Nav clavier flèches (28/08 task #58) — ArrowLeft/Right
              naviguent entre pages dans l'ordre menu (Accueil premier,
              rotation cardinale). Trigger transitions VT comme click. */}
          <KeyboardNav />
          {/* Hover tilt 3D micro-interaction (28/08 task #65) — sur
              hover projectCase/serviceCard, tilt subtil perspective
              6° selon position souris. Reset au leave. */}
          <TiltCards />
          {/* Mask reveal curseur (28/08 boite outil #4) — hover
              projectCase/serviceCard : radial gradient direction
              suit curseur, signature "regarde derriere le voile". */}
          <MaskReveal />
          {/* CursorTrail retire 29/08 (retour Sylvain "a quoi sert-il
              ?"). Trace jade opacity 0.08 largeur 1px etait quasi
              imperceptible sur canvas 3D noir dynamique + mix-blend
              screen, ne se justifiait pas visuellement. Composant
              supprime, canvas en moins = -1 rAF = petit gain perf. */}
          {/* Cardinal compass (28/08 retour Sylvain) — indicateur bas
              droite croix 5 points, direction courante highlight
              couleur cardinale, cliquable nav rapide. */}
          <CardinalCompass locale={locale} />
          {/* Hover sync (28/08 retour Sylvain) — poste
              body[data-cardinal-hover=X] au pointerover sur nav ou
              compass, permet pulse cross-widget des points cardinaux. */}
          <CardinalHoverSync />
        </CardinalTransitionProvider>
        </SceneRefsProvider>
        </ReadingModeProvider>
      </body>
    </html>
  );
}
