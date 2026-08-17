import Link from "next/link";

export default function Services() {
  return (
    <main>
      <div className="contentPage">
        <h1>Services</h1>
        <p>
          Nahual, c&apos;est le studio de création de Sylvain Maurier — développeur
          frontend senior spécialisé en accessibilité numérique. Deux offres, un
          seul objectif : des sites qui marchent, pour tout le monde.
        </p>

        <div className="serviceCard">
          <h2>Création de site web</h2>
          <p>
            Sites vitrines, applications sur-mesure : développement frontend et
            fullstack (React, Next.js, Vue/Nuxt), design system, performance.
            Du cahier des charges à la mise en ligne.
          </p>
        </div>

        <div className="serviceCard">
          <h2>Audit accessibilité RGAA</h2>
          <p>
            Audit de conformité RGAA/WCAG avec recommandations directement
            implémentables — je livre le code de correction, pas seulement un
            rapport.
          </p>
          <p className="note">
            Spécialisation en cours de certification (examen access42, 23 octobre
            2026) — pas encore obtenue.
          </p>
        </div>

        <Link href="/contact" className="ctaButton">Discutons de votre projet →</Link>
      </div>
    </main>
  );
}
