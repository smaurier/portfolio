import { test, expect, devices } from "@playwright/test";

/**
 * LA MATIERE EXISTE AUSSI SUR TELEPHONE (14/09).
 *
 * Les deux nappes plein ecran, le grain de l'amate sur la face claire et le
 * poli de l'obsidienne sur la nuit, avaient ete coupees sous 900 px le
 * 14/09 au matin, au nom d'un cout mesure a « 20 puis 15 images par seconde
 * au cinquieme centile ». Cette mesure ne valait rien : elle lisait une
 * mediane d'ecarts d'images, qui ne tombe que dans quelques paliers (1000/50,
 * 1000/66, 1000/80) et ne distingue donc pas 15 de 20.
 *
 * Remesure du 14/09 au soir, Pixel 7, processeur divise par quatre, en
 * production, sur des fenetres de duree FIXE dont on compte les images, et
 * en ALTERNANT avec et sans pour que la derive de la machine ne decide pas :
 *
 *   face claire : avec 216 images, sans 226   (4,4 % d'ecart)
 *   face nuit   : avec 234 images, sans 225   (4,0 % A L'ENVERS)
 *
 * Les plages se recouvrent (208 a 220 contre 212 a 232). Le cout de ces deux
 * nappes n'est pas mesurable sur cette machine, et il n'est en aucun cas la
 * perte d'un quart des images qui avait justifie la coupe.
 *
 * Elles sont donc rendues au telephone. Cet oracle les y garde : c'est la
 * matiere du site, pas un ornement de grand ecran.
 */
const PHONE = { ...devices["Pixel 7"] };

type Cas = { face: "light" | "dark"; classe: string; nom: string };
const CAS: Cas[] = [
  { face: "light", classe: ".grainAmate", nom: "le grain de l'amate" },
  { face: "dark", classe: ".poliObsidienne", nom: "le poli de l'obsidienne" },
];

for (const { face, classe, nom } of CAS) {
  test(`telephone, face ${face === "light" ? "claire" : "nuit"} : ${nom} est la`, async ({ browser }) => {
    test.setTimeout(150_000);
    const ctx = await browser.newContext({ ...PHONE });
    await ctx.addInitScript((f) => {
      try {
        localStorage.setItem("nahual-theme", f);
      } catch {}
    }, face);
    const page = await ctx.newPage();
    await page.goto("/fr/projets?shaders-prod&veille=off");
    await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, { timeout: 120_000 });
    // La matiere est cuite en douze temps morts, pour ne bloquer le fil
    // principal d'aucune tache longue : on l'attend, comme le visiteur.
    await page.waitForFunction(
      (v) => !!document.documentElement.style.getPropertyValue(v),
      face === "light" ? "--grain-amate" : "--poli-obsidienne",
      { timeout: 60_000 },
    );

    const etat = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return { present: false, display: "", image: "", opacite: "" };
      const s = getComputedStyle(el);
      return { present: true, display: s.display, image: s.backgroundImage, opacite: s.opacity };
    }, classe);

    expect(etat.present, `${classe} est dans la page`).toBe(true);
    expect(etat.display, `${classe} n'est pas coupe sur telephone`).not.toBe("none");
    // Une nappe sans son image cuite serait un calque vide : c'est la
    // matiere qu'on garde, pas la balise.
    expect(etat.image, `${classe} porte bien sa matiere cuite`).toContain("url(");
    expect(Number(etat.opacite), `${classe} se voit`).toBeGreaterThan(0.05);
    await ctx.close();
  });
}
