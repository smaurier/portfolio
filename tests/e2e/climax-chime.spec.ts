import { test, expect } from "@playwright/test";

/**
 * LA CLOCHE DU CLIMAX SONNE VRAIMENT (08/09).
 *
 * Le declenchement est teste unitairement (src/lib/climax-chime.test.ts),
 * mais un test pur ne dit pas si le son part reellement : il faut que
 * l'AudioContext existe, que le master soit branche, et que le scroll
 * atteigne l'emphase attendue. On ne peut pas ECOUTER dans un navigateur
 * sans peripherique, alors on compte les OSCILLATEURS crees : c'est la
 * trace exacte d'un accord joue, deux notes pour le Centre
 * (`CHIME_FREQ.jade`).
 *
 * Le compteur est remis a zero APRES l'activation du son, parce que la
 * nappe d'ambiance cree elle aussi trois oscillateurs a ce moment-la.
 */

test.describe("cloche du climax", () => {
  test.describe.configure({ timeout: 150_000 });

  test("l'accord de la direction sonne une seule fois au climax du scroll", async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __oscCount?: number };
      w.__oscCount = 0;
      const proto = (window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)
        .prototype;
      const real = proto.createOscillator;
      proto.createOscillator = function patched(this: AudioContext) {
        w.__oscCount = (w.__oscCount ?? 0) + 1;
        return real.call(this);
      };
    });

    await page.goto("/fr");
    await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, {
      timeout: 60_000,
    });
    await page.waitForTimeout(3000);

    // Le son demarre mute par defaut, et l'AudioContext ne peut naitre
    // qu'apres un geste : on active donc le son comme un visiteur le ferait.
    await page.getByRole("button", { name: /son/i }).first().click();
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      (window as unknown as { __oscCount: number }).__oscCount = 0;
    });

    // Deux ecrans de scroll = l'arc complet, donc le climax est franchi.
    const arc = await page.evaluate(() => window.innerHeight * 2);
    for (const f of [0.2, 0.5, 0.8, 1]) {
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), arc * f);
      await page.waitForTimeout(400);
    }
    await page.waitForTimeout(600);

    const afterClimax = await page.evaluate(() => (window as unknown as { __oscCount: number }).__oscCount);
    // CHIME_FREQ.jade = deux notes.
    expect(afterClimax, "oscillateurs crees en franchissant le climax").toBe(2);

    // On continue de descendre : la cloche ne doit pas se remettre a sonner.
    for (const y of [arc * 1.2, arc * 0.9, arc * 1.4]) {
      await page.evaluate((t) => window.scrollTo({ top: t, behavior: "instant" }), y);
      await page.waitForTimeout(400);
    }
    const afterMore = await page.evaluate(() => (window as unknown as { __oscCount: number }).__oscCount);
    expect(afterMore, "la cloche ne sonne pas deux fois").toBe(2);
  });
});
