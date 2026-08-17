import localFont from "next/font/local";
import { notFound } from "next/navigation";
import "../globals.css";
import Header from "../components/header";
import { getDictionary, isLocale, locales, type Locale } from "../../dictionaries";

const geistSans = localFont({
  src: "../fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "../fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export function generateMetadata({ params }: { params: { locale: string } }) {
  const dict = getDictionary(params.locale);
  return {
    title: dict.metadata.title,
    description: dict.metadata.description,
    alternates: {
      languages: Object.fromEntries(locales.map((l) => [l, `/${l}`])),
    },
  };
}

export default function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const dict = getDictionary(locale);

  return (
    <html lang={locale}>
      <head>
        <link rel="icon" href="/img/logo.svg" type="image/svg+xml" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Header locale={locale} dict={dict.common} />
        {children}
        <footer className="siteFooter">
          © {new Date().getFullYear()} NAHUAL Studio
        </footer>
      </body>
    </html>
  );
}
