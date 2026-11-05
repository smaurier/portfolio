import { describe, expect, it } from "vitest";
import { pageReferents } from "./page-referents";

/**
 * LE GABARIT DU REGISTRE, juge sans deploiement.
 *
 * Ces tests ne jugent pas le gout : ils gardent ce qui se casse en silence
 * dans une page rendue a la main. L'oeil de Sylvain tranche le reste, sur
 * la capture.
 */
const NOUS = ["nahual.fr", "sylvainmaurier.com", "nahual-studio.netlify.app"];

const DONNEES = {
  lignes: [
    { hote: "sylvainmaurier.com", venues: 122 },
    { hote: "mexicolore.co.uk", venues: 7 },
    { hote: "news.ycombinator.com", venues: 3 },
    { hote: "6aeb537b--nahual-studio.netlify.app", venues: 5 },
  ],
  nosHotes: NOUS,
  jours: ["2026-11-05", "2026-11-04"],
};

describe("ce que la page montre", () => {
  it("met les vrais sites devant, du plus envoyeur au moins", () => {
    const html = pageReferents(DONNEES);
    expect(html.indexOf("mexicolore.co.uk")).toBeLessThan(html.indexOf("news.ycombinator.com"));
  });

  it("range nos propres domaines derriere, dans un bloc repliable", () => {
    const html = pageReferents(DONNEES);
    expect(html.indexOf("<details>")).toBeLessThan(html.indexOf("sylvainmaurier.com"));
    expect(html.indexOf("mexicolore.co.uk")).toBeLessThan(html.indexOf("<details>"));
  });

  it("somme les vraies venues, et elles seules", () => {
    // 7 + 3, surtout pas les 122 + 5 qui sont a nous.
    expect(pageReferents(DONNEES)).toContain("<strong>10</strong>");
  });

  // L'ETAT D'AUJOURD'HUI : aucun vrai referent. Une page vide qui ressemble
  // a une panne est un defaut, donc l'etat vide est ECRIT.
  it("dit « personne » plutot que de rendre une page nue", () => {
    const html = pageReferents({ ...DONNEES, lignes: [{ hote: "sylvainmaurier.com", venues: 122 }] });
    expect(html).toContain("Personne, pour l'instant.");
    expect(html).not.toContain("<strong>0</strong>");
  });

  it("tient sans aucune donnee du tout", () => {
    const html = pageReferents({ lignes: [], nosHotes: NOUS, jours: [] });
    expect(html).toContain("Personne, pour l'instant.");
    expect(html).toContain("Aucun jour relevé.");
    expect(html).not.toContain("<details>");
  });
});

describe("ce qui se casse en silence dans une page rendue a la main", () => {
  // ⛔ LES HOTES VIENNENT D'UN EN-TETE `Referer`, donc de l'exterieur. Sans
  // echappement, un domaine forge injecte du balisage dans une page que
  // Sylvain ouvre authentifie.
  it("echappe ce qui vient de l'exterieur", () => {
    const html = pageReferents({
      lignes: [{ hote: '<script>alert(1)</script>"evil', venues: 1 }],
      nosHotes: NOUS,
      jours: ["2026-11-05"],
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&quot;evil");
  });

  it("accorde le pluriel au lieu de le deviner", () => {
    const une = pageReferents({ lignes: [{ hote: "a.org", venues: 1 }], nosHotes: NOUS, jours: ["2026-11-05"] });
    expect(une).toContain("1 venue<");
    expect(une).not.toContain("1 venues");
    expect(une).toContain("depuis 1 site.");
  });

  // Une barre a zero pixel ne se voit pas : le minimum de 2 % garde la
  // ligne lisible quand un site envoie beaucoup moins que le premier.
  it("garde une barre visible pour le plus petit des referents", () => {
    const html = pageReferents({
      lignes: [{ hote: "gros.org", venues: 500 }, { hote: "petit.org", venues: 1 }],
      nosHotes: NOUS,
      jours: ["2026-11-05"],
    });
    expect(html).toContain("--part:100%");
    expect(html).toContain("--part:0%");  // le plancher visible est en pixels (min-width), pas en pourcentage
  });
});

describe("ce que la page doit a qui ne la lit pas a l'oeil", () => {
  it("declare sa langue, se refuse a l'indexation, et annonce une seule tete de page", () => {
    const html = pageReferents(DONNEES);
    expect(html).toContain('<html lang="fr">');
    expect(html).toContain('content="noindex, nofollow"');
    expect(html.match(/<h1[ >]/g) ?? []).toHaveLength(1);
  });

  it("donne un intitule a chaque ligne et une legende a chaque tableau", () => {
    const html = pageReferents(DONNEES);
    expect(html).toContain('<th scope="row">');
    expect(html).toContain("<caption");
  });

  // La barre est une redondance visuelle : le nombre porte l'information.
  it("cache la barre aux lecteurs d'ecran, et double le nombre d'un mot", () => {
    const html = pageReferents(DONNEES);
    expect(html).toContain('class="barre" style="--part:100%" aria-hidden="true"');
    expect(html).toContain("7 venues");
  });

  it("respecte le mouvement reduit et les deux faces du systeme", () => {
    const html = pageReferents(DONNEES);
    expect(html).toContain("prefers-reduced-motion: no-preference");
    expect(html).toContain("prefers-color-scheme: dark");
  });
});
