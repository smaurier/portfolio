import { test, expect, devices } from "@playwright/test";

/**
 * LE CHANT DE LA DIRECTION (11/09, M4 du backlog).
 *
 * La regle de Sylvain : l'accessibilite est un enrichissement pour tout le
 * monde. Le chant des Cantares n'est donc jamais en `sr-only` : il est dans
 * le flux de chaque page, sous la scene, et il reste la en mode recit
 * accessible (la scene coupee). Trois couches, chacune dans sa langue
 * (RGAA 8.7) : nahuatl, espagnol de l'edition, notre traduction.
 *
 * Oracles : sur les cinq pages, la figure existe, porte ses trois
 * citations avec leur `lang`, et une fois la page defilee jusqu'en bas
 * elle est dans la fenetre (pas seulement dans le DOM) ; puis, le mode
 * recit active, elle y est toujours.
 */
test.use({ ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } });

const PAGES = ["fr", "fr/services", "fr/projets", "fr/contact", "fr/memoire"];

for (const chemin of PAGES) {
  test(`/${chemin} : le chant est visible sous la scene et en mode recit`, async ({ page }) => {
    test.setTimeout(150_000);
    await page.goto("/" + chemin + "?shaders-prod");
    await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, { timeout: 90_000 });

    const figure = page.locator("figure.cantar");
    await expect(figure).toHaveCount(1);
    await expect(figure.locator("blockquote[lang='nah']")).toHaveCount(1);
    await expect(figure.locator("blockquote[lang='es']")).toHaveCount(1);
    // En francais, la troisieme couche est notre traduction.
    await expect(figure.locator("blockquote.cantarOurs")).toHaveCount(1);
    await expect(figure.locator("figcaption cite")).toContainText("Cantares mexicanos");

    // Jamais cache : ni sr-only, ni display none.
    const clip = await figure.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { clip: cs.clip, position: cs.position, width: el.getBoundingClientRect().width, display: cs.display };
    });
    expect(clip.display).not.toBe("none");
    expect(clip.width).toBeGreaterThan(200);

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(1500);
    await figure.scrollIntoViewIfNeeded();
    const box = await figure.boundingBox();
    expect(box, "la figure a une boite").not.toBeNull();
    expect(box!.y + box!.height, "dans la fenetre une fois en bas").toBeGreaterThan(0);
    expect(box!.y, "dans la fenetre une fois en bas").toBeLessThan(800);

    // Mode recit accessible : la scene est coupee, le chant reste.
    await page.getByRole("button", { name: /mode récit accessible/i }).first().click();
    await expect(page.locator("body")).toHaveClass(/reading-mode/);
    await figure.scrollIntoViewIfNeeded();
    await expect(figure).toBeVisible();
    const boxRecit = await figure.boundingBox();
    expect(boxRecit!.width).toBeGreaterThan(200);
  });
}
