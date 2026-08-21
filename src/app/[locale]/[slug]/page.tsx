import { notFound } from "next/navigation";
import Link from "next/link";
import ObfuscatedEmail from "../../components/obfuscated-email";
import EchoStag from "../../components/stag-scene/echo-stag-lazy";
import type { EchoMood } from "../../components/stag-scene/echo-stag";
import { getDictionary, isLocale, locales, type Locale, type Dictionary } from "../../../dictionaries";
import { pageKeys, slugs, getPageKeyFromSlug, getPath } from "../../../lib/routes";

// Couleurs des points cardinaux (Codex Nahual, section 03 — mêmes valeurs
// que piedra-del-sol.tsx/le Codex publié, pas réinventées ici) : or/cuivre
// (Est/Tonatiuh), turquoise (Sud/Huitzilopochtli), cendre (Ouest/
// Cihuatlampa). Une seule scène-monde (le cerf), pas trois créatures
// différentes — cf memory, décision du 20/08 après discussion sur le
// morphing : le cerf reste le cerf, seuls lumière/couleur/pose changent.
const SERVICES_MOOD: EchoMood = {
  clip: "Idle",
  rimColor: "#a9762f",
  ambientColor: "#4a3418",
  ambientIntensity: 0.9,
  directionalColor: "#f0b25c",
  directionalIntensity: 2.2,
};

const PROJETS_MOOD: EchoMood = {
  clip: "Gallop",
  rimColor: "#2c6b82",
  ambientColor: "#132c33",
  ambientIntensity: 0.85,
  directionalColor: "#5fc4e0",
  directionalIntensity: 2,
};

const CONTACT_MOOD: EchoMood = {
  clip: "Idle_Headlow",
  rimColor: "#6a6478",
  ambientColor: "#201f26",
  ambientIntensity: 0.5,
  directionalColor: "#8b86a0",
  directionalIntensity: 0.9,
};

// Nord/Mictlampa — obsidienne (itztli), pas jade (Centre) ni turquoise
// (Sud, déjà pris) : cf memory project-nahual-da, section "le centre doit
// avoir quelle couleur". Clip Idle_2, seul clip d'idle du rig encore
// inutilisé dans l'écho (Services=Idle, Projets=Gallop,
// Contact=Idle_Headlow) — évite de dupliquer le mood calme de Contact.
const MEMOIRE_MOOD: EchoMood = {
  clip: "Idle_2",
  rimColor: "#8983a8",
  ambientColor: "#100d1a",
  ambientIntensity: 0.4,
  directionalColor: "#9d97c2",
  directionalIntensity: 1.1,
};

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

        <div className="echoWrap">
          <EchoStag mood={SERVICES_MOOD} />
        </div>

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

        <div className="echoWrap">
          <EchoStag mood={PROJETS_MOOD} />
        </div>

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

        <div className="echoWrap">
          <EchoStag mood={CONTACT_MOOD} />
        </div>

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

function MemoirePage({ dict }: { dict: Dictionary["memoire"] }) {
  return (
    <main>
      <div className="contentPage">
        <h1>{dict.title}</h1>
        <p>{dict.intro}</p>

        <div className="echoWrap">
          <EchoStag mood={MEMOIRE_MOOD} />
        </div>

        {dict.entries.map((entry) => (
          <div className="serviceCard" key={entry.title}>
            <h2>{entry.title}</h2>
            <p>{entry.text}</p>
          </div>
        ))}
      </div>
    </main>
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

  switch (key) {
    case "services":
      return <ServicesPage locale={locale} dict={fullDict.services} />;
    case "projets":
      return <ProjetsPage dict={fullDict.projets} />;
    case "contact":
      return <ContactPage dict={fullDict.contact} showEmailLabel={fullDict.common.showEmail} />;
    case "memoire":
      return <MemoirePage dict={fullDict.memoire} />;
  }
}
