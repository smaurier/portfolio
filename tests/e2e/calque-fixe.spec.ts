import { test, expect, devices } from "@playwright/test";

/**
 * LE CALQUE DE TEXTE SUIT LA FENETRE (13/09, X1 et X4 de l'audit).
 *
 * Le test qui manquait depuis le 25/08 : les chapitres de l'accueil et les
 * clotures des pages echo vivaient dans un calque `absolute` ancre au
 * premier ecran ; ils s'allumaient (opacite 1) a 940 px au-dessus du
 * cadre, et personne ne les a jamais vus sur ordinateur.
 *
 * Oracles :
 *  - sur l'accueil, a trois points de l'arc, tout bloc de texte du calque
 *    dont l'opacite vaut 1 a son rectangle DANS la fenetre ;
 *  - sur les quatre pages echo, la cloture vit dans le flux, apres le
 *    contenu (13/09) : tout en bas, elle est revelee, dans la fenetre, et
 *    elle ne recouvre aucun bloc de contenu.
 */
test.use({ ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } });

async function aller(page: import("@playwright/test").Page, f: number) {
  await page.evaluate((f) => window.scrollTo(0, (document.documentElement.scrollHeight - window.innerHeight) * f), f);
  await page.waitForTimeout(1800);
}

test("accueil : les chapitres allumes sont dans la fenetre", async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto("/fr?shaders-prod");
  await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, { timeout: 90_000 });
  await page.waitForTimeout(2500);
  let allumes = 0;
  for (const f of [0.35, 0.6, 0.95]) {
    await aller(page, f);
    const blocs = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("[data-scene-overlay] [class*='block']")]
        .filter((b) => Number(getComputedStyle(b).opacity) > 0.9 && getComputedStyle(b).display !== "none")
        .map((b) => {
          const r = b.getBoundingClientRect();
          return { texte: (b.textContent ?? "").trim().slice(0, 30), top: Math.round(r.top), bottom: Math.round(r.bottom) };
        }),
    );
    for (const b of blocs) {
      allumes++;
      expect(b.top, `${Math.round(f * 100)} % : « ${b.texte} » commence dans la fenetre`).toBeGreaterThanOrEqual(0);
      expect(b.bottom, `${Math.round(f * 100)} % : « ${b.texte} » finit dans la fenetre`).toBeLessThanOrEqual(800);
    }
  }
  expect(allumes, "au moins un chapitre allume sur les trois points").toBeGreaterThan(0);
});

for (const chemin of ["fr/services", "fr/projets", "fr/contact", "fr/memoire"]) {
  test(`/${chemin} : la cloture, dernier bloc du contenu, est lisible tout en bas`, async ({ page }) => {
    test.setTimeout(150_000);
    await page.goto("/" + chemin + "?shaders-prod");
    await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, { timeout: 90_000 });
    await page.waitForTimeout(2500);
    await aller(page, 1);
    await page.evaluate(() => document.querySelector("[class*='page-closure']")?.scrollIntoView({ block: "center", behavior: "instant" }));
    await page.waitForTimeout(1800);
    const enBas = await page.evaluate(() => {
      const el = document.querySelector<HTMLElement>("[class*='page-closure']");
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const eff = (n: Element | null) => { let o = 1; for (; n; n = n.parentElement) o *= Number(getComputedStyle(n).opacity || "1"); return o; };
      const blocs = [...document.querySelectorAll<HTMLElement>("main h2, main p, main .cantar")].filter((b) => b !== el && !el.contains(b) && !b.contains(el)).map((b) => b.getBoundingClientRect()).filter((q) => q.width > 40 && q.height > 12);
      const recouvre = blocs.filter((q) => !(q.right < r.left || q.left > r.right || q.bottom < r.top || q.top > r.bottom)).length;
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), opacite: eff(el), revelee: el.className.includes("revealed"), recouvre };
    });
    expect(enBas, "la cloture existe").not.toBeNull();
    expect(enBas!.revelee, "revelee en bas de page").toBe(true);
    expect(enBas!.opacite, "visible en bas de page").toBeGreaterThan(0.5);
    expect(enBas!.top).toBeGreaterThanOrEqual(0);
    expect(enBas!.bottom).toBeLessThanOrEqual(800);
    expect(enBas!.recouvre, "elle ne recouvre aucun bloc de contenu").toBe(0);
  });
}
