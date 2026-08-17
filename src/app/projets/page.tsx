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
