import { test, expect, devices } from "@playwright/test";

/**
 * LE MIROIR FUMANT (13/09) : les deux faces du monde.
 *
 * Oracles :
 *  - le disque d'obsidienne existe dans le bandeau, avec un libelle et un
 *    etat presse ;
 *  - le retourner joue la ceremonie puis pose la face claire sur <html> :
 *    fond de page clair, texte d'encre, contraste tenu (4,5:1) sur les
 *    cinq pages pour le titre et un paragraphe, mesure contre le fond
 *    reellement peint derriere eux ;
 *  - la face survit au rechargement (posee avant le premier paint : au
 *    premier rendu, deja claire) ;
 *  - sous mouvement reduit, pas de fumee, la face change tout de suite ;
 *  - au clavier, le disque se prend et se presse.
 */
test.use({ ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } });

function luminance(rgb: string): number {
  const m = rgb.match(/\d+(\.\d+)?/g)?.map(Number) ?? [0, 0, 0];
  const c = m.slice(0, 3).map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contraste(a: string, b: string): number {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

async function attendre(page: import("@playwright/test").Page) {
  await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, { timeout: 90_000 });
  await page.waitForFunction(() => document.documentElement.getAttribute("data-foyer") === "done", null, { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

test("le disque retourne le monde, la face survit au rechargement", async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto("/fr?shaders-prod");
  await attendre(page);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const disque = page.locator("[data-theme-toggle]").first();
  await expect(disque).toHaveAttribute("aria-pressed", "false");
  const libelle = await disque.getAttribute("aria-label");
  expect(libelle).toMatch(/miroir/i);
  await disque.click();
  // La fumee joue : la face ne change qu'au milieu de la tenue.
  await expect(page.locator("canvas.miroirFumant")).toHaveAttribute("data-miroir", "en-cours");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light", { timeout: 5_000 });
  await page.waitForTimeout(2200);
  await expect(page.locator("canvas.miroirFumant")).not.toHaveAttribute("data-miroir", "en-cours");
  await expect(disque).toHaveAttribute("aria-pressed", "true");
  const fond = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(luminance(fond), "le fond est du papier").toBeGreaterThan(0.7);
  const meta = await page.evaluate(() => document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content);
  expect(meta).toBe("#f3ece0");

  await page.reload();
  const auPremierRendu = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  expect(auPremierRendu, "posee avant le premier paint").toBe("light");
  await attendre(page);
  await expect(page.locator("[data-theme-toggle]").first()).toHaveAttribute("aria-pressed", "true");

  // Retour a la nuit au clavier.
  await page.locator("[data-theme-toggle]").first().focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark", { timeout: 5_000 });
});

for (const chemin of ["fr", "fr/services", "fr/projets", "fr/contact", "fr/memoire"]) {
  test(`/${chemin} : sur la face claire, titre et paragraphe tiennent 4,5:1 sur leur fond`, async ({ page }) => {
    test.setTimeout(150_000);
    await page.addInitScript(() => { try { localStorage.setItem("nahual-theme", "light"); } catch {} });
    await page.goto("/" + chemin + "?shaders-prod");
    await attendre(page);
    await page.evaluate(() => window.scrollTo(0, (document.documentElement.scrollHeight - window.innerHeight) * 0.5));
    await page.waitForTimeout(1500);
    const mesures = await page.evaluate(() => {
      const fondDe = (el: Element): string => {
        for (let n: Element | null = el; n; n = n.parentElement) {
          const bg = getComputedStyle(n).backgroundColor;
          const a = bg.match(/rgba?\(([^)]+)\)/)?.[1].split(",").map(Number);
          if (a && (a.length < 4 || a[3] > 0.6)) return bg;
        }
        return getComputedStyle(document.body).backgroundColor;
      };
      const out: { texte: string; couleur: string; fond: string }[] = [];
      // Le chant (`.cantar`) vit hors de <main> et, a mi-page de l'accueil,
      // c'est lui qui porte le texte : les chapitres du calque sont replies.
      for (const sel of ["h1", "main p", "[data-scene-overlay] p", ".cantar p"]) {
        const el = [...document.querySelectorAll<HTMLElement>(sel)].find((e) => { const r = e.getBoundingClientRect(); return r.width > 40 && r.height > 12 && (e.textContent ?? "").trim().length > 12 && getComputedStyle(e).visibility !== "hidden"; });
        if (el) out.push({ texte: (el.textContent ?? "").trim().slice(0, 30), couleur: getComputedStyle(el).color, fond: fondDe(el) });
      }
      return out;
    });
    expect(mesures.length).toBeGreaterThan(0);
    for (const m of mesures) {
      expect(contraste(m.couleur, m.fond), `« ${m.texte} » : ${m.couleur} sur ${m.fond}`).toBeGreaterThanOrEqual(4.5);
    }
  });
}

test("mouvement reduit : pas de fumee, la face change tout de suite", async ({ browser }) => {
  test.setTimeout(150_000);
  const ctx = await browser.newContext({ ...devices["Desktop Chrome"], reducedMotion: "reduce", viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto("/fr?shaders-prod");
  await attendre(page);
  await page.locator("[data-theme-toggle]").first().click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light", { timeout: 800 });
  const fumee = await page.locator("canvas.miroirFumant").getAttribute("data-miroir");
  expect(fumee).toBeNull();
  await ctx.close();
});

test("la 404 sort du voile et prend la face memorisee", async ({ page }) => {
  // Next rend la page introuvable dans sa coquille d'erreur : les scripts en
  // ligne du layout n'y tournent pas et aucune scene ne pose data-loaded.
  // NotFoundReveal fait les deux au montage (T4 du miroir, 13/09).
  test.setTimeout(60_000);
  await page.addInitScript(() => { try { localStorage.setItem("nahual-theme", "light"); } catch {} });
  const reponse = await page.goto("/fr/nulle-part");
  expect(reponse?.status()).toBe(404);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light", { timeout: 10_000 });
  await expect(page.locator("html")).toHaveAttribute("data-loaded", "true", { timeout: 10_000 });
  await expect(page.locator("[data-veil]")).toBeHidden({ timeout: 10_000 });
  await expect(page.locator("main[data-not-found] h1").first()).toBeVisible();
  const fond = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(luminance(fond), "la 404 est sur le papier").toBeGreaterThan(0.7);
});
