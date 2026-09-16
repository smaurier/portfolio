import { test, expect } from "@playwright/test";

/**
 * AUCUNE LECTURE DE MISE EN PAGE DEPUIS LA BOUCLE D'IMAGE (16/09).
 *
 * `window.scrollY`, `window.innerHeight`, `Element.scrollHeight` et
 * `getBoundingClientRect` dependent tous de la mise en page. Un rappel de
 * `requestAnimationFrame` tourne AVANT que le navigateur l'ait refaite :
 * repondre l'oblige donc a la recalculer sur-le-champ. La MEME ligne est
 * gratuite dans un ecouteur `scroll`, ou la mise en page est deja a jour.
 * Ce n'est donc pas le nombre de lectures qui fait le defaut, c'est
 * l'ENDROIT d'ou elles partent.
 *
 * CE QUE CE TEST GARDE. Le 16/09, six endroits du site lisaient la mise en
 * page depuis la boucle : cinq composants y recalculaient la profondeur de
 * page, et les deux sentinelles de defilement y lisaient `scrollY`. Profil
 * sur Contact, Pixel 7, processeur divise par quatre : la seule sentinelle
 * du dock pesait 0,91 ms par image sur un budget de 16,7, et l'un des cinq
 * composants 1,85 ms. Corriges, Contact est passe de 51,9 a plus de 90 %
 * d'images a 60 Hz. Deux commentaires du depot affirmaient alors le
 * contraire, « recalcule chaque frame (cheap) » et « par frame,
 * negligeable » : c'est pour ca que cet oracle existe, la conviction ne se
 * verifie pas, le compte si.
 *
 * IL COMPTE, IL NE CHRONOMETRE PAS. Un test de duree sur cette machine varie
 * de quarante points d'une passe a l'autre (mesure du 16/09) ; un compte
 * d'appels ne varie pas.
 *
 * ET IL A FALLU DEUX VERSIONS. La premiere comptait TOUTES les lectures, par
 * image, et elle passait au vert avec la regression remise en place : une
 * sentinelle cadencee par `requestAnimationFrame` ne lit qu'une fois par
 * evenement de defilement, pas une fois par image, et son cout etait
 * concentre dans peu d'appels tres chers. Un oracle qui ne tombe pas sur le
 * defaut qu'il pretend garder ne vaut rien.
 *
 * ZERO, ET PAS UN PLAFOND, sur les deux pages ou notre code n'en fait plus
 * aucune. Memoire et Projets en gardent quelques-unes qui viennent de Lenis,
 * la bibliotheque de defilement, et qui ne sont pas a nous : elles ne sont
 * pas surveillees ici.
 */
const PAGES = ["fr", "fr/contact"];

type Compteurs = {
  __lectures: Record<string, number>;
  __piles: Record<string, number>;
  __images: number;
  __stop: boolean;
  __dedans: boolean;
};

for (const chemin of PAGES) {
  test(`/${chemin} : aucune lecture de mise en page depuis la boucle d'image`, async ({ page }) => {
    test.setTimeout(150_000);

    await page.addInitScript(() => {
      const w = window as unknown as Compteurs;
      w.__lectures = { scrollHeight: 0, scrollY: 0, innerHeight: 0, innerWidth: 0, rect: 0 };
      w.__piles = {};
      w.__dedans = false;

      // On marque les rappels d'animation : ce qui lit la mise en page
      // pendant l'un d'eux force un recalcul.
      const vraiRaf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (cb: FrameRequestCallback) =>
        vraiRaf((t) => {
          const avant = w.__dedans;
          w.__dedans = true;
          try {
            return cb(t);
          } finally {
            w.__dedans = avant;
          }
        });

      const compter = (cle: string) => {
        if (!w.__dedans) return;
        w.__lectures[cle] += 1;
        const lignes = (new Error().stack ?? "").split(String.fromCharCode(10)).slice(2, 5);
        const pile = lignes.map((l) => l.trim().replace(/^at /, "")).join(" < ");
        w.__piles[pile] = (w.__piles[pile] ?? 0) + 1;
      };

      const dScrollHeight = Object.getOwnPropertyDescriptor(Element.prototype, "scrollHeight");
      if (dScrollHeight?.get) {
        Object.defineProperty(Element.prototype, "scrollHeight", {
          get(this: Element) {
            compter("scrollHeight");
            return dScrollHeight.get!.call(this);
          },
          configurable: true,
        });
      }

      for (const cle of ["scrollY", "innerHeight", "innerWidth"] as const) {
        const d =
          Object.getOwnPropertyDescriptor(Window.prototype, cle) ?? Object.getOwnPropertyDescriptor(window, cle);
        if (!d?.get) continue;
        Object.defineProperty(window, cle, {
          get(this: Window) {
            compter(cle);
            return d.get!.call(this);
          },
          configurable: true,
        });
      }

      const vraiRect = Element.prototype.getBoundingClientRect;
      Element.prototype.getBoundingClientRect = function (this: Element) {
        compter("rect");
        return vraiRect.call(this);
      };
    });

    await page.goto("/" + chemin);
    await page.waitForFunction(
      () =>
        document.documentElement.dataset.loaded === "true" &&
        !!(window as unknown as { __nahualR3f?: unknown }).__nahualR3f,
      null,
      { timeout: 120_000 },
    );
    await page.waitForTimeout(3000);

    // On remet a zero APRES le chargement : l'ouverture a le droit de lire la
    // mise en page, c'est la boucle d'image qu'on surveille.
    await page.evaluate(() => {
      const w = window as unknown as Compteurs;
      for (const k of Object.keys(w.__lectures)) w.__lectures[k] = 0;
      for (const k of Object.keys(w.__piles)) delete w.__piles[k];
      w.__images = 0;
      w.__stop = false;
      const tick = () => {
        w.__images += 1;
        if (!w.__stop) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

    for (let i = 1; i <= 10; i += 1) {
      await page.evaluate(
        (f) => window.scrollTo(0, f * (document.documentElement.scrollHeight - window.innerHeight)),
        i / 10,
      );
      await page.waitForTimeout(350);
    }

    const releve = await page.evaluate(() => {
      const w = window as unknown as Compteurs;
      w.__stop = true;
      const total = Object.values(w.__lectures).reduce((s, n) => s + n, 0);
      return { images: w.__images, total, detail: w.__lectures, piles: w.__piles };
    });

    const coupables = Object.entries(releve.piles)
      .map(([p, n]) => `  x${n}  ${p}`)
      .join(String.fromCharCode(10));

    expect(
      releve.total,
      `${releve.images} images, ${releve.total} lectures depuis la boucle ${JSON.stringify(releve.detail)}${String.fromCharCode(10)}${coupables}`,
    ).toBe(0);
  });
}
