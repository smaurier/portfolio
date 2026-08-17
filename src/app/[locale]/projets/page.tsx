import { getDictionary } from "../../../dictionaries";

export default function Projets({ params }: { params: { locale: string } }) {
  const dict = getDictionary(params.locale).projets;

  return (
    <main>
      <div className="contentPage">
        <h1>{dict.title}</h1>
        <p>{dict.intro}</p>

        <div className="serviceCard">
          <h2>{dict.nuada.title}</h2>
          <p>{dict.nuada.text}</p>
          <a
            href="https://nuada-audit.netlify.app"
            target="_blank"
            rel="noopener noreferrer"
            className="ctaButton"
          >
            {dict.nuada.cta}
          </a>
        </div>

        <div className="serviceCard">
          <h2>{dict.kleyfrance.title}</h2>
          <p>{dict.kleyfrance.text}</p>
          <a
            href="https://kleyfrance.fr/"
            target="_blank"
            rel="noopener noreferrer"
            className="ctaButton"
          >
            {dict.kleyfrance.cta}
          </a>
        </div>

        <div className="serviceCard">
          <h2>{dict.synapse.title}</h2>
          <p>{dict.synapse.text}</p>
          <a
            href="https://github.com/smaurier/claude-synapse"
            target="_blank"
            rel="noopener noreferrer"
            className="ctaButton"
          >
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
