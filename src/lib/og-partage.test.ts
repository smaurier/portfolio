import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { altPartage } from "./og-partage";
import fr from "../dictionaries/fr.json";
import en from "../dictionaries/en.json";
import es from "../dictionaries/es.json";

/**
 * L'ALTERNATIVE DE LA CARTE DE PARTAGE, DANS LA LANGUE DE LA PAGE (27/10).
 *
 * Mesure du jour, sur la production, page anglaise :
 *   <meta property="og:image:alt" content="Nahual · studio de création"/>
 * En francais. Sur /en comme sur /es. Et le titre dessine DANS la carte de
 * l'accueil venait de la meme constante francaise (STUDIO_NAME) : un lien
 * partage depuis la page anglaise montrait une carte francaise.
 *
 * Pourquoi c'etait structurel et pas une faute de frappe : la convention de
 * fichier de Next veut un `alt` de type string a la racine du module (doc
 * officielle opengraph-image), donc une constante, donc une seule langue,
 * alors que la route est dynamique par locale. La primitive qui porte un alt
 * PAR IMAGE est `generateImageMetadata`, qui recoit les params de la route
 * (doc officielle generate-image-metadata).
 *
 * ⚠️ Mais elle a un prix, mesure le 27/10 : elle suffixe l'URL de l'image
 * d'un identifiant (`/en/opengraph-image/en?hash`). L'accueil s'en moque, il
 * laisse Next ecrire l'URL ; les pages interieures, elles, la construisent en
 * dur dans `page.tsx` et leurs cartes seraient parties en 404. D'ou le
 * partage des roles que ces oracles figent : l'accueil par la primitive, les
 * pages interieures par leur propre metadata, et UN SEUL constructeur d'alt
 * pour les deux.
 */

const ROUTE_ACCUEIL = join(process.cwd(), "src", "app", "[locale]", "opengraph-image.tsx");
const ROUTE_PAGES = join(process.cwd(), "src", "app", "[locale]", "[slug]", "opengraph-image.tsx");
const PAGE_INTERIEURE = join(process.cwd(), "src", "app", "[locale]", "[slug]", "page.tsx");
const lis = (chemin: string) => readFileSync(chemin, "utf8");

describe("og-partage : l'alt suit la langue de la page", () => {
  it("l'accueil prend le titre de sa langue", () => {
    expect(altPartage(en.metadata.title)).toBe("Nahual . creative studio");
    expect(altPartage(es.metadata.title)).toBe("Nahual . estudio creativo");
  });

  it("une page interieure joint ses lignes par le point median", () => {
    expect(altPartage("Services", "Nahual")).toBe("Services · Nahual");
    expect(altPartage("Teyolía · Mémoire", "Nahual")).toBe("Teyolía · Mémoire · Nahual");
  });

  it("une ligne absente ou vide ne laisse pas de separateur orphelin", () => {
    expect(altPartage("Nahual", undefined)).toBe("Nahual");
    expect(altPartage(undefined, "Nahual")).toBe("Nahual");
    expect(altPartage("Nahual", "   ")).toBe("Nahual");
  });

  it("aucun alt etranger ne parle francais", () => {
    for (const dict of [en, es]) {
      expect(altPartage(dict.metadata.title)).not.toContain("studio de création");
    }
  });

  it("les trois langues donnent trois alt distincts", () => {
    const vus = new Set([fr, en, es].map((d) => altPartage(d.metadata.title)));
    expect(vus.size, "trois langues, trois alternatives").toBe(3);
  });

  it("plus aucune route OG n'expose de constante alt figee", () => {
    // C'est l'oracle qui tient dans le temps : reintroduire
    // `export const alt = "..."` reconstruit exactement le defaut du 27/10.
    for (const route of [ROUTE_ACCUEIL, ROUTE_PAGES]) {
      expect(lis(route), route).not.toMatch(/export const alt/);
      expect(lis(route), route).not.toMatch(/STUDIO_NAME/);
    }
  });

  it("l'accueil porte son alt par la primitive, les pages interieures non", () => {
    expect(lis(ROUTE_ACCUEIL)).toMatch(/generateImageMetadata/);
    // ⛔ Pas dans la route des pages : l'identifiant ajoute a l'URL casserait
    // le lien construit en dur par page.tsx (404 sur chaque carte).
    expect(lis(ROUTE_PAGES).replace(/\/\*[\s\S]*?\*\//g, "")).not.toMatch(/generateImageMetadata/);
  });

  it("l'accueil construit son alt par le constructeur", () => {
    expect(lis(ROUTE_ACCUEIL)).toMatch(/altPartage/);
  });

  it("la page interieure tire son alt de son titre, jamais d'une constante", () => {
    // Elle ne passe PAS par `altPartage` : son fichier est gele a 635 lignes
    // par le cliquet des tailles (tests/harnais/cliquets.test.ts) et la seule
    // ligne d'import le faisait reculer. Le cliquet ne recule pas, donc c'est
    // l'import qui cede : l'alt y reste un assemblage de deux valeurs qui
    // viennent deja du dictionnaire. Ce qui est garde ici, c'est le seul
    // point qui comptait : aucune constante de langue dans cet alt.
    const ligne = lis(PAGE_INTERIEURE).split("\n").find((l) => l.includes("alt:")) ?? "";
    expect(ligne, "l'alt de la page").toMatch(/pageTitle/);
    expect(ligne, "l'alt de la page").not.toMatch(/studio de/);
  });
});
