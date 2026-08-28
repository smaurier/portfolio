import { notFound } from "next/navigation";
import Link from "next/link";
import ObfuscatedEmail from "../../components/obfuscated-email";
import EchoScenePage from "../../components/stag-scene/echo-scene-page";
import type { DirectionKey } from "../../components/stag-scene/direction-colors";
import { getDictionary, isLocale, locales, type Locale, type Dictionary } from "../../../dictionaries";
import { pageKeys, slugs, getPageKeyFromSlug, type PageKey, getPath } from "../../../lib/routes";

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

function ProjetsPage({ dict }: { dict: Dictionary["projets"] }) {
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
      <a href={href} target="_blank" rel="noopener noreferrer" className="ctaButton">
        {cta}
      </a>
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

function MemoirePage({ dict }: { dict: Dictionary["memoire"] }) {
  return (
    <div className="contentPage">
      <h1>{dict.title}</h1>
      <p>{dict.intro}</p>

      {dict.entries.map((entry, i) => (
        <div className="serviceCard" key={entry.title}>
          <span className="cardIndex" aria-hidden>{toRoman(i + 1)}</span>
          <h2>{entry.title}</h2>
          <p>{entry.text}</p>
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
      content = <ProjetsPage dict={fullDict.projets} />;
      break;
    case "contact":
      content = <ContactPage dict={fullDict.contact} showEmailLabel={fullDict.common.showEmail} />;
      break;
    case "memoire":
      content = <MemoirePage dict={fullDict.memoire} />;
      break;
  }

  return (
    <EchoScenePage directionKey={DIRECTION_BY_PAGE[key]} locale={locale}>
      {content}
    </EchoScenePage>
  );
}
