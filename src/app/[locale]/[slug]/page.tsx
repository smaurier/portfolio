import { notFound } from "next/navigation";
import Link from "next/link";
import ObfuscatedEmail from "../../components/obfuscated-email";
import { getDictionary, isLocale, locales, type Locale, type Dictionary } from "../../../dictionaries";
import { pageKeys, slugs, getPageKeyFromSlug, getPath } from "../../../lib/routes";

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    pageKeys.map((key) => ({ locale, slug: slugs[key][locale] }))
  );
}

function ServicesPage({ locale, dict }: { locale: Locale; dict: Dictionary["services"] }) {
  return (
    <main>
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
    </main>
  );
}

function ProjetsPage({ dict }: { dict: Dictionary["projets"] }) {
  return (
    <main>
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
    </main>
  );
}

function ContactPage({ dict, showEmailLabel }: { dict: Dictionary["contact"]; showEmailLabel: string }) {
  return (
    <main>
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
    </main>
  );
}

function BlogPage({ dict }: { dict: Dictionary["blog"] }) {
  return (
    <main>
      <div className="contentPage">
        <h1>{dict.title}</h1>
        <p>{dict.text}</p>
      </div>
    </main>
  );
}

export default function LocalizedPage({ params }: { params: { locale: string; slug: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;

  const key = getPageKeyFromSlug(locale, params.slug);
  if (!key) notFound();

  const fullDict = getDictionary(locale);

  switch (key) {
    case "services":
      return <ServicesPage locale={locale} dict={fullDict.services} />;
    case "projets":
      return <ProjetsPage dict={fullDict.projets} />;
    case "contact":
      return <ContactPage dict={fullDict.contact} showEmailLabel={fullDict.common.showEmail} />;
    case "blog":
      return <BlogPage dict={fullDict.blog} />;
  }
}
