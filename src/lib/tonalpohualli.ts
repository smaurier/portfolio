/**
 * LE TONALPOHUALLI, « le compte des destins » (13/09). Le calendrier
 * sacre de 260 jours : vingt signes de jours qui tournent contre treize
 * nombres, si bien qu'un couple nombre + signe ne revient que tous les
 * 260 jours (20 x 13, les deux cycles etant premiers entre eux).
 *
 * CE QUI EST ATTESTE
 *  - Les vingt signes et leur ordre : Sahagun, *Historia general*, livre
 *    IV (le livre des augures), qui deroule les vingt trecenas ; Codex
 *    Borbonicus, planches 1 a 20, qui les peint.
 *  - Les treize nombres et la trecena : chaque periode de treize jours
 *    commence par un signe portant le nombre 1, et le nombre avance d'un
 *    cran par jour ; 1 Cipactli ouvre le compte, 13 Acatl ferme la
 *    premiere trecena, 1 Ocelotl ouvre la seconde.
 *  - Le jour de naissance donnait son nom et son destin a l'enfant
 *    (Sahagun, livre IV), et c'est de la que vient le mot tonalli.
 *  - Mazatl, le cerf, est le SEPTIEME signe : le site le dit depuis le
 *    premier jour, et c'est ce signe qui l'a fait naitre.
 *
 * LA CORRELATION, ET SON DEBAT
 * Passer d'une date gregorienne a un jour du tonalpohualli demande une
 * corrélation, et les savants n'ont pas tranche. Nous retenons celle
 * d'Alfonso Caso, la plus employee, qui prend pour ancre la chute de
 * Tenochtitlan : le 13 aout 1521 julien, soit le 23 aout 1521 gregorien,
 * etait **1 Coatl**. C'est la date la mieux documentee de tout le
 * calendrier mexica, rapportee par des temoins indiens et espagnols. Les
 * corrélations concurrentes (Tena, Ochoa, Nuttall) decalent le compte de
 * quelques jours : le site le dit, il ne le cache pas.
 *
 * Une autre inconnue, assumee : les Mexica ne faisaient pas commencer le
 * jour a minuit (le debat porte sur le lever du soleil ou le midi). Nous
 * prenons le jour civil du visiteur. Pour un site qui donne un nom a une
 * visite, c'est une approximation honnete, pas une these.
 *
 * Pur, teste. La mise en scene est ailleurs (`premiere-visite`, le
 * carnet des traces, le Codex).
 */
export type SigneTonalpohualli = {
  /** Le nom nahuatl, sans diacritiques longues (convention du site). */
  nahuatl: string;
  fr: string;
  en: string;
  es: string;
};

/** Les vingt signes, dans leur ordre (Sahagun IV ; Codex Borbonicus). */
export const SIGNES: readonly SigneTonalpohualli[] = [
  { nahuatl: "Cipactli", fr: "le caiman", en: "the caiman", es: "el caimán" },
  { nahuatl: "Ehecatl", fr: "le vent", en: "the wind", es: "el viento" },
  { nahuatl: "Calli", fr: "la maison", en: "the house", es: "la casa" },
  { nahuatl: "Cuetzpalin", fr: "le lézard", en: "the lizard", es: "la lagartija" },
  { nahuatl: "Coatl", fr: "le serpent", en: "the snake", es: "la serpiente" },
  { nahuatl: "Miquiztli", fr: "la mort", en: "death", es: "la muerte" },
  { nahuatl: "Mazatl", fr: "le cerf", en: "the deer", es: "el venado" },
  { nahuatl: "Tochtli", fr: "le lapin", en: "the rabbit", es: "el conejo" },
  { nahuatl: "Atl", fr: "l'eau", en: "water", es: "el agua" },
  { nahuatl: "Itzcuintli", fr: "le chien", en: "the dog", es: "el perro" },
  { nahuatl: "Ozomahtli", fr: "le singe", en: "the monkey", es: "el mono" },
  { nahuatl: "Malinalli", fr: "l'herbe", en: "the grass", es: "la hierba" },
  { nahuatl: "Acatl", fr: "le roseau", en: "the reed", es: "la caña" },
  { nahuatl: "Ocelotl", fr: "le jaguar", en: "the jaguar", es: "el jaguar" },
  { nahuatl: "Cuauhtli", fr: "l'aigle", en: "the eagle", es: "el águila" },
  { nahuatl: "Cozcacuauhtli", fr: "le vautour", en: "the vulture", es: "el zopilote" },
  { nahuatl: "Ollin", fr: "le mouvement", en: "movement", es: "el movimiento" },
  { nahuatl: "Tecpatl", fr: "le silex", en: "the flint", es: "el pedernal" },
  { nahuatl: "Quiyahuitl", fr: "la pluie", en: "the rain", es: "la lluvia" },
  { nahuatl: "Xochitl", fr: "la fleur", en: "the flower", es: "la flor" },
];

/** Le cerf est le septieme signe : l'index que le site raconte depuis le debut. */
export const INDEX_MAZATL = 6;

/** L'ancre de Caso : 23 aout 1521 gregorien = 1 Coatl (chute de Tenochtitlan). */
export const ANCRE = { annee: 1521, mois: 8, jour: 23, nombre: 1, signe: 4 } as const;

export const LONGUEUR_CYCLE = 260;

function joursDepuis(annee: number, mois: number, jour: number): number {
  // Jours entiers entre l'ancre et la date, en calendrier gregorien
  // proleptique (celui de Date.UTC), sans fuseau ni heure.
  const a = Date.UTC(ANCRE.annee, ANCRE.mois - 1, ANCRE.jour);
  const b = Date.UTC(annee, mois - 1, jour);
  return Math.round((b - a) / 86_400_000);
}

function modulo(a: number, n: number): number {
  return ((a % n) + n) % n;
}

export type JourTonalpohualli = {
  /** 1 a 13. */
  nombre: number;
  /** 0 a 19, index dans SIGNES. */
  index: number;
  signe: SigneTonalpohualli;
  /** Position dans le cycle de 260 jours, 0 a 259 (0 = 1 Cipactli). */
  position: number;
};

/** Le jour du tonalpohualli pour une date civile (annee, mois 1-12, jour). */
export function jourDeDate(annee: number, mois: number, jour: number): JourTonalpohualli {
  const d = joursDepuis(annee, mois, jour);
  const nombre = modulo(ANCRE.nombre - 1 + d, 13) + 1;
  const index = modulo(ANCRE.signe + d, 20);
  // La position dans le cycle : le seul couple (nombre, signe) qui les
  // porte tous les deux, retrouve par le theoreme des restes chinois sur
  // 13 et 20 (20 x 2 = 40 = 1 mod 13 ; 13 x 7 = 91 = 11 mod 20).
  const position = modulo(40 * (nombre - 1) + 221 * index, LONGUEUR_CYCLE);
  return { nombre, index, signe: SIGNES[index], position };
}

/** Le jour du tonalpohualli d'un instant, lu dans le calendrier du visiteur. */
export function jourDe(date: Date): JourTonalpohualli {
  return jourDeDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/** « 7 Mazatl » : le nom court, celui qu'on ecrit. */
export function nomCourt(jour: JourTonalpohualli): string {
  return `${jour.nombre} ${jour.signe.nahuatl}`;
}

/** Le jour du visiteur est-il celui du cerf ? Le site est ne de ce signe. */
export function estJourDuCerf(jour: JourTonalpohualli): boolean {
  return jour.index === INDEX_MAZATL;
}
