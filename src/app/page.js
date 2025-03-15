import Image from "next/image";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '20px' }}>
          <Image src="/img/logo.svg" alt="Logo NAHUAL Studio" width={100} height={100} priority />
        </div>

        <h1>✨ NAHUAL Studio - Développement Web Créatif ✨</h1>
        <p>Nous créons des sites web interactifs et performants.</p>

        <h2>🚀 Besoin d'un site rapide et efficace ?</h2>

        <a href="mailto:sylvain.maurier@gmail.com" style={{
          display: 'inline-block',
          backgroundColor: '#ff5733',
          color: '#fff',
          padding: '10px 20px',
          textDecoration: 'none',
          borderRadius: '5px',
          fontSize: '18px',
          maxWidth: '200px',
          textAlign: 'center',
        }}>
          Demander un site maintenant
        </a>

        <h2>🎨 Nos Réalisations</h2>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {/* Projet KleyFrance */}
            <div style={{ maxWidth: '300px', textAlign: 'center' }}>
              <Image src="/img/kleyfrance.png" alt="KleyFrance" width={300} height={200}
                style={{ width: '100%', height: '200px', borderRadius: '10px', objectFit: 'cover' }} />
              <h3>KleyFrance</h3>
              <p>Création du site web et de l'identité visuelle.</p>
              <a href="https://kleyfrance.fr/" className="btn-primary">Voir le projet</a>
            </div>

            {/* Projet iGuideU */}
            <div style={{ maxWidth: '300px', textAlign: 'center' }}>
              <Image src="/img/iguideu.png" alt="iGuideU" width={300} height={200}
                style={{ width: '100%', height: '200px', borderRadius: '10px', objectFit: 'cover' }} />
              <h3>iGuideU</h3>
              <p>Développement du site et refonte de l'identité visuelle.</p>
              <a href="https://www.iguideu.fr/" className="btn-primary">Voir le projet</a>
            </div>
          </div>

          {/* Projet Ecunhi */}
          <div style={{ maxWidth: '300px', textAlign: 'center' }}>
            <iframe src="https://player.vimeo.com/video/81902149" width="100%" height="200" style={{ borderRadius: '10px' }} allow="fullscreen"></iframe>
            <h3>Ecunhi - Courts métrages</h3>
            <p>Création de courts métrages artistiques.</p>
            <a href="https://vimeo.com/81902149" className="btn-primary">Voir la vidéo</a>
          </div>
        </div>
      </main>
    </div>
  );
}
