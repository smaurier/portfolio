import { describe, expect, it } from "vitest";
import { BUDGET_BUREAU_MS, BUDGET_TELEPHONE_MS } from "./images";
import { FAST_3G, PROCESSEUR_TELEPHONE, profilDuProjet } from "./profil";

/**
 * LE PROFIL PAR PROJET : les deux specs de la barre ne se dupliquent pas pour
 * le telephone, elles lisent leur budget et leur emulation ici, par le nom du
 * projet Playwright. Un nom inconnu est une erreur, pas un bureau par defaut :
 * un projet ajoute sans profil serait juge au mauvais budget en silence.
 */
describe("le profil d'un projet", () => {
  it("le bureau : 16,7 ms, pas d'emulation", () => {
    expect(profilDuProjet("perf-bureau")).toEqual({ budgetMs: BUDGET_BUREAU_MS, telephone: false });
  });
  it("le telephone : 33,3 ms, emule", () => {
    expect(profilDuProjet("perf-telephone")).toEqual({ budgetMs: BUDGET_TELEPHONE_MS, telephone: true });
  });
  it("un projet sans profil est une erreur qui le nomme", () => {
    expect(() => profilDuProjet("perf-tablette")).toThrow(/perf-tablette/);
  });
  it("les constantes de l'emulation sont celles des DevTools (Fast 3G) et du design (processeur divise par quatre)", () => {
    expect(PROCESSEUR_TELEPHONE).toBe(4);
    expect(FAST_3G).toEqual({ offline: false, latency: 562.5, downloadThroughput: 209_715.2, uploadThroughput: 96_000 });
  });
});
