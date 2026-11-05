import { describe, expect, it } from "vitest";
import { classerReferents, cheminCompte, cleDuJour, clesPerimees, hoteReferent, paysCompte } from "./referents";

/**
 * Le site de Sylvain, tel que la fonction le connait a l'execution. La
 * comparaison doit tenir avec et sans `www`, parce que les deux formes
 * circulent dans les liens d'autrui.
 */
const NAHUAL = ["nahual.fr"];

/**
 * TOUT CE QUI SERT CE SITE, tel que la fonction edge le lui passe : l'hote
 * de la requete en cours, plus les domaines connus du site.
 */
const NOUS = ["nahual.fr", "sylvainmaurier.com", "nahual-studio.netlify.app"];

describe("hoteReferent (ce qu'on garde d'un en-tete Referer)", () => {
  it("rend le domaine d'un vrai site referent", () => {
    expect(hoteReferent("https://www.mexicolore.co.uk/aztecs/links/mexica-teachers", NAHUAL)).toBe(
      "mexicolore.co.uk",
    );
  });

  // LE `www` TOMBE, ET C'EST UN CHOIX. `www.mexicolore.co.uk` et
  // `mexicolore.co.uk` sont le meme site pour qui lit le compteur : les
  // garder separes couperait un chiffre en deux sans rien apprendre.
  it("ramene les deux formes d'un meme site sur une seule ligne", () => {
    expect(hoteReferent("https://mexicolore.co.uk/", NAHUAL)).toBe("mexicolore.co.uk");
    expect(hoteReferent("https://www.mexicolore.co.uk/", NAHUAL)).toBe("mexicolore.co.uk");
  });

  it("met le domaine en minuscules", () => {
    expect(hoteReferent("https://WWW.Mexicolore.CO.UK/aztecs", NAHUAL)).toBe("mexicolore.co.uk");
  });

  // UNE NAVIGATION INTERNE N'EST PAS UNE VENUE. Sans ce filtre, chaque clic
  // dans le site compterait comme un referent et noierait les vrais.
  it("ignore le site lui-meme, avec ou sans www", () => {
    expect(hoteReferent("https://nahual.fr/fr/projets", NAHUAL)).toBeNull();
    expect(hoteReferent("https://www.nahual.fr/fr", NAHUAL)).toBeNull();
  });

  it("ignore un sous-domaine du site, le wiki par exemple", () => {
    expect(hoteReferent("https://wiki.nahual.fr/page", NAHUAL)).toBeNull();
  });

  it("rend null quand l'en-tete est absent ou vide", () => {
    expect(hoteReferent(null, NAHUAL)).toBeNull();
    expect(hoteReferent("", NAHUAL)).toBeNull();
    expect(hoteReferent("   ", NAHUAL)).toBeNull();
  });

  it("rend null sur une valeur qui n'est pas une URL, sans lever", () => {
    expect(hoteReferent("pas-une-url", NAHUAL)).toBeNull();
    expect(hoteReferent("javascript:alert(1)", NAHUAL)).toBeNull();
  });

  // ON NE GARDE QUE LE WEB. Un referent `file://` ou `data:` n'est pas une
  // venue depuis un site, et son `hostname` est vide.
  it("rend null pour un schema qui n'est pas http(s)", () => {
    expect(hoteReferent("file:///C:/page.html", NAHUAL)).toBeNull();
  });

  // RIEN DU CHEMIN NE SURVIT. C'est la garantie qui tient la phrase de la
  // page vie privee : on ne stocke pas ou la personne etait, seulement de
  // quel site elle vient.
  it("ne laisse passer ni chemin, ni requete, ni fragment", () => {
    const hote = hoteReferent("https://exemple.org/a/b?q=secret#ancre", NAHUAL);
    expect(hote).toBe("exemple.org");
    expect(hote).not.toContain("/");
    expect(hote).not.toContain("secret");
  });
});

describe("cleDuJour (la cle sous laquelle on compte)", () => {
  it("colle le jour UTC devant le domaine", () => {
    expect(cleDuJour("mexicolore.co.uk", new Date("2026-11-04T10:20:30Z"))).toBe(
      "2026-11-04/mexicolore.co.uk",
    );
  });

  // DEUX VISITES DU MEME JOUR PARTAGENT UNE CLE, deux jours differents non :
  // c'est ce decoupage qui rend le compteur lisible dans le temps et qui
  // limite la perte quand deux ecritures se croisent.
  it("separe deux jours et rassemble un meme jour", () => {
    const matin = cleDuJour("exemple.org", new Date("2026-11-04T06:00:00Z"));
    const soir = cleDuJour("exemple.org", new Date("2026-11-04T23:59:59Z"));
    const lendemain = cleDuJour("exemple.org", new Date("2026-11-05T00:00:00Z"));
    expect(matin).toBe(soir);
    expect(lendemain).not.toBe(matin);
  });
});

