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

      <div className="serviceCard">
        <h2>{dict.nuada.title}</h2>
        <p>{dict.nuada.text}</p>
        <a href="https://nuada-audit.netlify.app" target="_blank" rel="noopener noreferrer" className="ctaButton">
          {dict.nuada.cta}
        </a>
      </div>

      <div className="serviceCard">
        <h2>{dict.kleyfrance.title}</h2>
        <p>{dict.kleyfrance.text}</p>
        <a href="https://kleyfrance.fr/" target="_blank" rel="noopener noreferrer" className="ctaButton">
          {dict.kleyfrance.cta}
        </a>
      </div>

      <div className="serviceCard">
        <h2>{dict.synapse.title}</h2>
        <p>{dict.synapse.text}</p>
        <a href="https://github.com/smaurier/claude-synapse" target="_blank" rel="noopener noreferrer" className="ctaButton">
          {dict.synapse.cta}
        </a>
      </div>

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

function MemoirePage({ dict }: { dict: Dictionary["memoire"] }) {
  return (
    <div className="contentPage">
      <h1>{dict.title}</h1>
      <p>{dict.intro}</p>

      {dict.entries.map((entry) => (
        <div className="serviceCard" key={entry.title}>
          <h2>{entry.title}</h2>
          <p>{entry.text}</p>
        </div>
      ))}
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
    <EchoScenePage directionKey={DIRECTION_BY_PAGE[key]}>
      {content}
    </EchoScenePage>
  );
}
