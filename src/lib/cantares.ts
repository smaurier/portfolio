/**
 * LES CANTARES (M4 du backlog, 11/09/2026).
 *
 * Un chant par direction, tire des *Cantares mexicanos* (manuscrit du XVIe
 * siecle, Biblioteca Nacional de Mexico), dans l'edition Miguel
 * Leon-Portilla (coord.), UNAM, 2011, dont la paleographie et la traduction
 * espagnole sont en acces ouvert :
 * https://historicas.unam.mx/publicaciones/publicadigital/libros/cantares/
 *
 * Choix de Sylvain (11/09) : le chant est VISIBLE POUR TOUT LE MONDE, sous
 * la scene et en mode lecture, jamais en `sr-only`. L'accessibilite est un
 * enrichissement pour tous, pas un cadeau reserve aux lecteurs d'ecran.
 *
 * Trois couches par chant : le nahuatl (domaine public), l'espagnol de
 * l'edition (courte citation, une strophe par page, toujours attribuee) et
 * notre traduction FR et EN faite d'apres cet espagnol, marquee comme telle.
 * Les extraits, folios et raisons de chaque choix sont dans
 * docs/da/cantares-choix.md.
 *
 * Aucune strophe ne nomme un dieu (la 184 du chant XVIII s'adresse a un
 * « tu » que la strophe 183, non citee, nomme ; citee seule, elle ne nomme
 * personne : c'est une citation, pas une representation).
 */
import type { CardinalDirection } from "@/app/components/stag-scene/cardinal-transition-context";

export const CANTARES_EDITION_URL = "https://historicas.unam.mx/publicaciones/publicadigital/libros/cantares/";

export type Cantar = {
  /** Numero du chant dans l'edition (romain) et son titre nahuatl. */
  chant: string;
  titre: string;
  strophe: number;
  folio: string;
  /** Les vers, un par entree ; rien n'est coupe a l'interieur d'une strophe. */
  nahuatl: string[];
  es: string[];
  fr: string[];
  en: string[];
};

