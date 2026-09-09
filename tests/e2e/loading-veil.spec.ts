import { test, expect } from "@playwright/test";

/**
 * Tests E2E du voile de chargement (30/08). Verrouille le fix Sylvain
 * "je vois encore le html avant" : ces tests DOIVENT casser si quelqu'un
 * retire le critical CSS inline, deplace le PiedraSkeleton, ou casse le
 * mecanisme html[data-loaded="true"].
 */

test.describe("PiedraSkeleton : voile de chargement SOTY", () => {
  test("body a fond noir des la premiere frame (pas de flash blanc)", async ({ page }) => {
    await page.goto("/fr");
    // Verifie le fond noir AVANT que useProgress atteigne 100 : le
    // critical CSS inline dans <head> doit forcer body { background: #000 }
    // tant que html n'a pas data-loaded="true".
    const bgColor = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bgColor).toBe("rgb(0, 0, 0)");
  });

  /**
   * REECRITS LE 09/09, et il faut dire pourquoi. Ces deux tests utilisaient
   * un navigateur avec JavaScript DESACTIVE pour simuler « le HTML avant
   * hydratation », et verifiaient que le voile y est VISIBLE. Or ce n'est pas
   * la meme chose : un navigateur qui n'a pas encore hydrate a JavaScript
   * actif, il ne l'a simplement pas encore execute. Le vrai visiteur sans
   * JavaScript, lui, ne franchira JAMAIS le voile, puisque `data-loaded` est
   * pose par le client : le laisser devant un ecran de chargement definitif
   * est un defaut, corrige le 09/09 par une sortie de secours en
   * `<noscript>`. Les deux intentions se contredisaient donc.
   *
   * L'intention d'origine reste juste et elle est conservee ici : le voile et
   * la phrase nahuatl doivent etre dans le HTML SERVI, pour qu'il n'y ait
   * aucun flash blanc avant hydratation et que la phrase soit bien tiree cote
   * serveur. On l'exprime donc sur le HTML servi, ce qui la teste plus
   * directement et ne depend plus de l'etat sans JavaScript.
   */
  test("le voile est dans le HTML servi (aucun flash blanc avant hydratation)", async ({ request }) => {
    const html = await (await request.get("/fr")).text();
    expect(html).toContain('role="status"');
    expect(html, "le voile porte sa cible stable").toContain("data-veil");
    expect(html).toMatch(/aria-label="[^"]*hargement/);
  });

  test("phrase nahuatl dans le HTML servi (tirage cote serveur)", async ({ request }) => {
    const html = await (await request.get("/fr")).text();
    // Le texte est enveloppe dans des spans (les mots sont decoupes pour
    // l'animation) : on prend donc tout le contenu du <p> et on retire les
    // balises, plutot que d'exiger du texte nu juste apres la balise
    // ouvrante, ce qui echouait pour une raison qui n'a rien a voir avec ce
    // qu'on veut prouver.
    const match = html.match(/<p[^>]*lang="nah"[^>]*>([\s\S]*?)<\/p>/);
    expect(match, "un <p lang=\"nah\"> est servi").not.toBeNull();
    const text = (match?.[1] ?? "").replace(/<[^>]*>/g, "").trim();
    expect(text.length, "et il porte bien une phrase").toBeGreaterThan(3);
  });

  test("html[data-loaded='true'] pose apres chargement complet", async ({ page }) => {
    await page.goto("/fr");
    // Attend que LoadingSync pose data-loaded="true" (useProgress >= 100
    // + MIN_VEIL_DURATION_MS ecoulee, soit 2.5s min).
    await page.waitForFunction(
      () => document.documentElement.getAttribute("data-loaded") === "true",
      { timeout: 15_000 }
    );
    const dataLoaded = await page.evaluate(() =>
      document.documentElement.getAttribute("data-loaded")
    );
    expect(dataLoaded).toBe("true");
  });

  /**
   * REECRITS LE 09/09 EUX AUSSI, mais pour une autre raison : ils etaient
   * DEJA rouges avant les correctifs de cette nuit, verifie en mettant mes
   * modifications de cote. Ils visaient le mecanisme d'origine
   * (`html[data-loaded="true"] .skeleton { opacity: 0; pointer-events: none }`)
   * que le chantier du foyer a remplace le 08/09 par un retrait franc
   * (`html[data-foyer="done"] .skeleton { display: none }`) plus un filet
   * d'animation. Le mecanisme a change, l'intention non.
   *
   * On teste donc le COMPORTEMENT et non le mecanisme : une fois la scene
   * chargee et l'arrivee jouee, le voile ne doit plus rien recouvrir au
   * centre de l'ecran. Ecrit ainsi, ce test survivra au prochain
   * changement de mise en oeuvre.
   */
  test("le voile ne recouvre plus rien une fois l'arrivee jouee", async ({ page }) => {
    await page.goto("/fr");
    await page.waitForFunction(
      () => document.documentElement.getAttribute("data-loaded") === "true",
      { timeout: 15_000 }
    );
    // L'arrivee du foyer joue sa sequence : on lui laisse le temps.
    await page.waitForFunction(
      () => {
        const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
        return !!el && !el.closest("[data-veil]");
      },
      { timeout: 15_000 },
    );

    const covering = await page.evaluate(() => {
      const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
      return el?.closest("[data-veil]") ? "le voile" : (el?.tagName ?? "rien");
    });
    expect(covering, "ce qui est sous le curseur au centre").not.toBe("le voile");
  });
});
