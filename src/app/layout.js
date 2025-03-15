import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata = {
  title: "NAHUAL Studio - Développement Web Créatif",
  description: "Agence web spécialisée dans le développement interactif et créatif.",
  keywords: "développement web, design interactif, next.js, svelte, gsap, three.js",
  author: "NAHUAL Studio",
  openGraph: {
    title: "NAHUAL Studio - Développement Web Créatif",
    description: "Agence web spécialisée dans le développement interactif et créatif.",
    url: "https://nahual.fr",
    siteName: "NAHUAL Studio",
    images: [{ url: "/img/og-image.jpg", width: 1200, height: 630, alt: "NAHUAL Studio" }],
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <header style={{ backgroundColor: '#171717', padding: '10px 0', textAlign: 'center' }}>
          <nav>
            <a href="/" style={{ margin: '0 15px', color: '#fff', fontWeight: 'bold' }}>Accueil</a>
            <a href="/services" style={{ margin: '0 15px', color: '#fff', fontWeight: 'bold' }}>Services</a>
            <a href="/projets" style={{ margin: '0 15px', color: '#fff', fontWeight: 'bold' }}>Projets</a>
            <a href="/contact" style={{ margin: '0 15px', color: '#fff', fontWeight: 'bold' }}>Contact</a>
          </nav>
        </header>
        <main>{children}</main>
        <footer style={{ textAlign: 'center', padding: '20px 0', marginTop: '40px' }}>
          © 2025 NAHUAL Studio
        </footer>
      </body>
    </html>
  );
}
