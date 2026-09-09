import { test, expect } from "@playwright/test";

/**
 * LE SITE RESTE LISIBLE SANS JAVASCRIPT (09/09).
 *
 * Teste le 08/09 : contrairement a ce qu'on craignait, le site n'etait pas
 * noir sans JavaScript. 98 Ko de HTML etaient bien servis et tout le texte
 * etait dans le DOM. Mais on ne franchissait JAMAIS le voile de chargement,
 * parce que `data-loaded` est pose par le client, et TOUT le texte revele
 * restait a opacite 0, parce que sa classe de revelation est posee par un
 * IntersectionObserver. Le visiteur restait donc devant un ecran de
 * chargement definitif, avec un contenu invisible derriere.
 *
 * Pour la vitrine d'un futur auditeur RGAA, c'est un point de credibilite
 * autant que d'ergonomie : la degradation gracieuse est precisement ce qu'il
 * aura a prescrire.
 */

test.describe("sans JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test.describe.configure({ timeout: 90_000 });

  test("le voile s'efface, le titre se lit, et le visiteur est prevenu", async ({ page }) => {
    await page.goto("/fr");

    // Le voile de chargement ne doit plus rien couvrir : il est cible par
    // `data-veil` et non par sa classe, les noms de modules CSS etant haches.
    const veil = page.locator("[data-veil]");
    await expect(veil).toHaveCount(1);
    await expect(veil).toBeHidden();

    // Le titre passe par RevealText, dont les mots partent a opacite 0.
    const title = page.getByRole("heading", { level: 1 }).first();
    await expect(title).toBeVisible();
    // Les mots reveles, ou qu'ils soient dans la page : `evaluateAll` plutot
    // qu'un locator unique, qui attendrait un element precis dont on ne veut
    // pas dependre.
    const opacities = await page
      .locator("[data-reveal-word]")
      .evaluateAll((els) => els.slice(0, 8).map((el) => Number(getComputedStyle(el).opacity || "1")));
    expect(opacities.length, "des mots reveles existent dans la page").toBeGreaterThan(0);
    expect(Math.min(...opacities), "aucun mot revele ne reste invisible").toBeGreaterThan(0.9);

    // Le contenu principal et la navigation restent atteignables.
    await expect(page.getByRole("link", { name: /services/i }).first()).toBeVisible();
    await expect(page.getByText(/Chez les Nahuas/).first()).toBeVisible();

    // Et on explique au visiteur ce qu'il ne verra pas.
    await expect(page.getByText(/besoin de JavaScript/i)).toBeVisible();
  });
});
