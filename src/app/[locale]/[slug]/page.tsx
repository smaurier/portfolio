import { notFound } from "next/navigation";
import Link from "next/link";
import ObfuscatedEmail from "../../components/obfuscated-email";
import EchoScenePage from "../../components/stag-scene/echo-scene-page";
import type { DirectionKey } from "../../components/stag-scene/direction-colors";
import { getDictionary, isLocale, locales, type Locale, type Dictionary } from "../../../dictionaries";
import { pageKeys, slugs, getPageKeyFromSlug, type PageKey, getPath } from "../../../lib/routes";
import { renderWithNahuatl } from "../../../lib/nahuatl";
import { SITE_URL, SITE_NAME } from "../../../lib/seo";

// Depuis le 25/08 (cf memory project-nahual-da) : plus de fenêtre écho
// 320×320 par page — la scène 3D plein écran de la home est généralisée
// à Services/Projets/Contact/Mémoire via EchoScenePage. Depuis le
// 25/08 soir, chaque page porte sa direction (Codex Nahual section
// 03) — la couleur cible du fog + rim + nav emphasis change par page
// (Est/doré, Sud/turquoise, Ouest/cendre, Nord/obsidienne). Les
// enrichissements plus profonds (pose du cerf, densité de flore,
// ambiance) viendront quand nous les coderons (YAGNI).
const DIRECTION_BY_PAGE: Record<PageKey, DirectionKey> = {
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

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    pageKeys.map((key) => ({ locale, slug: slugs[key][locale] }))
  );
}

function ServicesPage({ locale, dict }: { locale: Locale; dict: Dictionary["services"] }) {
  return (
    <div className="contentPage">
      <h1>{dict.title}</h1>
      <p>{dict.intro}</p>

      <div className="serviceCard">
        <h2>{dict.webCard.title}</h2>
        <p>{dict.webCard.text}</p>
      </div>

      <div className="serviceCard">
        <h2>{dict.auditCard.title}</h2>
        <p>{dict.auditCard.text}</p>
        <p className="note">{dict.auditCard.note}</p>
      </div>

      <Link href={getPath(locale, "contact")} className="ctaButton">{dict.cta}</Link>
    </div>
  );
}

function ProjetsPage({ dict, locale }: { dict: Dictionary["projets"]; locale: Locale }) {
  const projetsSlug = slugs.projets[locale];
  return (
    <div className="contentPage">
      <h1>{dict.title}</h1>
      <p>{dict.intro}</p>

      <ProjectCase
        title={dict.nuada.title}
        text={dict.nuada.text}
        context={dict.nuada.context}
        role={dict.nuada.role}
        stack={dict.nuada.stack}
        highlights={dict.nuada.highlights}
        outcome={dict.nuada.outcome}
        labels={dict.labels}
        href="https://nuada-audit.netlify.app"
        cta={dict.nuada.cta}
        detailHref={`/${locale}/${projetsSlug}/nuada`}
        detailCta={dict.nuada.detail.readMoreCta}
      />

      <ProjectCase
        title={dict.kleyfrance.title}
        text={dict.kleyfrance.text}
        context={dict.kleyfrance.context}
        role={dict.kleyfrance.role}
        stack={dict.kleyfrance.stack}
        highlights={dict.kleyfrance.highlights}
        outcome={dict.kleyfrance.outcome}
        labels={dict.labels}
        href="https://kleyfrance.fr/"
        cta={dict.kleyfrance.cta}
        detailHref={`/${locale}/${projetsSlug}/kleyfrance`}
        detailCta={dict.kleyfrance.detail.readMoreCta}
      />

      <ProjectCase
        title={dict.synapse.title}
        text={dict.synapse.text}
        context={dict.synapse.context}
        role={dict.synapse.role}
        stack={dict.synapse.stack}
        highlights={dict.synapse.highlights}
        outcome={dict.synapse.outcome}
        labels={dict.labels}
        href="https://github.com/smaurier/claude-synapse"
        cta={dict.synapse.cta}
        detailHref={`/${locale}/${projetsSlug}/synapse`}
        detailCta={dict.synapse.detail.readMoreCta}
      />

      <p>
        {dict.moreBefore}{" "}
        <a href="https://github.com/smaurier" target="_blank" rel="noopener noreferrer">
          {dict.moreLinkText}
        </a>
        {dict.moreAfter}
      </p>
    </div>
  );
}

/**
 * Case study card (28/08 task #51 audit SOTY). Passe des 3 lignes stub
 * a un vrai case study : contexte + role + stack + choix marquants +
 * resultat + CTA. Signature "portfolio pro" (vs galerie captures).
 */