// ⛔ LE DEFAUT QUI A FAIT COMPTER 122 FAUSSES VENUES EN UN JOUR (05/11/2026).
// `sylvainmaurier.com` est un ALIAS du meme site Netlify (`domain_aliases` de
// `nahual-studio`) : la meme application, servie sous un autre nom. Chaque
// navigation interne sous cet alias ressortait donc comme un referent
// exterieur, et le compteur annoncait un trafic qui n'existait pas. Un seul
// domaine en dur ne peut pas tenir : un site a autant de noms qu'on lui en
// donne, et ils changent sans que le code le sache.
describe("hoteReferent : tout ce qui sert ce site n'est jamais un referent", () => {
  it("ignore un alias du site, qui sert la meme application", () => {
    expect(hoteReferent("https://sylvainmaurier.com/fr/projets", NOUS)).toBeNull();
    expect(hoteReferent("https://www.sylvainmaurier.com/fr", NOUS)).toBeNull();
  });

  it("ignore l'adresse Netlify du site", () => {
    expect(hoteReferent("https://nahual-studio.netlify.app/fr", NOUS)).toBeNull();
  });

  // Les URL uniques de deploiement portent un `--`, pas un point : elles ne
  // sont pas des sous-domaines au sens de la regle precedente, et elles
  // etaient comptees. Mesure du 05/11 : 7 et 5 venues fantomes.
  it("ignore une URL unique de deploiement (prefixe en --)", () => {
    expect(hoteReferent("https://6aeb537ba8ed72ff08c431a6--nahual-studio.netlify.app/fr", NOUS)).toBeNull();
  });

  it("garde un vrai site exterieur, meme avec plusieurs domaines a nous", () => {
    expect(hoteReferent("https://www.mexicolore.co.uk/aztecs/links", NOUS)).toBe("mexicolore.co.uk");
  });

  // ⚠️ Le piege a eviter en corrigeant : une regle trop large qui ecarterait
  // tout ce qui ressemble a nos noms. Ces deux sites ne sont pas a nous.
  it("ne confond pas avec un domaine qui contient le notre", () => {
    expect(hoteReferent("https://nahual.fr.exemple.org/", NOUS)).toBe("nahual.fr.exemple.org");
    expect(hoteReferent("https://pas-nahual.fr/", NOUS)).toBe("pas-nahual.fr");
  });
});

// ── LE TRI DU REGISTRE ────────────────────────────────────────────────────
describe("classerReferents : separer ce qui vient d'ailleurs de ce qui vient de nous", () => {
  const lignes = [
    { hote: "sylvainmaurier.com", venues: 122 },
    { hote: "mexicolore.co.uk", venues: 3 },
    { hote: "6aeb537b--nahual-studio.netlify.app", venues: 5 },
    { hote: "news.ycombinator.com", venues: 9 },
    { hote: "wiki.nahual.fr", venues: 2 },
  ];

  // LE RELEVE D'AVANT LE CORRECTIF RESTE DANS LE STOCKAGE : les cles sont par
  // jour, donc le passe n'est pas reecrit. La page doit le ranger, pas le
  // cacher, sinon le total en tete ment pour toujours.
  it("met de cote tout ce qui sert ce site", () => {
    const { notres } = classerReferents(lignes, NOUS);
    expect(notres.map((l) => l.hote)).toEqual([
      "sylvainmaurier.com",
      "6aeb537b--nahual-studio.netlify.app",
      "wiki.nahual.fr",
    ]);
  });

  it("garde les vrais sites, et les classe du plus envoyeur au moins", () => {
    const { exterieurs } = classerReferents(lignes, NOUS);
    expect(exterieurs).toEqual([
      { hote: "news.ycombinator.com", venues: 9 },
      { hote: "mexicolore.co.uk", venues: 3 },
    ]);
  });

  it("rend deux listes vides sans rien casser quand il n'y a rien", () => {
    expect(classerReferents([], NOUS)).toEqual({ exterieurs: [], notres: [] });
  });

  // ⚠️ L'ETAT QUI COMPTE AUJOURD'HUI, et qu'il ne faut pas confondre avec une
  // panne : aucun vrai referent, mais du trafic a nous dans l'historique.
  it("distingue « personne encore » de « rien du tout »", () => {
    const { exterieurs, notres } = classerReferents(
      [{ hote: "sylvainmaurier.com", venues: 122 }],
      NOUS,
    );
    expect(exterieurs).toEqual([]);
    expect(notres).toHaveLength(1);
  });
});

