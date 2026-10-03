/**
 * OUVRIR ET FERMER UN TRACAGE CHROMIUM SUR UNE PAGE.
 *
 * Playwright 1.62 n'expose pas de raccourci : on ouvre une session CDP et
 * on parle au domaine `Tracing`. Les trois categories donnent les trames
 * du compositeur, les reperes `TimeStamp` et les evenements du fil
 * principal (relevees le 22/09, `.scratch/trace-images.mjs`).
 */
import type { Page } from "@playwright/test";
import type { Evenement } from "./evenements";

export const CATEGORIES = ["disabled-by-default-devtools.timeline.frame", "devtools.timeline", "disabled-by-default-devtools.timeline"];

export async function tracer(page: Page): Promise<{ arreter: () => Promise<Evenement[]> }> {
  const cdp = await page.context().newCDPSession(page);
  const evts: Evenement[] = [];
  cdp.on("Tracing.dataCollected", (e) => evts.push(...(e.value as unknown as Evenement[])));
  const fin = new Promise<void>((r) => cdp.once("Tracing.tracingComplete", () => r()));
  await cdp.send("Tracing.start", { traceConfig: { includedCategories: CATEGORIES }, transferMode: "ReportEvents" });
  return {
    arreter: async () => {
      await cdp.send("Tracing.end");
      await fin;
      await cdp.detach();
      return evts;
    },
  };
}
