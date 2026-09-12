import { test, expect, devices } from "@playwright/test";

/**
 * LA CEREMONIE D'ARRIVEE SE JOUE A LA PREMIERE VISITE (12/09).
 *
 * Sylvain, 12/09 : « on a perdu beaucoup de choses sur le voile d'entree
 * [...] parfois tout s'affiche, parfois non ». Mesure : dans un contexte
 * vierge, le foyer etait declare allume a 0,6 s et la ceremonie sautait
 * (phrase, traduction, points cardinaux qui rejoignent la boussole), puis
 * le voile s'ouvrait par le secours de 6 s. Cause : la decision du foyer
 * prise deux fois par chargement (StrictMode), la seconde relisant la
 * visite que la premiere venait de noter.
 *
 * Oracles, dans un contexte sans visite enregistree :
 *  - <html> ne porte jamais data-hearth="lit" ;
 *  - la sequence texte signale sa fin par l'animation (data-reveal-done
 *    avant 5 s), pas par le secours de 6 s ;
 *  - les quatre points cardinaux ont VOLE : ils finissent dans le pont de
 *    vol (deck), la ou FoyerArrival les range ;
 *  - une seconde visite dans la foulee, elle, trouve le foyer allume.
 */
test.use({ ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } });

test("premiere visite : la ceremonie complete, puis le foyer reste allume", async ({ page }) => {
  test.setTimeout(150_000);
  await page.addInitScript(() => {
    const w = window as unknown as { __hearthSeen: string[] };
    w.__hearthSeen = [];
    const mo = new MutationObserver(() => {
      const v = document.documentElement.getAttribute("data-hearth");
      if (v) w.__hearthSeen.push(v);
    });
    document.addEventListener("DOMContentLoaded", () => mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-hearth"] }));
  });
  await page.goto("/fr?shaders-prod");
  const t0 = Date.now();
  await page.waitForFunction(() => document.querySelector('[data-testid="piedra-skeleton"]')?.getAttribute("data-reveal-done") === "true", null, { timeout: 30_000 });
  const revealMs = Date.now() - t0;
  expect(revealMs, "la sequence texte finit par son animation, pas par le secours de 6 s").toBeLessThan(5_500);

  await page.waitForFunction(() => document.documentElement.getAttribute("data-foyer") === "done", null, { timeout: 90_000 });
  const etat = await page.evaluate(() => ({
    hearthSeen: (window as unknown as { __hearthSeen: string[] }).__hearthSeen,
    hearth: document.documentElement.getAttribute("data-hearth"),
    dotsDansLePont: document.querySelectorAll('[data-foyer="deck"] [data-foyer-dot]').length,
  }));
  expect(etat.hearthSeen, "le foyer n'est jamais declare allume a la premiere visite").toEqual([]);
  expect(etat.hearth).toBeNull();
  expect(etat.dotsDansLePont, "les quatre points cardinaux ont rejoint la boussole").toBe(4);

  // Seconde visite dans la foulee : la maison est allumee, pas de ceremonie.
  await page.reload();
  await page.waitForFunction(() => document.documentElement.getAttribute("data-foyer") === "done", null, { timeout: 90_000 });
  const second = await page.evaluate(() => ({
    hearth: document.documentElement.getAttribute("data-hearth"),
    dotsDansLePont: document.querySelectorAll('[data-foyer="deck"] [data-foyer-dot]').length,
  }));
  expect(second.hearth).toBe("lit");
  expect(second.dotsDansLePont).toBe(0);
});
