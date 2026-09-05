import { aztecYear, YEAR_BEARER_INFO } from "aztec-year";

/** « 1 Tochtli · Lapin » : numeral + nom nahuatl + glose dans la langue de
 * la page. Module pur (ni serveur ni client) : appele au build par le
 * layout pour la valeur initiale, et chez le visiteur par
 * FooterAztecYear pour la valeur vraie. */
export function formatFooterAztecYear(locale: string, date?: Date): string {
  const year = aztecYear(date);
  const info = YEAR_BEARER_INFO[year.bearer];
  const gloss = locale === "en" ? info.en : locale === "es" ? info.es : info.fr;
  return `${year.number} ${info.nahuatl} · ${gloss}`;
}
