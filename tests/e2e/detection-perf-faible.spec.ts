import { test, expect } from "@playwright/test";

/**
 * DETECTION AUTOMATIQUE D'UN APPAREIL FAIBLE, DE BOUT EN BOUT (01/11).
 *
 * La decision est deja prouvee a l'unite (detection-perf-faible.test.ts) :
 * ici, on verifie le branchement reel -- un appareil qui rend des images
 * lentes bascule vraiment le site sur le profil eco, sans bouton.
 *
 * Simule un appareil faible en remplacant requestAnimationFrame par une
 * version qui n'appelle son callback que toutes les ~70 ms (environ 14
 * im/s), posee AVANT le premier script de la page (addInitScript) : le
 * hook de detection (use-detection-perf-faible.ts) et le rendu r3f
 * partagent tous deux ce meme requestAnimationFrame truque.
 */
test("un appareil qui rend des images lentes bascule seul sur le mode eco", async ({ page }) => {
  test.setTimeout(150_000);
  await page.addInitScript(() => {
    const natif = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb: FrameRequestCallback) => {
      return window.setTimeout(() => natif(cb), 70) as unknown as number;
    };
  });
  await page.goto("/fr");
  await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, { timeout: 90_000 });
  // Le plafond de mesure (PLAFOND_MS, use-detection-perf-faible.ts) fait
  // 8 s a partir de la revelation : marge large pour le franchir.
  await page.waitForTimeout(9000);

  const eco = await page.evaluate(() => window.localStorage.getItem("nahual-eco"));
  expect(eco, "le mode eco doit etre ecrit dans le stockage").toBe("1");

  const bouton = page.getByRole("button", { name: "Quitter le mode éco" });
  await expect(bouton).toHaveAttribute("aria-pressed", "true");
});

test("un appareil qui rend des images normales ne bascule jamais sur le mode eco", async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto("/fr");
  await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, { timeout: 90_000 });
  await page.waitForTimeout(5000);

  const eco = await page.evaluate(() => window.localStorage.getItem("nahual-eco"));
  expect(eco, "aucun verdict ecrit sans raison").not.toBe("1");
});
