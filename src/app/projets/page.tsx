export default function Projets() {
  return (
    <main>
      <div className="contentPage">
        <h1>Projets</h1>
        <p>Un aperçu de ce que je construis.</p>

        <div className="serviceCard">
          <h2>Nuada — audit accessibilité RGAA</h2>
          <p>
            Site vitrine et moteur d&apos;audit RGAA. Conformité, SEO
            multilingue, positionnement &laquo;&nbsp;l&apos;auditeur qui code la
            solution&nbsp;&raquo;.
          </p>
          <a
            href="https://nuada-audit.netlify.app"
            target="_blank"
            rel="noopener noreferrer"
            className="ctaButton"
          >
            Voir le site →
          </a>
        </div>

        <div className="serviceCard">
          <h2>KleyFrance</h2>
          <p>
            Logo et direction artistique du site (WordPress) de KleyFrance,
            fabricant de solutions de levage et de manutention sur-mesure pour
            les secteurs pétrolier, océanographique et militaire — réalisé
            vers 2015.
          </p>
          <a
            href="https://kleyfrance.fr/"
            target="_blank"
            rel="noopener noreferrer"
            className="ctaButton"
          >
            Voir le site →
          </a>
        </div>

        <div className="serviceCard">
          <h2>Synapse</h2>
          <p>
            Plugin open-source pour Claude Code : relie la mémoire d&apos;un
            assistant IA entre plusieurs machines et projets au lieu de la
            dupliquer. Outil pour développeurs, testé (283 tests, CI verte).
          </p>
          <a
            href="https://github.com/smaurier/claude-synapse"
            target="_blank"
            rel="noopener noreferrer"
            className="ctaButton"
          >
            Voir le code →
          </a>
        </div>

        <p>
          D&apos;autres projets sur{" "}
          <a href="https://github.com/smaurier" target="_blank" rel="noopener noreferrer">
            mon GitHub
          </a>
          .
        </p>
      </div>
    </main>
  );
}
