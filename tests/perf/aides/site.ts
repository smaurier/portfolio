/**
 * CONDUIRE LE SITE POUR LA BARRE.
 *
 * Les bornes des moments sont posees DEPUIS LA PAGE par `console.timeStamp`
 * : elles tombent dans la trace a son horloge, sans conversion. L'observateur
 * d'attributs se pose a DOMContentLoaded (au moment du script
 * d'initialisation, `document.documentElement` n'existe pas encore).
 */
import type { Page } from "@playwright/test";
import { FAST_3G, PROCESSEUR_TELEPHONE } from "./profil";

export const REPERE = {
  charge: "nahual:data-loaded",
  foyer: "nahual:data-foyer-done",
  debutDefilement: "nahual:defilement-debut",
  finDefilement: "nahual:defilement-fin",
} as const;

/** A poser AVANT la navigation. */
export async function poserLesReperes(page: Page): Promise<void> {
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      const racine = document.documentElement;
      const noter = () => {
        if (racine.getAttribute("data-loaded") === "true") console.timeStamp("nahual:data-loaded");
        if (racine.getAttribute("data-foyer") === "done") console.timeStamp("nahual:data-foyer-done");
      };
      new MutationObserver(noter).observe(racine, { attributes: true, attributeFilter: ["data-loaded", "data-foyer"] });
      noter();
    });
  });
}

export async function attendreLeFoyer(page: Page): Promise<void> {
  await page.waitForFunction(() => document.documentElement.getAttribute("data-foyer") === "done", null, { timeout: 120_000 });
}

export type InfoRendu = { appels: number; triangles: number; programmes: number; geometries: number; textures: number };

/** `renderer.info` a la fin d'un moment : appels, triangles, programmes, geometries, textures. */
export async function infoRendu(page: Page): Promise<InfoRendu> {
  return page.evaluate(() => {
    type Info = { render: { calls: number; triangles: number }; programs?: unknown[] | null; memory: { geometries: number; textures: number } };
    const w = window as unknown as { __nahualR3f?: { gl: { info: Info } } };
    const info = w.__nahualR3f?.gl.info;
    if (!info) throw new Error("__nahualR3f absent : la scene n'est pas montee");
    return {
      appels: info.render.calls,
      triangles: info.render.triangles,
      programmes: info.programs?.length ?? 0,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
    };
  });
}

/** Le balayage du jure : du haut au bas a vitesse constante, en `dureeMs`, borne par deux reperes. */
export async function defiler(page: Page, dureeMs: number): Promise<void> {
  await page.evaluate(
    (duree) =>
      new Promise<void>((fini) => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const t0 = performance.now();
        console.timeStamp("nahual:defilement-debut");
        const pas = (t: number) => {
          const p = Math.min(1, (t - t0) / duree);
          window.scrollTo(0, max * p);
          if (p < 1) requestAnimationFrame(pas);
          else {
            console.timeStamp("nahual:defilement-fin");
            fini();
          }
        };
        requestAnimationFrame(pas);
      }),
    dureeMs,
  );
}

/**
 * Le telephone emule (B2a) : processeur divise par quatre toujours, Fast 3G
 * si `reseau` (le design ne ralentit le reseau que pendant le voile : le
 * defilement se mesure sur une page deja chargee). A appeler AVANT la
 * navigation, sur une session CDP a part de celle du tracage.
 */
export async function emulerLeTelephone(page: Page, options: { reseau: boolean }): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: PROCESSEUR_TELEPHONE });
  if (options.reseau) {
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", { ...FAST_3G });
  }
}