function ProjectCase({
  title,
  text,
  context,
  role,
  stack,
  highlights,
  outcome,
  labels,
  href,
  cta,
  detailHref,
  detailCta,
}: {
  title: string;
  text: string;
  context: string;
  role: string;
  stack: string;
  highlights: string;
  outcome: string;
  labels: { context: string; role: string; stack: string; highlights: string; outcome: string };
  href: string;
  cta: string;
  detailHref?: string;
  detailCta?: string;
}) {
  return (
    <article className="projectCase">
      <h2>{title}</h2>
      <p className="projectCaseText">{text}</p>
      <dl className="projectCaseDetails">
        <dt>{labels.context}</dt>
        <dd>{context}</dd>
        <dt>{labels.role}</dt>
        <dd>{role}</dd>
        <dt>{labels.stack}</dt>
        <dd>{stack}</dd>
        <dt>{labels.highlights}</dt>
        <dd>{highlights}</dd>
        <dt>{labels.outcome}</dt>
        <dd>{outcome}</dd>
      </dl>
      <div className="projectCaseCtas">
        {detailHref && detailCta && (
          <a href={detailHref} className="ctaButton ctaButtonPrimary">
            {detailCta}
          </a>
        )}
        <a href={href} target="_blank" rel="noopener noreferrer" className="ctaButton">
          {cta}
        </a>
      </div>
    </article>
  );
}

function ContactPage({ dict, showEmailLabel }: { dict: Dictionary["contact"]; showEmailLabel: string }) {
  return (
    <div className="contentPage">
      <h1>{dict.title}</h1>
      <p>{dict.intro}</p>

      <ObfuscatedEmail className="ctaButton" placeholder={showEmailLabel} />
      <p className="note">{dict.note}</p>
      <p>
        {dict.linkedinBefore}{" "}
        <a href="https://www.linkedin.com/in/smaurier/" target="_blank" rel="noopener noreferrer">
          {dict.linkedinLinkText}
        </a>
        {dict.linkedinAfter}
      </p>
    </div>
  );
}

// Chiffres romains — numérotation nahua codex sur les chapitres
// memoire (27/08 Codex S4). Signature "manuscrit numéroté" cohérente
// avec l'ontologie codex nahua (les codex historiques numéraient leurs
// pages en glyphes). Limité à Memoire (7 chapitres) — sur Services
// (2 offres) ou Projets (3 cases) ça ferait pédant.
function toRoman(n: number): string {
  const values = [10, 9, 5, 4, 1];
  const symbols = ["X", "IX", "V", "IV", "I"];
  let result = "";
  for (let i = 0; i < values.length; i++) {
    while (n >= values[i]) {
      result += symbols[i];
      n -= values[i];
    }
  }
  return result;
}

/**
 * Codex page (28/08 task #52 audit SOTY). Hub cosmogonique + about
 * incarne. Fusion en une seule page pour ne pas dedoubler About et
 * Codex — le cœur nahua etant justement l'unite entre la cosmologie
 * et la personne qui l'ecrit. Sections : cosmos (5 directions) +
 * totem (cerf Mazatl) + human (Sylvain) + family (Elda, Léopoldine,
 * Alondra, cadre franco-mexicain) + respect (garde-fou appropriation)
 * + refs (inspirations, remerciements).
 */
