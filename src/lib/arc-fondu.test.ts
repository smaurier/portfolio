import { describe, expect, it } from "vitest";
import { avancerFonduArc, fonduArcInitial, jourDuFondu, pDuFondu } from "./arc-fondu";
import { dayAtArc, lightPAtArc } from "./arc-day";

/**
 * Profondeur de page ou l'ecart entre deux arcs est le plus parlant : bas
 * de page, la ou chaque direction a fini de raconter son heure.
 */
const PROFOND = 0.9;

describe("fonduArcInitial", () => {
  it("au repos, l'arc est exactement celui de la direction : aucun fondu", () => {
    const etat = fonduArcInitial("turquoise");
    expect(pDuFondu(etat, PROFOND)).toBe(lightPAtArc("turquoise", PROFOND));
    expect(jourDuFondu(etat, PROFOND)).toBe(dayAtArc("turquoise", PROFOND));
  });
});

describe("avancerFonduArc (la traversee d'un arc a l'autre)", () => {
  // LE DEFAUT GARDE ICI (mesure du 16/09, oracle passage-continu). Sud vers
  // Ouest franchissait 50,7 de luminance EN UNE IMAGE, et Nord vers Centre
  // 30,7, alors meme que la teinte du brouillard et le rig de lumiere
  // traversaient deja proprement. La cause : `lightPAtArc` et `dayAtArc`
  // changent d'arc avec la ROUTE, d'un coup, quand tout le reste de
  // l'atmosphere suit l'heure TRAVERSEE. Le Sud et l'Ouest lisent le meme
  // defilement de facon opposee (l'Ouest inverse l'arc : le soleil tombe),
  // donc au meme scroll les deux arcs sont tres loin l'un de l'autre.

  it("ne bouge pas tant que la direction ne change pas", () => {
    let etat = fonduArcInitial("turquoise");
    for (let i = 0; i < 10; i++) etat = avancerFonduArc(etat, "turquoise", 0.06);
    expect(etat.melange).toBe(1);
    expect(etat.sortante).toBeNull();
    expect(pDuFondu(etat, PROFOND)).toBe(lightPAtArc("turquoise", PROFOND));
  });

  it("au changement, la premiere image rend encore l'arc de DEPART", () => {
    const etat = avancerFonduArc(fonduArcInitial("turquoise"), "cendre", 0.06);
    expect(etat.sortante).toBe("turquoise");
    // Le melange a fait un pas, donc on n'est pas exactement sur le depart,
    // mais on en est bien plus pres que de l'arrivee.
    const depart = lightPAtArc("turquoise", PROFOND);
    const arrivee = lightPAtArc("cendre", PROFOND);
    expect(Math.abs(pDuFondu(etat, PROFOND) - depart)).toBeLessThan(Math.abs(arrivee - depart) * 0.1);
  });

  it("AUCUNE IMAGE NE FRANCHIT PLUS DE 7 % DE L'ECART ENTRE LES DEUX ARCS", () => {
    // Sans fondu, une seule image franchit 100 % : c'est la marche mesuree.
    let etat = fonduArcInitial("turquoise");
    let precedent = pDuFondu(etat, PROFOND);
    const ecart = Math.abs(lightPAtArc("cendre", PROFOND) - lightPAtArc("turquoise", PROFOND));
    expect(ecart).toBeGreaterThan(0.1); // sinon le test ne prouverait rien
    let plusGrandPas = 0;
    for (let i = 0; i < 300; i++) {
      etat = avancerFonduArc(etat, "cendre", 0.06);
      const valeur = pDuFondu(etat, PROFOND);
      plusGrandPas = Math.max(plusGrandPas, Math.abs(valeur - precedent));
      precedent = valeur;
    }
    expect(plusGrandPas / ecart).toBeLessThan(0.07);
  });

  it("se pose EXACTEMENT sur l'arc d'arrivee, et oublie celui de depart", () => {
    let etat = fonduArcInitial("turquoise");
    for (let i = 0; i < 300; i++) etat = avancerFonduArc(etat, "cendre", 0.06);
    expect(etat.melange).toBe(1);
    expect(etat.sortante).toBeNull();
    expect(pDuFondu(etat, PROFOND)).toBe(lightPAtArc("cendre", PROFOND));
    expect(jourDuFondu(etat, PROFOND)).toBe(dayAtArc("cendre", PROFOND));
  });

  it("alpha 1 : arrivee immediate, c'est le mouvement reduit", () => {
    // RGAA 13.6 / prefers-reduced-motion : meme convention que la portee et
    // le rig, on snap au lieu de traverser.
    const etat = avancerFonduArc(fonduArcInitial("turquoise"), "cendre", 1);
    expect(etat.melange).toBe(1);
    expect(pDuFondu(etat, PROFOND)).toBe(lightPAtArc("cendre", PROFOND));
  });

  it("le fondu porte sur le JOUR autant que sur la lumiere", () => {
    // Le jour pilote le ciel, les astres et la camera solaire : s'il
    // sautait pendant que la lumiere traverse, on aurait juste deplace la
    // marche d'un etage.
    let etat = fonduArcInitial("cendre");
    let precedent = jourDuFondu(etat, PROFOND);
    const ecart = Math.abs(dayAtArc("obsidienne", PROFOND) - dayAtArc("cendre", PROFOND));
    let plusGrandPas = 0;
    for (let i = 0; i < 300; i++) {
      etat = avancerFonduArc(etat, "obsidienne", 0.06);
      const valeur = jourDuFondu(etat, PROFOND);
      plusGrandPas = Math.max(plusGrandPas, Math.abs(valeur - precedent));
      precedent = valeur;
    }
    if (ecart > 0.05) expect(plusGrandPas / ecart).toBeLessThan(0.07);
    expect(etat.melange).toBe(1);
  });

  it("suit le defilement SANS RETARD une fois pose : ce n'est pas un lissage du scroll", () => {
    // Le point le plus important. On n'easy pas `p`, qui est la molette :
    // on easy la BASCULE d'un arc a l'autre. Une fois le fondu fini, deux
    // defilements differents donnent immediatement deux valeurs
    // differentes, sans la moindre inertie.
    let etat = fonduArcInitial("jade");
    for (let i = 0; i < 300; i++) etat = avancerFonduArc(etat, "jade", 0.06);
    expect(pDuFondu(etat, 0.2)).toBe(lightPAtArc("jade", 0.2));
    expect(pDuFondu(etat, 0.8)).toBe(lightPAtArc("jade", 0.8));
  });
});
