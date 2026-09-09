import { describe, expect, it } from "vitest";
import fr from "../dictionaries/fr.json";
import en from "../dictionaries/en.json";
import es from "../dictionaries/es.json";

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
      const vides = [...d.entries()].filter(([, v]) => v.trim().length === 0).map(([k]) => k);
      expect(vides, `${loc} : ${vides.length} valeurs vides`).toEqual([]);
    }
  });

  it("les cinq sorties de scene sont traduites, cardinal, phrase et suite", () => {
    // Le defaut jumeau du 09/09 : la table des sorties de scene vivait dans
    // le composant, en francais seulement, donc les DIX pages etrangeres
    // finissaient sur « Le nombril du monde. D'ou partent les chemins. »
    // C'est la derniere chose qu'un jury lit sur chaque page.
    for (const dir of ["jade", "dore", "turquoise", "cendre", "obsidienne"]) {
      for (const champ of ["cardinal", "poetic", "nextLabel"]) {
        const cle = `closure.${dir}.${champ}`;
        for (const loc of ["fr", "en", "es"] as const) {
          expect(dicos[loc].get(cle), `${loc} ${cle}`).toBeTruthy();
        }
      }
      // Et elles ne sont pas juste recopiees du francais.
      const frPhrase = dicos.fr.get(`closure.${dir}.poetic`);
      for (const loc of ["en", "es"] as const) {
        expect(dicos[loc].get(`closure.${dir}.poetic`), `${loc} ${dir} : phrase non traduite`).not.toBe(frPhrase);
      }
    }
  });
});
