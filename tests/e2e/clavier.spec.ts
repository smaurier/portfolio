import { test, expect } from "@playwright/test";

/**
 * LE CLAVIER, DU HAUT AU BAS (11/09, A3 du backlog).
 *
 * Tout ce qui est dans la scene doit exister hors de la scene, et le
 * parcours au clavier doit suivre l'ordre du document, sans piege, avec un
 * focus visible (globals.css : `a:focus-visible`, `button:focus-visible`).
 * La cloture de page a son lien en tabIndex -1 et aria-hidden depuis le
 * 29/08 (le header offre la meme destination) : il ne compte pas.
 *
 * Deux oracles : la suite des elements atteints par Tab est exactement la
 * suite des focalisables visibles dans l'ordre du document ; et chacun,
 * une fois focalise au clavier, porte un contour (outline) non nul. Joue en
 * haut de page, puis apres l'acte de sortie (bas de page), ou le DOM a
 * change (chapitres reveles, cloture).
 */
type Releve = { tag: string; texte: string; outline: number; dansDoc: boolean };

async function parcours(page: import("@playwright/test").Page, max: number): Promise<Releve[]> {
  const out: Releve[] = [];
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    // Le temps d'une transition de focus (le lien d'evitement glisse en 0,2 s).
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body || el.tagName === "NEXTJS-PORTAL") return { tag: "BODY", texte: "", outline: 0, dansDoc: false };
      const cs = getComputedStyle(el);
      const outline = cs.outlineStyle === "none" ? 0 : parseFloat(cs.outlineWidth || "0");
      const ombre = cs.boxShadow && cs.boxShadow !== "none" ? 1 : 0;
      // RGAA 10.7 : le focus doit etre visible, la forme est libre.
      // Le lien d'evitement (href="#main") est hors ecran (translateY -140 %)
      // jusqu'au focus, ou il descend dans le cadre : arriver a l'ecran est
      // son indication.
      const rect = el.getBoundingClientRect();
      const apparu = el.getAttribute("href") === "#main" && rect.top >= 0 && rect.bottom > 0 && rect.width > 1 ? 1 : 0;
      return { tag: el.tagName, texte: (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 40), outline: Math.max(outline, ombre, apparu), dansDoc: true };
    });
    out.push(r);
    if (r.tag === "BODY" && i > 5) break;
  }
  return out;
}

async function focalisablesVisibles(page: import("@playwright/test").Page): Promise<string[]> {
  return page.evaluate(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'));
    return els
      .filter((el) => {
        if (el.getAttribute("tabindex") === "-1" || el.closest('[aria-hidden="true"]') || el.closest("nextjs-portal")) return false;
        if ((el as HTMLButtonElement).disabled) return false;
        const cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden") return false;
        const r = el.getBoundingClientRect();
        // Les liens d'evitement (sr-only) sont focalisables sans surface : on les garde.
        return r.width > 0 || r.height > 0 || el.classList.contains("sr-only-focusable") || cs.position === "absolute";
      })
      .map((el) => `${el.tagName} ${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 40)}`);
  });
}

for (const bas of [false, true]) {
  test(`parcours au clavier ${bas ? "apres l'acte de sortie" : "en haut de page"} : ordre du document et focus visible`, async ({ page }) => {
    test.setTimeout(150_000);
    await page.goto("/fr/services");
    await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, { timeout: 90_000 });
    await page.waitForTimeout(1500);
    if (bas) {
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForTimeout(2500);
    }
    // Le site pose le focus sur main a l'arrivee (lien d'evitement, annonceur
    // de route), et Chrome garde ce point de depart meme apres un blur : on
    // pose le focus au clavier sur le premier lien du document, comme un
    // lecteur qui reprend du haut.
    await page.evaluate(() => (document.querySelector("a[href]") as HTMLElement | null)?.focus());
    await page.keyboard.press("Shift+Tab");
    const attendus = await focalisablesVisibles(page);
    const releves = await parcours(page, Math.min(attendus.length, 40));
    const atteints = releves.filter((r) => r.dansDoc).map((r) => `${r.tag} ${r.texte}`);
    expect(atteints.length, "des elements sont atteints au clavier").toBeGreaterThan(8);
    // L'ordre : la suite atteinte est un prefixe de la suite du document.
    expect(atteints, "l'ordre de tabulation suit le document").toEqual(attendus.slice(0, atteints.length));
    const sansContour = releves.filter((r) => r.dansDoc && r.outline === 0).map((r) => `${r.tag} ${r.texte}`);
    expect(sansContour, "chaque element focalise au clavier a un contour visible").toEqual([]);
  });
}
