/**
 * Conversion Grégorien → Xiuhpohualli year-bearer (29/08).
 *
 * Le calendrier solaire nahua Xiuhpohualli (365 jours) désigne
 * chaque année par un « porteur », un nom parmi 4 (Acatl, Tecpatl,
 * Calli, Tochtli) préfixé d'un nombre 1-13. Le cycle complet fait
 * 52 années (4 signes × 13 nombres) : c'est le « siècle nahua »,
 * après lequel on célèbre la Cérémonie du Feu Nouveau.
 *
 * Convention utilisée : Rafael Tena (référence académique mexicaine
 * moderne). 1519 CE (arrivée de Cortés à Tenochtitlan) = 2 Acatl.
 * Séquence des signes après Acatl : Tecpatl → Calli → Tochtli →
 * Acatl (Tochtli étant l'ordre suivant selon la convention year-
 * bearer classique).
 *
 * Chaque porteur est associé à une direction cardinale :
 * - Acatl (Roseau)  = Est
 * - Tecpatl (Silex) = Nord
 * - Calli (Maison)  = Ouest
 * - Tochtli (Lapin) = Sud
 *
 * Utilisation : footer signature discrète « © 2026 · 2 Tochtli ».
 */

export type YearBearer = "Acatl" | "Tecpatl" | "Calli" | "Tochtli";

// Sequence dans l'ordre du cycle Xiuhpohualli.
const SIGN_CYCLE: YearBearer[] = ["Acatl", "Tecpatl", "Calli", "Tochtli"];

// Reference : 1519 CE = 2 Acatl (Tena convention).
const REFERENCE_YEAR = 1519;
const REFERENCE_SIGN_IDX = 0; // Acatl
const REFERENCE_NUMBER = 2;

export function getAztecYear(gregorianYear: number): { number: number; sign: YearBearer } {
  const delta = gregorianYear - REFERENCE_YEAR;
  // Modulo positif safe (JS % peut retourner négatif pour delta < 0).
  const signIdx = ((REFERENCE_SIGN_IDX + delta) % 4 + 4) % 4;
  const num = ((REFERENCE_NUMBER + delta - 1) % 13 + 13) % 13 + 1;
  return { number: num, sign: SIGN_CYCLE[signIdx] };
}

export const YEAR_BEARER_TRANSLATION: Record<"fr" | "en" | "es", Record<YearBearer, string>> = {
  fr: { Acatl: "Roseau", Tecpatl: "Silex", Calli: "Maison", Tochtli: "Lapin" },
  en: { Acatl: "Reed", Tecpatl: "Flint", Calli: "House", Tochtli: "Rabbit" },
  es: { Acatl: "Caña", Tecpatl: "Pedernal", Calli: "Casa", Tochtli: "Conejo" },
};

/** Formatte "N Sign · Traduction" pour affichage footer localisé. */
export function formatAztecYear(gregorianYear: number, locale: "fr" | "en" | "es"): string {
  const { number, sign } = getAztecYear(gregorianYear);
  const translation = YEAR_BEARER_TRANSLATION[locale][sign];
  return `${number} ${sign} · ${translation}`;
}
