/**
 * Les locales SANS les dictionnaires. Ce module n'importe aucun JSON : les
 * composants client qui n'ont besoin que de la locale (isLocale, le type)
 * l'importent d'ici, sinon l'index embarque les trois dictionnaires dans le
 * bundle du navigateur (mesure du 11/09 : 188 Ko bruts, 64 Ko compresses,
 * un dixieme du JavaScript que le voile attend, pour deux composants qui
 * lisaient trois libelles).
 */
export const locales = ["fr", "en", "es"] as const;
export const defaultLocale: (typeof locales)[number] = "fr";
export type Locale = (typeof locales)[number];

export const isLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);
