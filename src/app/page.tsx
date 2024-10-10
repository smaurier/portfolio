import Image from 'next/image';
import Header from './components/header';

export default function Accueil() {
  return (
    <>
      <Header />
      <main className="main">
        <div className="insert_logo insert">
          <Image src="/img/logo.svg" alt="Logo" width={100} height={100} />
        </div>
        <div className="insert insert--green">
          <h1>Nahual Studio – Donnez vie à votre projet, transformez votre vision</h1>
          <p>Chez Nahual Studio, chaque projet est une métamorphose. Inspiré par la mythologie Nahua, où le Nahual incarne le pouvoir de transformation, notre agence se consacre à vous offrir des solutions web et mobiles qui transforment vos idées en expériences uniques et immersives. Nous croyons que la première impression est cruciale, tout comme le premier pas dans une transformation, c’est pourquoi nous mettons un point d’honneur à soigner chaque détail.</p>

          <h2>Nos services :</h2>
          <ul>
            <li>Création de sites internet : Que vous ayez besoin d’un site avec ou sans hébergement, nous vous livrons une solution sur mesure, entièrement adaptée à vos besoins.</li>
            <li>Graphisme : Vous avez le choix : soit nous réalisons le graphisme pour vous, soit nous vous mettons en relation avec des graphistes de confiance.</li>
            <li>Applications mobiles : Utilisant Flutter, nous créons également des applications mobiles innovantes et performantes.</li>
            <li>Gestion de contenu : Nous nous occupons de la rédaction de vos textes, ou vous pouvez les mettre à jour facilement via Strapi.</li>
            <li>Formation sur mesure : Une formation aux outils d’édition peut être incluse pour vous permettre d’être autonome dans la gestion de votre site.</li>
            <li>Abonnements personnalisés : Hébergement, maintenance, et plus encore, pour une flexibilité totale adaptée à vos besoins.</li>
          </ul>

          <p>Chez Nahual Studio, chaque projet, petit ou grand, est une nouvelle aventure. Nous croyons que même les projets les plus simples peuvent révéler des opportunités insoupçonnées de transformation et d’innovation. Alors, laissez-vous surprendre et ensemble, transformons votre idée en une réalité qui marquera les esprits.</p>
        </div>

        <div className="insert insert_stack">
          <h2>Notre alchimie technique</h2>
          <ul>
            <li><Image src="/img/svelte-logo.svg" alt="svelte" width={100} height={100} /> <span>Svelte</span> </li>
            <li><Image src="/img/nextjs-logo.svg" alt="next" width={100} height={100} /> <span>Next</span> </li>
            <li><Image src="/img/flutterio-icon.svg" alt="Logo" width={100} height={100} /> <span>Flutter</span> </li>
            <li><Image src="/img/strapi-logo.svg" alt="Logo" width={100} height={100} /> <span>Strapi</span> </li>
          </ul>
          <p>Ainsi que d'autres outils adaptés à vos besoins de croissance et d'évolution.</p>
        </div>

        <div className="insert insert--green">
          <h2>Nous contacter</h2>
        </div>
      </main>
    </>
  )
}
