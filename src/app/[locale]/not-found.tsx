import Link from "next/link";

/**
 * LA 404 DANS LE MONDE (13/09, X14 de l'audit). Avant : la page blanche
 * par defaut de Next, sans bandeau ni scene. Ici la page vit dans le
 * layout de la langue (bandeau, scene persistante derriere, pied de page),
 * et dit la chose en trois langues : `not-found` ne recoit pas la langue
 * de la route, et une 404 est justement une route qu'on n'a pas su lire.
 * Les cinq directions sont offertes en retour : c'est la boussole du site.
 */
const LIGNES = [
  { lang: "fr", titre: "Ce chemin n'existe pas", texte: "Aucune des cinq directions ne mene ici. Le cerf t'attend au foyer.", retour: "Revenir au Centre", href: "/fr" },
  { lang: "en", titre: "This path does not exist", texte: "None of the five directions leads here. The stag waits for you at the hearth.", retour: "Back to the Centre", href: "/en" },
  { lang: "es", titre: "Este camino no existe", texte: "Ninguna de las cinco direcciones lleva aqui. El venado te espera en el hogar.", retour: "Volver al Centro", href: "/es" },
] as const;

export default function NotFound() {
  return (
    <main id="main" className="contentPage" tabIndex={-1} data-not-found="">
      <p className="notFoundCode" aria-hidden="true">404</p>
      {LIGNES.map((l) => (
        <section key={l.lang} lang={l.lang} className="notFoundLang">
          <h1>{l.titre}</h1>
          <p>{l.texte}</p>
          <p>
            <Link href={l.href} className="notFoundLink">
              {l.retour}
            </Link>
          </p>
        </section>
      ))}
    </main>
  );
}