export const CANTARES: Record<CardinalDirection, Cantar> = {
  jade: {
    chant: "I",
    titre: "Cuicapeuhcayotl",
    strophe: 1,
    folio: "1r",
    nahuatl: [
      "Ninoyolnonotza,",
      "campa nicuiz yectli auiacaxochitl?",
      "ac nictlatlaniz?",
      "manoço yehuatl nictlatlani in quetzalhuitzitziltzin,",
      "in chalchiuhhuitzitzicatzin",
    ],
    es: [
      "Hablo con mi corazón,",
      "¿dónde tomaré bellas, fragantes flores?",
      "¿A quién se lo preguntaré?",
      "¿Tal vez se lo pregunto al colibrí precioso,",
      "al colibrí color de jade?",
    ],
    fr: [
      "Je parle avec mon cœur :",
      "où prendrai-je les belles fleurs parfumées ?",
      "À qui le demanderai-je ?",
      "Peut-être au colibri précieux,",
      "au colibri couleur de jade ?",
    ],
    en: [
      "I speak with my heart:",
      "where shall I gather the fine, fragrant flowers?",
      "Whom shall I ask?",
      "Perhaps the precious hummingbird,",
      "the hummingbird the colour of jade?",
    ],
  },
  dore: {
    chant: "II",
    titre: "Xopancuicatl",
    strophe: 10,
    folio: "2r",
    nahuatl: [
      "Niyolpoxahua",
      "in nicaquia, nicuicani,",
      "ahcoquiça in notlalnamiquiliz o,",
      "quinpepetlatiquiça in ilhuicame,",
      "nelcicihuiliz ehecayotiuh",
    ],
    es: [
      "Se conmueve mi corazón",
      "cuando los oigo, yo cantor.",
      "Se levantan mis recuerdos,",
      "hacen resplandecer los cielos;",
      "mis suspiros se van con el viento.",
    ],
    fr: [
      "Mon cœur s'émeut",
      "quand je les entends, moi le chanteur.",
      "Mes souvenirs se lèvent,",
      "ils font resplendir les cieux ;",
      "mes soupirs s'en vont avec le vent.",
    ],
    en: [
      "My heart stirs",
      "when I hear them, I the singer.",
      "My memories rise,",
      "they make the skies shine;",
      "my sighs go off with the wind.",
    ],
  },
  turquoise: {
    chant: "LXXV",
    titre: "Yaoxochicuicatl",
    strophe: 1320,
    folio: "64r-64v",
    nahuatl: [
      "Yn quetzalizquixochitl aya",
      "oitzmolinico",
      "mimilihui, cueponih,",
      "in tepilhuan in quauhtli ocelotl",
      "yxquich oncuetlahui ya",
      "quexquich onquiçaquiuh huiya",
      "quexquich onmomanaquiuh in tlalticpac",
    ],
    es: [
      "El izquixóchitl precioso",
      "ha venido a reverdecer,",
      "brota, se abre,",
      "son los príncipes, el águila, el jaguar.",
      "Todo se marchita,",
      "cuanto viene a salir,",
      "cuanto viene a estar en la tierra.",
    ],
    fr: [
      "L'izquixochitl précieux",
      "est venu reverdir,",
      "il pousse, il s'ouvre :",
      "ce sont les princes, l'aigle, le jaguar.",
      "Tout se fane,",
      "tout ce qui vient à paraître,",
      "tout ce qui vient à être sur la terre.",
    ],
    en: [
      "The precious izquixochitl",
      "has come to green again,",
      "it sprouts, it opens:",
      "these are the princes, the eagle, the jaguar.",
      "Everything withers,",
      "all that comes to appear,",
      "all that comes to be on the earth.",
    ],
  },
  cendre: {
    chant: "XVIII",
    titre: "Ycnocuicatl",
    strophe: 180,
    folio: "12v",
    nahuatl: [
      "Can niquittoa onon niquilnamiqui ye",
      "antla ye iuhqui a icnopillotl",
      "tle yca cehuiz in noyollo",
      "tle yca polihuiz in notlayolol nihuexotzincatl",
      "mach oc onca ye nota, mach oc onca ye nonan",
      "oc nechonnechixtiez",
      "oc nechonyollocehuiz",
    ],
    es: [
      "Sólo digo, recuerdo,",
      "nada se iguala a la miseria.",
      "¿Con qué tendrá descanso mi corazón?",
      "¿Con qué acabará mi tristeza, yo huexotzinca?",
      "¿Acaso allá mi padre, acaso allá mi madre",
      "aún me estarán esperando?",
      "¿Aún darán descanso a mi corazón?",
    ],
    fr: [
      "Je dis seulement, je me souviens :",
      "rien n'égale la misère.",
      "Avec quoi mon cœur aura-t-il du repos ?",
      "Avec quoi finira ma tristesse, moi de Huexotzinco ?",
      "Là-bas mon père, là-bas ma mère,",
      "m'attendent-ils encore ?",
      "Donneront-ils encore du repos à mon cœur ?",
    ],
    en: [
      "I only say, I remember:",
      "nothing equals this misery.",
      "With what will my heart find rest?",
      "With what will my sorrow end, I of Huexotzinco?",
      "Over there my father, over there my mother,",
      "are they still waiting for me?",
      "Will they still give rest to my heart?",
    ],
  },
  obsidienne: {
    chant: "XVIII",
    titre: "Ycnocuicatl",
    strophe: 184,
    folio: "12v",
    nahuatl: [
      "Yn can no iuhqui quetzalitztli ticxaxamania",
      "can no iuhquin tlacuilolli ticpopoloa",
      "ixquich ompa yahui",
      "çan no ye Mictlan can tocepanpoliuhyan.",
    ],
    es: [
      "Así como haces pedazos a las obsidianas preciosas,",
      "así como borras las pinturas,",
      "así todos marchan allá,",
      "al Mictlan,",
      "a nuestro lugar común de perdernos.",
    ],
    fr: [
      "Comme tu brises les obsidiennes précieuses,",
      "comme tu effaces les peintures,",
      "ainsi tous s'en vont là-bas,",
      "au Mictlan,",
      "au lieu où nous nous perdons ensemble.",
    ],
    en: [
      "As you shatter the precious obsidians,",
      "as you erase the paintings,",
      "so all go over there,",
      "to Mictlan,",
      "to the place where we are lost together.",
    ],
  },
};

export function cantarFor(direction: CardinalDirection): Cantar {
  return CANTARES[direction];
}