// ── LA PROMESSE D'UN AN ───────────────────────────────────────────────────
describe("clesPerimees : une duree annoncee doit etre appliquee", () => {
  // ⛔ La page vie privee dit desormais << les totaux quotidiens sont
  // effaces au bout d'un an >>. Une duree ecrite et jamais appliquee est
  // pire que pas de duree : elle est verifiable, et fausse.
  const LE_JOUR = new Date("2027-03-01T10:00:00Z");

  it("garde ce qui a moins d'un an, efface ce qui a plus", () => {
    const cles = [
      "2026-03-02/mexicolore.co.uk", // 364 jours : garde
      "2026-03-01/mexicolore.co.uk", // 365 jours pile : garde
      "2026-02-28/mexicolore.co.uk", // 366 jours : efface
      "2025-11-04/sylvainmaurier.com", // bien plus vieux : efface
    ];
    expect(clesPerimees(cles, LE_JOUR, 365)).toEqual([
      "2026-02-28/mexicolore.co.uk",
      "2025-11-04/sylvainmaurier.com",
    ]);
  });

  it("ne touche a rien quand tout est recent", () => {
    expect(clesPerimees(["2027-02-28/a.org"], LE_JOUR, 365)).toEqual([]);
  });

  // ⚠️ UNE CLE QU'ON NE SAIT PAS DATER NE S'EFFACE PAS. Effacer sur un
  // doute, c'est perdre une donnee pour une erreur de format.
  it("laisse en place une cle illisible plutot que de la supprimer", () => {
    expect(clesPerimees(["pas-une-date/a.org", "/vide", ""], LE_JOUR, 365)).toEqual([]);
  });

  it("tient sur un stockage vide", () => {
    expect(clesPerimees([], LE_JOUR, 365)).toEqual([]);
  });
});

// ── LES DEUX AUTRES MESURES ───────────────────────────────────────────────
describe("cheminCompte : la page d'arrivee, reduite a ce qui s'agrege", () => {
  it("retire la barre de tete pour ne pas doubler le separateur de cle", () => {
    expect(cheminCompte("/fr/projets")).toBe("fr/projets");
  });

  it("nomme l'accueil plutot que de rendre une chaine vide", () => {
    expect(cheminCompte("/")).toBe("(accueil)");
    expect(cheminCompte("")).toBe("(accueil)");
  });

  it("met en minuscules, pour que deux casses ne fassent qu'une ligne", () => {
    expect(cheminCompte("/FR/Projets")).toBe("fr/projets");
  });

  // ⛔ NI REQUETE NI FRAGMENT : un `?token=` ou un `#ancre` transformerait un
  // compteur de pages en journal de parametres, donc en donnee sur quelqu'un.
  it("ne garde ni requete ni fragment", () => {
    expect(cheminCompte("/fr/contact?token=secret#bas")).toBe("fr/contact");
  });

  it("borne la longueur, un chemin absurde ne fait pas une cle absurde", () => {
    expect(cheminCompte("/" + "a".repeat(400)).length).toBeLessThanOrEqual(120);
  });

  it("enleve la barre de fin, /fr et /fr/ sont la meme page", () => {
    expect(cheminCompte("/fr/")).toBe("fr");
  });
});

describe("paysCompte : un code pays, ou rien d'invente", () => {
  it("garde le code ISO en majuscules", () => {
    expect(paysCompte("fr")).toBe("FR");
  });

  // ⚠️ On ne devine pas un pays absent : une ligne « inconnu » est un fait,
  // un pays suppose est un faux.
  it("dit « inconnu » plutot que de supposer", () => {
    expect(paysCompte(undefined)).toBe("(inconnu)");
    expect(paysCompte("")).toBe("(inconnu)");
    expect(paysCompte("pas-un-code")).toBe("(inconnu)");
  });
});
