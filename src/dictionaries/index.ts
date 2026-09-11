import fr from "./fr.json";
import en from "./en.json";
import es from "./es.json";
import { defaultLocale, isLocale, type Locale } from "./locales";

export { locales, defaultLocale, isLocale, type Locale } from "./locales";

// Les trois JSON sont importes ici, et seulement ici. Ce module est reserve
// au serveur (layout, pages, generateMetadata, sitemap) : un composant client
// recoit ses chaines en props, ou importe ./locales s'il ne lui faut que la
// locale. Sinon les trois dictionnaires partent au navigateur (11/09).
const dictionaries: Record<Locale, typeof fr> = { fr, en, es };

export type Dictionary = typeof fr;

export const getDictionary = (locale: string): Dictionary => {
  const key = isLocale(locale) ? locale : defaultLocale;
  return dictionaries[key];
};
