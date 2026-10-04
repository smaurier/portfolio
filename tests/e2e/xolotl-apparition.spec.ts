import { expect, test } from "@playwright/test";
import { filCompositeur, processusDeRendu, reperes, type Evenement } from "../perf/aides/evenements";
import { paires, trames } from "../perf/aides/images";

/**
 * L'APPARITION DE XOLOTL NE COUTE PAS UNE IMAGE LONGUE (04/10, oracle de cause).
 *
 * Mesure du 04/10 sur la production, passage force (`?xolotl=1`), sans
 * defilement : 73 programmes avant et apres (la chauffe les compile), mais
 * l'apparition ajoute 2 textures et 3 geometries et coute UNE image de
 * 41 ms, 73 ms apres l'evenement `nahual-xolotl-appearing` : l'envoi au
 * GPU au premier dessin. Sur Memoire le chien apparait toujours, 10 s apres
 * le montage, en plein balayage. La regle du harnais (pilier 2) : rien ne
 * nait en cours d'arc, tout se prepare sous le voile. L'oracle : dans la
 * seconde qui suit l'apparition, aucun intervalle entre deux presentations
 * ne depasse le budget du bureau plus une demi-periode (25 ms). Meme
 * tracage que la barre, meme coeur pur.
 *
 * ROUGE, EN ATTENTE DE SA CAUSE (04/10, `test.fixme`). Vu rouge : 65,5 ms a
 * +94 ms (dev), 43 ms a +73 ms (prod). La pire image lue sur TOUS les fils
 * (`.scratch/xolotl-image.mjs`) : 41 ms de GPUTask dans le processus GPU,
 * 10 ms de fil principal. Premiere hypothese, l'envoi des textures et
 * geometries du chien au premier dessin : FAUSSE, un dessin cache sous le
 * pixel des que la direction est chaude n'a rien change (43 ms encore).
 * Pistes qui restent : une cible de rendu allouee au premier usage (le
 * reflet de la nappe du Nord ne rend le chien de braise que lorsqu'il
 * existe ; l'afterimage), ou une liaison tardive cote pilote. L'oracle
 * reste la, il dira quand la cause sera trouvee.
 */
const CATEGORIES = ["disabled-by-default-devtools.timeline.frame", "devtools.timeline", "disabled-by-default-devtools.timeline"];
const SEUIL_MS = 25;
const FENETRE_US = 1_000_000;

test.use({ viewport: { width: 1280, height: 800 } });

test.fixme("l'apparition de Xolotl sur Memoire ne produit aucune image au-dela de 25 ms dans la seconde qui suit", async ({ page, context }) => {
  await page.addInitScript(() => {
    window.addEventListener("nahual-xolotl-appearing", (e) => {
      if ((e as CustomEvent<{ visible: boolean }>).detail?.visible === false) return;
      console.timeStamp("nahual:xolotl-appearing");
      (window as unknown as { __xolotlVu?: boolean }).__xolotlVu = true;
    });
  });
  const cdp = await context.newCDPSession(page);
  const evts: Evenement[] = [];
  cdp.on("Tracing.dataCollected", (e) => evts.push(...(e.value as unknown as Evenement[])));
  const fin = new Promise<void>((r) => cdp.once("Tracing.tracingComplete", () => r()));
  await page.goto("/fr/memoire?shaders-prod&veille=off&xolotl=1", { waitUntil: "commit" });
  await page.waitForFunction(() => document.documentElement.getAttribute("data-foyer") === "done", null, { timeout: 120_000 });
  await cdp.send("Tracing.start", { traceConfig: { includedCategories: CATEGORIES }, transferMode: "ReportEvents" });
  await page.waitForFunction(() => (window as unknown as { __xolotlVu?: boolean }).__xolotlVu === true, null, { timeout: 60_000 }).catch(() => undefined);
  await page.waitForTimeout(1500);
  await cdp.send("Tracing.end");
  await fin;
  const pid = processusDeRendu(evts);
  const apparition = reperes(evts).get("nahual:xolotl-appearing");
  expect(apparition, "le repere d'apparition n'est pas dans la trace : Xolotl n'est pas apparu dans les 60 s (le chien attend la chauffe de la direction)").toBeDefined();
  const t = trames(evts, pid);
  const dans = paires(t).filter((p) => p.fin >= (apparition as number) - 100_000 && p.fin <= (apparition as number) + FENETRE_US);
  const longues = dans.filter((p) => p.ms > SEUIL_MS).sort((a, b) => b.ms - a.ms);
  const rapport = `${dans.length} intervalles dans la seconde de l'apparition ; ${longues.length} au-dela de ${SEUIL_MS} ms` + (longues.length ? ` : ${longues.map((p) => `${p.ms.toFixed(1)} ms a +${((p.fin - (apparition as number)) / 1000).toFixed(0)} ms`).join(", ")}` : "");
  console.log(rapport);
  expect(filCompositeur(evts, pid)).toBeGreaterThan(0);
  expect(longues.length, rapport).toBe(0);
});
