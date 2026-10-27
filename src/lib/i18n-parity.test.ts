import { describe, expect, it } from "vitest";
import fr from "../dictionaries/fr.json";
import en from "../dictionaries/en.json";
import es from "../dictionaries/es.json";
import { couper } from "./og-carte";
import { PARTITION_CENTRE } from "./partition-texte";

/**
 * LES TROIS DICTIONNAIRES DISENT LA MEME CHOSE (09/09).
 *
 * Trouve en auditant les locales a la demande de Sylvain : l'espagnol
 * comptait 393 chaines contre 411 au francais et a l'anglais, et les 18
 * manquantes n'etaient pas des miettes -- c'etaient les trois DERNIERS
 * blocs de recit de chacune des trois etudes de cas. En espagnol, chaque
 * projet s'arretait au premier paragraphe une fois l'etude ouverte.
 *
 * Rien ne plantait : `getDictionary` rend l'objet tel quel, sans repli, et
 * un tableau plus court se rend simplement plus court. Un jury hispanophone
 * lisait donc un tiers de chaque etude, sans qu'aucune erreur ne le dise.
 *
 * D'ou ce test, qui est le seul moyen que le trou ne revienne pas : la
 * prochaine cle ajoutee au francais et oubliee ailleurs fait rougir la
 * suite.
 */

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

/** Aplatit en chemins de feuilles, index de tableau compris : c'est la
 * granularite ou le trou s'etait cache (un tableau plus court). */
function aplatis(o: Json, prefixe = ""): Map<string, string> {
  const out = new Map<string, string>();
  if (Array.isArray(o)) {
    o.forEach((v, i) => {
      for (const [k, val] of aplatis(v, `${prefixe}[${i}]`)) out.set(k, val);
    });
  } else if (o !== null && typeof o === "object") {
    for (const [k, v] of Object.entries(o)) {
      for (const [kk, val] of aplatis(v, prefixe ? `${prefixe}.${k}` : k)) out.set(kk, val);
    }
  } else if (typeof o === "string") {
    out.set(prefixe, o);
  }
  return out;
}

const dicos = {
  fr: aplatis(fr as unknown as Json),
  en: aplatis(en as unknown as Json),
  es: aplatis(es as unknown as Json),
};

