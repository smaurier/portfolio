import { isAfternoon } from "./solar";

/**
 * L'HEURE DU LIEU (13/09). Le site savait deja l'heure de Tenochtitlan
 * (lib/solar, mode contemplation) ; il sait maintenant celle du visiteur.
 * Si le soleil est deja passe au meridien la ou il est, le soleil de la
 * page se leve du meme cote que le sien : les ombres tombent dans le bon
 * sens, sans qu'il ait rien demande.
 *
 * Sans geolocalisation et sans permission : le decalage de fuseau donne
 * une longitude approchee (quinze degres par heure). Cette longitude-la
 * place le midi solaire exactement a midi sur l'horloge du visiteur : la
 * regle revient donc a « son horloge a-t-elle passe midi ». Un fuseau
 * politique peut s'ecarter de son meridien de plus d'une heure
 * (l'Espagne, la Chine) et le vrai midi solaire y tombe alors plus tard ;
 * l'erreur porte sur l'heure qui entoure midi, pas sur le reste de la
 * journee. C'est le prix a payer pour ne rien demander.
 *
 * Pur, sauf `apresMidiIci` qui lit l'horloge de la machine.
 */

/** Longitude approchee (degres est) deduite du decalage de fuseau, en
 * minutes derriere UTC (la convention de `getTimezoneOffset`). */
export function longitudeDepuisFuseau(offsetMinutes: number): number {
  const lon = -offsetMinutes / 4;
  return lon === 0 ? 0 : lon;
}

/** Le soleil est-il passe au meridien du visiteur ? */
export function apresMidiDuLieu(date: Date, offsetMinutes: number): boolean {
  return isAfternoon(date, longitudeDepuisFuseau(offsetMinutes));
}

/** La meme question, pour la machine qui affiche la page. */
export function apresMidiIci(date: Date = new Date()): boolean {
  return apresMidiDuLieu(date, date.getTimezoneOffset());
}
