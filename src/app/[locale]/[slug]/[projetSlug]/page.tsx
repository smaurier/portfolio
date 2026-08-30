import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import EchoScenePage from "../../../components/stag-scene/echo-scene-page";
import type { DirectionKey } from "../../../components/stag-scene/direction-colors";
import { getDictionary, isLocale, locales, type Locale, type Dictionary } from "../../../../dictionaries";
import { slugs, getPageKeyFromSlug } from "../../../../lib/routes";
import { SITE_URL, SITE_NAME, AUTHOR_NAME } from "../../../../lib/seo";

// Route nested case study projet (29/08 task #73). Structure :
// /[locale]/projets/[projetSlug] (avec slugs localises services/
// projects/proyectos). Slug parent doit etre "projets" (fr) /
// "projects" (en) / "proyectos" (es), sinon notFound.
// Direction : turquoise (Sud, meme que page projets liste).

const PROJET_KEYS = ["nuada", "kleyfrance", "synapse"] as const;
type ProjetKey = (typeof PROJET_KEYS)[number];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string; projetSlug: string }>;
}): Promise<Metadata> {
  const { locale: raw, slug, projetSlug } = await params;
  if (!isLocale(raw)) return {};
  const locale: Locale = raw;
  const parentKey = getPageKeyFromSlug(locale, slug);
  if (parentKey !== "projets") return {};
  if (!PROJET_KEYS.includes(projetSlug as ProjetKey)) return {};
  const key = projetSlug as ProjetKey;
  const dict = getDictionary(locale);
  const projet = dict.projets[key];
  const url = `${SITE_URL}/${locale}/${slug}/${projetSlug}`;
  const title = `${projet.title} · ${SITE_NAME}`;
  const description = projet.detail.hero;
  const languages = Object.fromEntries(
    locales.map((l) => [l, `/${l}/${slugs.projets[l]}/${projetSlug}`]),
  );
  return {
    title,
    description,
    alternates: { canonical: url, languages },
    openGraph: {
      type: "article",
      url,
      siteName: SITE_NAME,
      title,
      description,
      locale: locale === "fr" ? "fr_FR" : locale === "en" ? "en_US" : "es_MX",
      images: [{ url: `/${locale}/opengraph-image`, width: 1200, height: 630, type: "image/png" }],
    },
    twitter: { card: "summary_large_image", title, description, images: [`/${locale}/opengraph-image`] },
    authors: [{ name: AUTHOR_NAME }],
  };
}

export function generateStaticParams() {
  const params: { locale: string; slug: string; projetSlug: string }[] = [];
  for (const locale of locales) {
    const projetsSlug = slugs.projets[locale];
    for (const projetKey of PROJET_KEYS) {
      params.push({ locale, slug: projetsSlug, projetSlug: projetKey });
    }
  }
  return params;
}

function ProjetDetailContent({ projet, newWindowLabel, backHref }: { projet: Dictionary["projets"]["nuada"]; newWindowLabel: string; backHref: string }) {
  return (
    <div className="contentPage projetDetailPage">
      <p className="projetDetailBack">
        <Link href={backHref} className="footerLink">{projet.detail.backCta}</Link>
      </p>
      <h1>{projet.title}</h1>
      <p className="projetDetailHero">{projet.detail.hero}</p>
      {projet.detail.narrative.map((section, i) => (
        <section key={i} className="projetDetailSection">
          <h2>{section.title}</h2>
          <p>{section.text}</p>
        </section>
      ))}
      <p className="projetDetailCta">
        <a href={
          projet.slug === "nuada" ? "https://nuada-audit.netlify.app" :
          projet.slug === "kleyfrance" ? "https://kleyfrance.fr/" :
          "https://github.com/smaurier/claude-synapse"
        } target="_blank" rel="noopener noreferrer" className="ctaButton">
          {projet.cta}
          <span className="sr-only"> ({newWindowLabel})</span>
        </a>
      </p>
    </div>
  );
}

export default async function LocalizedProjetDetail({
  params,
}: {
  params: Promise<{ locale: string; slug: string; projetSlug: string }>;
}) {
  const { locale: rawLocale, slug, projetSlug } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  // Verifie que slug parent est bien "projets" localise
  const parentKey = getPageKeyFromSlug(locale, slug);
  if (parentKey !== "projets") notFound();

  // Verifie que projetSlug est un projet connu
  if (!PROJET_KEYS.includes(projetSlug as ProjetKey)) notFound();
  const key = projetSlug as ProjetKey;

  const fullDict = getDictionary(locale);
  const projet = fullDict.projets[key];

  const direction: DirectionKey = "turquoise";

  // JSON-LD (29/08 SEO pass v2) — BreadcrumbList aide Google a afficher
  // le fil d'Ariane dans les SERP. CreativeWork/Article decrit le case
  // study pour Rich Results + AI SERPs (ChatGPT/Perplexity).
  const detailUrl = `${SITE_URL}/${locale}/${slug}/${projetSlug}`;
  const projetsUrl = `${SITE_URL}/${locale}/${slug}`;
  const homeUrl = `${SITE_URL}/${locale}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: homeUrl },
        { "@type": "ListItem", position: 2, name: fullDict.common.nav.projects, item: projetsUrl },
        { "@type": "ListItem", position: 3, name: projet.title, item: detailUrl },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "CreativeWork",
      name: projet.title,
      url: detailUrl,
      description: projet.detail.hero,
      inLanguage: locale,
      author: { "@type": "Person", name: AUTHOR_NAME },
      creator: { "@type": "Person", name: AUTHOR_NAME },
      about: projet.text,
      keywords: projet.stack,
    },
  ];

  return (
    <EchoScenePage
      directionKey={direction}
      locale={locale}
      sceneDescription={fullDict.common.sceneDescriptions[direction]}
    >
      {jsonLd.map((entry, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(entry) }}
        />
      ))}
      <ProjetDetailContent projet={projet} newWindowLabel={fullDict.common.newWindow} backHref={`/${locale}/${slug}`} />
    </EchoScenePage>
  );
}