describe("i18n : les trois dictionnaires ont les memes cles", () => {
  it("aucune cle du francais ne manque ailleurs", () => {
    for (const loc of ["en", "es"] as const) {
      const manquantes = [...dicos.fr.keys()].filter((k) => !dicos[loc].has(k));
      expect(manquantes, `${loc} : ${manquantes.length} cles manquantes -> ${manquantes.slice(0, 6).join(", ")}`).toEqual([]);
    }
  });

  it("aucune cle en trop hors du francais", () => {
    // L'inverse compte aussi : une cle qui n'existe qu'en anglais est du
    // texte que personne ne lit, ou une faute de frappe qui rendra vide.
    for (const loc of ["en", "es"] as const) {
      const surplus = [...dicos[loc].keys()].filter((k) => !dicos.fr.has(k));
      expect(surplus, `${loc} : ${surplus.length} cles en trop -> ${surplus.slice(0, 6).join(", ")}`).toEqual([]);
    }
  });

  it("aucune valeur vide dans aucune langue", () => {
    for (const [loc, d] of Object.entries(dicos)) {
      // Les lignes de seuil (common.seuils) ont ete ecrites et validees par
      // Sylvain le 11/09 (N1) : plus aucune exception ici.
      const vides = [...d.entries()].filter(([, v]) => v.trim().length === 0).map(([k]) => k);
      expect(vides, `${loc} : ${vides.length} valeurs vides`).toEqual([]);
    }
  });

  it("les cinq sorties de scene sont traduites, cardinal et suite", () => {
    // Le defaut jumeau du 09/09 : la table des sorties de scene vivait dans
    // le composant, en francais seulement, donc les DIX pages etrangeres
    // finissaient sur « Le nombril du monde. D'ou partent les chemins. »
    // C'est la derniere chose qu'un jury lit sur chaque page.
    // 11/10 : la ligne poetique est partie (partition du texte, KISS : la
    // cloture ne garde que le titre cardinal et le lien vers la suite).
    for (const dir of ["jade", "dore", "turquoise", "cendre", "obsidienne"]) {
      for (const champ of ["cardinal", "nextLabel"]) {
        const cle = `closure.${dir}.${champ}`;
        for (const loc of ["fr", "en", "es"] as const) {
          expect(dicos[loc].get(cle), `${loc} ${cle}`).toBeTruthy();
        }
      }
      expect(dicos.fr.has(`closure.${dir}.poetic`), `${dir} : la ligne poetique est partie`).toBe(false);
      // Et elles ne sont pas juste recopiees du francais.
      const frSuite = dicos.fr.get(`closure.${dir}.nextLabel`);
      for (const loc of ["en", "es"] as const) {
        expect(dicos[loc].get(`closure.${dir}.nextLabel`), `${loc} ${dir} : suite non traduite`).not.toBe(frSuite);
      }
    }
  });

  it("le Centre raconte trois chapitres, I, II et IV", () => {
    // 11/10, partition du texte : III « Un silence. » est dit par le silence
    // lui-meme, V « L'Ollin » par la cloture qui est deja le depart.
    const chapitresPartition = Object.keys(PARTITION_CENTRE).filter((k) => k.startsWith("chapitre-")).length;
    for (const loc of ["fr", "en", "es"] as const) {
      expect(dicos[loc].get("home.chapters[0].kicker"), loc).toMatch(/^I /);
      expect(dicos[loc].get("home.chapters[1].kicker"), loc).toMatch(/^II /);
      expect(dicos[loc].get("home.chapters[2].kicker"), loc).toMatch(/^IV /);
      expect(dicos[loc].has("home.chapters[3].kicker"), loc).toBe(false);
      expect(dicos[loc].has(`home.chapters[${chapitresPartition}].kicker`), `${loc} : autant de chapitres que de fenetres dans la partition`).toBe(false);
      expect(dicos[loc].has(`home.chapters[${chapitresPartition - 1}].kicker`), loc).toBe(true);
      expect(dicos[loc].has("home.heroText"), `${loc} : le paragraphe du hero est parti`).toBe(false);
      expect(dicos[loc].has("common.cantar.ourTranslation"), `${loc} : la citation longue est partie`).toBe(false);
    }
  });

  it("la source du chant porte le chant et la strophe, jamais le folio", () => {
    // 11/10 : source courte ; un `{folio}` oublie s'afficherait tel quel.
    for (const loc of ["fr", "en", "es"] as const) {
      const source = dicos[loc].get("common.cantar.source") ?? "";
      expect(source, loc).toContain("{chant}");
      expect(source, loc).toContain("{strophe}");
      expect(source, loc).not.toContain("{folio}");
    }
  });
});

describe("i18n : le lexique nahua ne s'inverse pas", () => {
  /**
   * TROUVE LE 27/10, EN AUDITANT LA PAGE ANGLAISE AVANT DECEMBRE.
   *
   * Mexicolore (mexicolore.co.uk, ressource de reference sur les Azteques)
   * met nahual.fr en Link of the Month de decembre 2026. Le public attendu
   * est petit mais fait d'inities : ils lisent les gloses.
   *
   * Or le site disait « le cerf est ton nahual », donc il nommait l'ANIMAL
   * nahual, alors que son propre Codex dit correctement, deux sections plus
   * loin, que le tonalli est lie au jour de naissance (Lopez Austin, cite en
   * bibliographie). Le canon reserve *tonal* a l'animal et *nahualli* a la
   * personne qui passe. L'usage mexicain d'aujourd'hui, celui qu'on parle a
   * la maison, dit bien nahual pour l'animal -- et le site garde ce mot
   * vivant. Mais il doit alors le DIRE : sans la phrase, un lecteur qui
   * connait ne lit pas un choix, il lit une contradiction interne.
   *
   * D'ou cet oracle : la clarification ne peut plus disparaitre d'une langue
   * sans faire rougir la suite. C'est la seule garantie qu'elle soit
   * structurelle et pas une retouche de decembre.
   */
  const LANGUES = ["fr", "en", "es"] as const;

  it("la section du cerf porte les trois mots, dans les trois langues", () => {
    for (const loc of LANGUES) {
      const texte = (dicos[loc].get("codex.totem.text") ?? "").toLowerCase();
      expect(texte, `${loc} : le mot vivant`).toContain("nahual");
      expect(texte, `${loc} : le mot ancien`).toMatch(/(^|[^a-z])tonal([^a-z]|$)/);
      expect(texte, `${loc} : celui qui passe`).toContain("nahualli");
    }
  });

  it("la section du cerf nomme Tlaloc, le patron atteste du signe", () => {
    // F2 de l'audit : les attributs donnes au cerf (messager entre les
    // mondes, grace, vigilance, art de cacher sa vraie nature) ne sont
    // sourcables ni dans Sahagun ni dans Lopez Austin, les deux sources que
    // le Codex cite lui-meme. L'association attestee, elle, manquait :
    // dans le compte des jours, Mazatl releve de Tlaloc.
    for (const loc of LANGUES) {
      expect(dicos[loc].get("codex.totem.text"), `${loc} : Tlaloc`).toMatch(/Tl[aá]loc/);
    }
  });

  it("la scene du Centre ne laisse pas nahual seul sur l'animal", () => {
    // C'est le texte le plus lu du site (description de scene, lue aussi
    // par les lecteurs d'ecran) : la clarification doit y tenir en un mot.
    for (const loc of LANGUES) {
      const texte = (dicos[loc].get("common.sceneDescriptions.jade") ?? "").toLowerCase();
      expect(texte, `${loc} : le mot ancien dans la scene`).toMatch(/(^|[^a-z])tonal([^a-z]|$)/);
    }
  });

  it("si le paragraphe du hero revient, il porte la meme clarification", () => {
    // `home.heroText` est supprime par la partition du Centre (branche
    // texte/partition-centre, PR ouverte). Il existe encore sur dev, et il
    // portait la meme inversion : on le corrige ici, et cet oracle tient
    // quel que soit le sort de la PR.
    for (const loc of LANGUES) {
      const texte = dicos[loc].get("home.heroText");
      if (texte === undefined) continue;
      expect(texte.toLowerCase(), `${loc} : hero`).toMatch(/(^|[^a-z])tonal([^a-z]|$)/);
    }
  });
});

