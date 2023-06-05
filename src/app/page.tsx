import Image from 'next/image';
import Header from './components/header';

export default function Accueil() {
  return (
    <>
      <Header />
      <main className="main">
        <Image src="/img/logo.svg" alt="Logo" width={100} height={100} />
        {/* <!--  vendre des services directement en ligne, générer des leads, ou présenter votre expertise pour attirer des clients potentiels -->

        <!-- Page d'accueil : Une page d'accueil attrayante présentant brièvement votre agence, ses services et son avantage concurrentiel.
        Services : Une page décrivant en détail les services que vous proposez, avec des informations sur leurs avantages et leur valeur ajoutée.
        Portfolio/Projets : Une page présentant vos réalisations passées, vos études de cas ou vos projets en cours.
        À propos : Une page pour partager des informations sur votre agence, votre équipe, vos valeurs et votre expertise.
        Témoignages : Une page où vous pouvez afficher les commentaires positifs de vos clients satisfaits.
        Contact : Une page contenant un formulaire de contact et vos coordonnées pour que les visiteurs puissent vous contacter facilement. -->

        Services :
        - création en ligne sur devis : statique ( a partir de -- ), dynamique ( à partir de ),
        - hebergement : - 0 si l'hebergement est fait par */}
      </main>
    </>
  )
}
