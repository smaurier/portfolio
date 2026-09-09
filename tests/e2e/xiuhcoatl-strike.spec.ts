import { test, expect, type Page } from "@playwright/test";

/**
 * LE GESTE DU MYTHE A LIEU A CHAQUE VISITE (09/09).
 *
 * Au Sud, au climax du midi, le serpent de feu pique sur la Piedra et
 * embrase l'anneau des deux xiuhcoatl graves. Le code le promet
 * explicitement a chaque visite : « si le serpent n'etait pas la (tirage 1/3
 * du vol errant), il surgit du lointain pour la charge ». Mesure du 09/09 :
 * trois visites normales, ZERO serpent dans le graphe, y compris 4,5 s apres
 * le franchissement du seuil. La branche du surgissement etait inatteignable,
 * derriere une garde placee au-dessus d'elle.
 *
 * Ce test verrouille toute la chaine, sans forcer la presence :
 * declenchement par le ciel, surgissement, charge, impact, gerbe de feu.
 *
 * Il tourne sur le serveur de dev avec `?scene=1`, parce que le graphe de la
 * scene et le store ne sont exposes qu'en dev (`window.__nahualScene`,
 * `window.__nahualXiuhcoatl`, meme motif que `__nahualFrost`).
 */

type Snap = {
  at: boolean;
  hit: boolean;
  fire: number;
  stiffen: number;
  gate: number;
};

async function snap(page: Page): Promise<Snap> {
  return page.evaluate(() => {
    const s = (window as unknown as { __nahualXiuhcoatl?: Record<string, never> }).__nahualXiuhcoatl as
      | { strikeAt: number; strikeHit: number; heatGate: number; strike: { fire: number; stiffen: number } }
      | undefined;
    return {
      at: (s?.strikeAt ?? -1) >= 0,
      hit: (s?.strikeHit ?? -1) >= 0,
      fire: s?.strike.fire ?? 0,
      stiffen: s?.strike.stiffen ?? 0,
      gate: s?.heatGate ?? 0,
    };
  });
}

test.describe("la frappe du xiuhcoatl", () => {
  test.describe.configure({ timeout: 180_000 });

  test("sans forcer sa presence, le serpent vient, frappe, et le feu part", async ({ page }) => {
    await page.goto("/fr/projets?scene=1");
    await page.waitForFunction(
      () => !!(window as unknown as { __nahualScene?: unknown }).__nahualScene,
      null,
      { timeout: 60_000 },
    );
    await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, {
      timeout: 60_000,
    });
    await page.waitForTimeout(4000);

    const before = await snap(page);
    expect(before.at, "aucune frappe avant d'avoir scrolle").toBe(false);
    expect(before.hit, "aucun impact avant d'avoir scrolle").toBe(false);

    // Un enregistreur de MAXIMUM dans la page. La fenetre ou la gerbe
    // depasse 0,8 ne dure que ~170 ms (montee 0,05 s, decroissance 0,72 s) :
    // un sondage image par image peut l'enjamber sur une machine chargee, et
    // le test devenait instable. On veut savoir si le pic a EU LIEU, pas
    // s'il avait lieu a l'instant ou l'on regardait.
    await page.evaluate(() => {
      const w = window as unknown as {
        __peak?: { fire: number; stiffen: number; gate: number };
        __nahualXiuhcoatl?: { heatGate: number; strike: { fire: number; stiffen: number } };
      };
      w.__peak = { fire: 0, stiffen: 0, gate: 0 };
      const tick = () => {
        const s = w.__nahualXiuhcoatl;
        const p = w.__peak;
        if (s && p) {
          p.fire = Math.max(p.fire, s.strike.fire);
          p.stiffen = Math.max(p.stiffen, s.strike.stiffen);
          p.gate = Math.max(p.gate, s.heatGate);
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

    // Deux ecrans de scroll : l'arc depasse le seuil du climax (0,7) et le
    // ciel arme la charge.
    await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 1.6, behavior: "instant" }));

    await page.waitForFunction(() => {
      const s = (window as unknown as { __nahualXiuhcoatl?: { strikeAt: number } }).__nahualXiuhcoatl;
      return (s?.strikeAt ?? -1) >= 0;
    }, null, { timeout: 20_000 });

    // LE POINT DU TEST : meme quand le tirage n'a pas mis le serpent dans le
    // ciel, il doit surgir pour la charge.
    //
    // L'oracle est `presence` dans le store, et non la presence de l'objet
    // dans le graphe : le groupe est TOUJOURS monte, avec `visible={false}`,
    // donc le chercher dans le graphe ne prouve rien. `presence` est le fondu
    // d'arrivee ecrit par le composant : il ne monte que s'il est vraiment la
    // et vraiment montre.
    await page.waitForFunction(() => {
      const s = (window as unknown as { __nahualXiuhcoatl?: { presence: number } }).__nahualXiuhcoatl;
      return (s?.presence ?? 0) > 0.05;
    }, null, { timeout: 20_000 });

    // L'impact, puis la gerbe : l'enveloppe ne doit pas etre enjambee par une
    // saccade (cf `advanceStrike`, lib/strike-sequence).
    await page.waitForFunction(() => {
      const s = (window as unknown as { __nahualXiuhcoatl?: { strikeHit: number } }).__nahualXiuhcoatl;
      return (s?.strikeHit ?? -1) >= 0;
    }, null, { timeout: 30_000 });

    // La sequence complete dure ~3,1 s apres l'impact ; on laisse passer.
    await page.waitForTimeout(4000);

    const peak = await page.evaluate(
      () => (window as unknown as { __peak: { fire: number; stiffen: number; gate: number } }).__peak,
    );
    const presence = await page.evaluate(
      () => (window as unknown as { __nahualXiuhcoatl: { presence: number } }).__nahualXiuhcoatl.presence,
    );
    expect(presence, "le serpent est visible dans la scene").toBeGreaterThan(0.05);
    // Avant le correctif du 09/09, la gerbe culminait a 0,03 sur 1 : toute
    // l'enveloppe etait consommee dans l'image ou l'horloge sautait.
    expect(peak.fire, "la gerbe de feu a atteint son pic").toBeGreaterThan(0.8);
    // Le raidissement du serpent ANNONCE le coup : sans lui, le geste arrive
    // sans prevenir. Il ne se voyait jamais avant le correctif.
    expect(peak.stiffen, "le serpent s'est raidi avant de frapper").toBeGreaterThan(0.8);
    // La porte de chaleur ne s'ouvre qu'apres l'impact.
    expect(peak.gate, "l'air tremble apres l'impact").toBeGreaterThan(0.9);
  });
});