describe("i18n : la description dit de quoi le site parle", () => {
  /**
   * MESURE DU 27/10 : les trois langues portaient une phrase d'agence
   * interchangeable (« Transforme ta vision en realite digitale »), reprise
   * telle quelle dans la meta description, og:description,
   * twitter:description et les TROIS blocs JSON-LD. Avec un public
   * d'inities, le multiplicateur n'est pas le volume, c'est le partage :
   * la carte generee ne disait rien du sujet qui les avait amenes.
   */
  const ANCRES = {
    fr: ["cerf", "nahua"],
    en: ["stag", "nahua"],
    es: ["venado", "nahua"],
  } as const;

  it("chaque description nomme le sujet, dans sa langue", () => {
    for (const [loc, ancres] of Object.entries(ANCRES) as [keyof typeof ANCRES, readonly string[]][]) {
      const d = (dicos[loc].get("metadata.description") ?? "").toLowerCase();
      for (const ancre of ancres) expect(d, `${loc} : ${ancre}`).toContain(ancre);
    }
  });

  it("aucune description ne depasse la limite d'affichage de Google", () => {
    // 160 caracteres : au-dela, le snippet est coupe, et c'est la fin de la
    // phrase qui saute, donc le sujet si on le met a la fin.
    for (const loc of ["fr", "en", "es"] as const) {
      expect((dicos[loc].get("metadata.description") ?? "").length, loc).toBeLessThanOrEqual(160);
    }
  });

  it("aucune description n'est coupee par la carte de partage", () => {
    // La carte a son propre seuil, mesure le 13/09 sur capture : au-dela, le
    // texte passait sur la Piedra et sur la rosette. On interroge `couper`
    // plutot que de recopier son nombre ici : le jour ou il bouge, l'oracle
    // bouge avec lui. Premiere version des phrases du 27/10 : 140 a 149
    // caracteres, donc trois cartes sur trois finissaient en « … ».
    for (const loc of ["fr", "en", "es"] as const) {
      const d = dicos[loc].get("metadata.description") ?? "";
      expect(couper(d), `${loc} : la carte coupe la chute de la phrase`).toBe(d);
    }
  });

  it("les trois descriptions sont distinctes", () => {
    // Le defaut jumeau de celui du 09/09 : une langue recopiee sur l'autre
    // passe tous les tests de parite et ne se voit nulle part.
    const vues = new Set(["fr", "en", "es"].map((loc) => dicos[loc as "fr"].get("metadata.description")));
    expect(vues.size, "trois langues, trois phrases").toBe(3);
  });
});
