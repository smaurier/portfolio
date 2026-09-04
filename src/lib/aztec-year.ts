/**
 * L'annee mexica (04/09, Sud). Le xiuhcoatl porte au bout de la queue le
 * signe de l'annee (trapeze et rayon), qui veut dire « annee » sans en
 * designer une. Une annee s'ecrit avec un nombre de 1 a 13 et l'un des
 * quatre PORTEURS D'ANNEE : Tochtli (lapin), Acatl (roseau), Tecpatl
 * (silex), Calli (maison). Le cycle se referme en 52 ans (xiuhmolpilli).
 *
 * Correlation standard : 1519, l'arrivee de Cortes, est 1 Acatl ; 1521, la
 * chute de Tenochtitlan, est 3 Calli. L'annee mexica ne commence pas au
 * 1er janvier : suivant la correlation de Caso elle debute vers la
 * mi-fevrier ; on bascule ici le 13 fevrier (choix de Sylvain, 04/09).
 *
 * Calcule dans le navigateur a partir de l'horloge du visiteur : rien a
 * faire en production d'une annee sur l'autre.
 */

export const AZTEC_YEAR_BEARERS = ["acatl", "tecpatl", "calli", "tochtli"] as const;
export type AztecYearBearer = (typeof AZTEC_YEAR_BEARERS)[number];

export type AztecYear = {
  /** 1..13 */
  number: number;
  bearer: AztecYearBearer;
  /** Annee gregorienne dans laquelle cette annee mexica a commence. */
  mexicaYear: number;
};

/** 1519 = 1 Acatl. */
const ANCHOR_YEAR = 1519;
const ANCHOR_BEARER_INDEX = 0; // acatl
/** Bascule de l'annee mexica : 13 fevrier (mois 0-indexe). */
const NEW_YEAR_MONTH = 1;
const NEW_YEAR_DAY = 13;

function mod(a: number, n: number): number {
  return ((a % n) + n) % n;
}

/** Annee gregorienne de debut de l'annee mexica en cours a cette date. */
export function mexicaYearOf(date: Date): number {
  const y = date.getFullYear();
  const beforeNewYear = date.getMonth() < NEW_YEAR_MONTH || (date.getMonth() === NEW_YEAR_MONTH && date.getDate() < NEW_YEAR_DAY);
  return beforeNewYear ? y - 1 : y;
}

export function aztecYear(date: Date = new Date()): AztecYear {
  const mexicaYear = mexicaYearOf(date);
  const k = mexicaYear - ANCHOR_YEAR;
  return {
    number: mod(k, 13) + 1,
    bearer: AZTEC_YEAR_BEARERS[mod(ANCHOR_BEARER_INDEX + k, 4)],
    mexicaYear,
  };
}

/** Les points du nombre, par rangees de 5 au plus (usage des codex). */
export function dotRows(n: number): number[] {
  const rows: number[] = [];
  let left = Math.max(0, Math.min(13, Math.round(n)));
  while (left > 0) {
    rows.push(Math.min(5, left));
    left -= 5;
  }
  return rows;
}
