import fr from "./fr.json";
import en from "./en.json";
import es from "./es.json";

// Import statique (pas de dynamic import par locale) : les 3 fichiers sont
// petits, et ça permet d'utiliser getDictionary aussi bien dans un Server
// Component (layout, generateMetadata) que dans un composant client (la
// page d'accueil est "use client" à cause de l'animation GSAP du SVG).
const dictionaries = { fr, en, es };

export const locales = Object.keys(dictionaries) as Array<keyof typeof dictionaries>;
export const defaultLocale: (typeof locales)[number] = "fr";
export type Locale = (typeof locales)[number];
export type Dictionary = (typeof dictionaries)["fr"];

export const isLocale = (value: string): value is Locale =>
  (locales as string[]).includes(value);

export const getDictionary = (locale: string): Dictionary => {
  const key = isLocale(locale) ? locale : defaultLocale;
  return dictionaries[key];
};
