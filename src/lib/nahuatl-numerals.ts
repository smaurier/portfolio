/**
 * Numeraux du nahuatl classique, 1 a 20 (02/09, Nord, element C de la
 * fiche Mictlampa : "le miroir compte dans la langue des morts"). Base
 * vigesimale avec sous-base 5 : 6-9 = chicua-/chic- + unite, 11-14 =
 * mahtlactli + on-/om- + unite, 15 = caxtolli, 16-19 = caxtolli + on-/om-
 * + unite, 20 = cempohualli. Graphie avec macrons (voyelles longues),
 * conventions Karttunen / Launey. Formes attestees uniquement : hors de
 * 1..20 la fonction rend une chaine vide plutot qu'une invention (posture
 * honnete : rien de fabrique sur une langue sacree, cf garde-fou glyphes).
 */

const UNITS: Record<number, string> = {
  1: "cē",
  2: "ōme",
  3: "ēyi",
  4: "nāhui",
  5: "mācuīlli",
  6: "chicuacē",
  7: "chicōme",
  8: "chicuēyi",
  9: "chiucnāhui",
  10: "mahtlāctli",
  15: "caxtōlli",
  20: "cempōhualli",
};

/** Liaison additive : on- devant consonne, om- devant voyelle (ōme, ēyi),
 * onn- devant nāhui (assimilation attestee "onnāhui"). */
const ADDED: Record<number, string> = {
  1: "oncē",
  2: "omōme",
  3: "omēyi",
  4: "onnāhui",
};

export function toNahuatlNumeral(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 20) return "";
  if (UNITS[n]) return UNITS[n];
  if (n > 10 && n < 15) return `${UNITS[10]} ${ADDED[n - 10]}`;
  if (n > 15 && n < 20) return `${UNITS[15]} ${ADDED[n - 15]}`;
  return "";
}