function CodexPage({ dict }: { dict: Dictionary["codex"] }) {
  return (
    <div className="contentPage codexPage">
      <h1>{renderWithNahuatl(dict.title)}</h1>
      <p>{renderWithNahuatl(dict.intro)}</p>

      <section className="codexSection">
        <h2>{renderWithNahuatl(dict.cosmos.title)}</h2>
        <p>{renderWithNahuatl(dict.cosmos.text)}</p>
        <ul className="codexDirections">
          {dict.cosmos.directions.map((d) => (
            <li key={d.name}>
              <strong>{renderWithNahuatl(d.name)}</strong>
              <span>{renderWithNahuatl(d.text)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="codexSection">
        <h2>{renderWithNahuatl(dict.totem.title)}</h2>
        <p>{renderWithNahuatl(dict.totem.text)}</p>
      </section>

      <section className="codexSection">
        <h2>{renderWithNahuatl(dict.human.title)}</h2>
        <p>{renderWithNahuatl(dict.human.text)}</p>
      </section>

      <section className="codexSection">
        <h2>{renderWithNahuatl(dict.family.title)}</h2>
        <p>{renderWithNahuatl(dict.family.text)}</p>
      </section>

      <section className="codexSection">
        <h2>{renderWithNahuatl(dict.respect.title)}</h2>
        <p>{renderWithNahuatl(dict.respect.text)}</p>
      </section>

      <section className="codexSection">
        <h2>{renderWithNahuatl(dict.refs.title)}</h2>
        <p>{renderWithNahuatl(dict.refs.text)}</p>
      </section>
    </div>
  );
}

/**
 * Legal page generic (28/08 retour Sylvain). Rend title + intro +
 * sections, chaque section a un titre + texte OU liens (plan du site).
 * Meme layout que Codex, sobre.
 */
type LegalSection =
  | { title: string; text: string }
  | { title: string; links: { label: string; href: string }[] };

function LegalPage({
  dict,
}: {
  dict: { title: string; intro: string; sections: LegalSection[] };
}) {
  return (
    <div className="contentPage codexPage">
      <h1>{dict.title}</h1>
      <p>{dict.intro}</p>
      {dict.sections.map((section, i) => (
        <section key={i} className="codexSection">
          <h2>{section.title}</h2>
          {"text" in section && <p>{section.text}</p>}
          {"links" in section && (
            <ul className="codexDirections">
              {section.links.map((l) => (
                <li key={l.href}>
                  <a href={l.href}>{l.label}</a>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

function MemoirePage({ dict }: { dict: Dictionary["memoire"] }) {
  return (
    <div className="contentPage">
      <h1>{renderWithNahuatl(dict.title)}</h1>
      <p>{renderWithNahuatl(dict.intro)}</p>

      {dict.entries.map((entry, i) => (
        <div className="serviceCard" key={entry.title}>
          <span className="cardIndex" aria-hidden>{toRoman(i + 1)}</span>
          <h2>{renderWithNahuatl(entry.title)}</h2>
          <p>{renderWithNahuatl(entry.text)}</p>
        </div>
      ))}

      {/* Crédit respectueux motifs cardinaux (28/08 option A) — l'ajout
        * de motifs iconographiques mésoaméricains sur le site nécessite
        * une mention explicite : évocation stylisée, pas reproduction,
        * hommage familial. Prévention appropriation culturelle. */}
      <p className="creditNote">{dict.creditNote}</p>
    </div>
  );
}

export default async function LocalizedPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const key = getPageKeyFromSlug(locale, slug);
  if (!key) notFound();

  const fullDict = getDictionary(locale);

  let content: React.ReactNode;
  switch (key) {
    case "services":
      content = <ServicesPage locale={locale} dict={fullDict.services} />;
      break;
    case "projets":
      content = <ProjetsPage dict={fullDict.projets} locale={locale} />;
      break;
    case "contact":
      content = <ContactPage dict={fullDict.contact} showEmailLabel={fullDict.common.showEmail} />;
      break;
    case "memoire":
      content = <MemoirePage dict={fullDict.memoire} />;
      break;
    case "codex":
      content = <CodexPage dict={fullDict.codex} />;
      break;
    case "mentionsLegales":
      content = <LegalPage dict={fullDict.mentionsLegales} />;
      break;
    case "planDuSite":
      content = <LegalPage dict={fullDict.planDuSite} />;
      break;
    case "accessibilite":
      content = <LegalPage dict={fullDict.accessibilite} />;
      break;
    case "confidentialite":
      content = <LegalPage dict={fullDict.confidentialite} />;
      break;
    case "credits":
      content = <LegalPage dict={fullDict.credits} />;
      break;
  }

  // BreadcrumbList JSON-LD (29/08 SEO pass v2) — aide Google a afficher
  // le fil d'Ariane dans les SERP, meme sur les pages sub.
  const pageUrl = `${SITE_URL}/${locale}/${slug}`;
  const homeUrl = `${SITE_URL}/${locale}`;
  const navLabel =
    key === "services" ? fullDict.common.nav.services :
    key === "projets" ? fullDict.common.nav.projects :
    key === "contact" ? fullDict.common.nav.contact :
    key === "memoire" ? fullDict.common.nav.memoire :
    key === "codex" ? fullDict.common.nav.codex :
    fullDict[key].title;
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: homeUrl },
      { "@type": "ListItem", position: 2, name: navLabel, item: pageUrl },
    ],
  };

  const directionKey = DIRECTION_BY_PAGE[key];
  return (
    <EchoScenePage
      directionKey={directionKey}
      locale={locale}
      sceneDescription={fullDict.common.sceneDescriptions[directionKey]}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {content}
    </EchoScenePage>
  );
}
