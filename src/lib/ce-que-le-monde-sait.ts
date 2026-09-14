import { formatFooterAztecYear } from "./footer-aztec-year";
import { apresMidiDuLieu } from "./heure-du-lieu";
import { jourDe, nomCourt, type JourTonalpohualli } from "./tonalpohualli";
import { isEveningStar, isMorningStar } from "./venus";

/**
 * CE QUE LE MONDE SAIT (14/09, O1 du registre des mecaniques). Le site
 * calcule beaucoup de choses vraies qu'il ne dit jamais : ou est Venus ce
 * soir, quelle annee mexica court, de quel cote du midi se trouve le
 * visiteur, quel jour du compte des destins a nomme sa premiere venue,
 * depuis combien de temps son foyer brule. Tout cela tourne et n'atteint
 * personne.
 *
 * Ce module ne fait que RASSEMBLER ces reponses, sans rien decider de leur
 * mise en page ni de leur formulation : il rend des cles et des valeurs,
 * le dictionnaire rend les phrases. Pur et teste ; tout ce qui depend de
 * l'horloge ou du stockage arrive en argument.
 */
export type CleDuMonde = "venusSoir" | "venusMatin" | "annee" | "apresMidi" | "matin" | "jour" | "foyer";

export type FaitDuMonde = {
  cle: CleDuMonde;
  /** Les valeurs a poser dans la phrase du dictionnaire. */
  valeurs?: Record<string, string>;
};

export type EtatDuMonde = {
  maintenant: Date;
  /** Decalage de fuseau du visiteur, en minutes derriere UTC. */
  fuseauMinutes: number;
  /** Instant de la premiere visite (ms), ou null si on ne le sait pas. */
  premiereVisite: number | null;
  /** Le feu etait-il DEJA allume a l'arrivee ? C'est le site qui le sait, a
   * la premiere image : la cle du foyer est reecrite a chaque visite, donc
   * un nombre de jours lu apres coup vaudrait toujours zero (mesure du
   * 14/09). L'attribut pose avant le premier paint, lui, dit la verite. */
  foyerDejaAllume: boolean;
  locale: string;
};

/**
 * Les faits vrais a cet instant, dans l'ordre ou on veut les lire : le
 * ciel d'abord (ce qui est le plus loin de nous), puis le calendrier,
 * puis le visiteur. Jamais plus de cinq : c'est une confidence, pas une
 * fiche technique.
 */
export function ceQueLeMondeSait(etat: EtatDuMonde): FaitDuMonde[] {
  const faits: FaitDuMonde[] = [];
  if (isEveningStar(etat.maintenant)) faits.push({ cle: "venusSoir" });
  else if (isMorningStar(etat.maintenant)) faits.push({ cle: "venusMatin" });

  // Le meme libelle que le pied de page : une seule facon de nommer l'annee.
  faits.push({ cle: "annee", valeurs: { annee: formatFooterAztecYear(etat.locale, etat.maintenant) } });

  faits.push({ cle: apresMidiDuLieu(etat.maintenant, etat.fuseauMinutes) ? "apresMidi" : "matin" });

  if (etat.premiereVisite !== null && Number.isFinite(etat.premiereVisite)) {
    const j: JourTonalpohualli = jourDe(new Date(etat.premiereVisite));
    const glose = etat.locale === "en" ? j.signe.en : etat.locale === "es" ? j.signe.es : j.signe.fr;
    faits.push({ cle: "jour", valeurs: { jour: nomCourt(j), glose } });
  }

  if (etat.foyerDejaAllume) faits.push({ cle: "foyer" });

  return faits;
}
