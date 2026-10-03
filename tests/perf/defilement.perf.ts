import { test } from "@playwright/test";
import { CIBLE_BUREAU, PASSES, juger, mesurer, optionsDuProjet, type Passe } from "./aides/barre";
import { filPrincipal, processusDeRendu, reperes } from "./aides/evenements";
import { profilDuProjet } from "./aides/profil";
import { REPERE, attendreLeFoyer, defiler, emulerLeTelephone, infoRendu } from "./aides/site";
import { tracer } from "./aides/tracage";

/**
 * LE DEFILEMENT DE CHAQUE PAGE (moments 4 a 8 de la barre, cinq pages).
 *
 * La methode du jure : un balayage a vitesse constante du haut au bas, six
 * secondes, apres trois secondes d'arrivee. `veille=off` : la mise en
 * veille de la boucle ne doit pas se declencher pendant la mesure. Pas
 * d'echauffement ici : le serveur est chaud depuis le voile, et chaque
 * passe ouvre son contexte neuf. Point zero du 16/09 (Pixel 7, processeur
 * /4) : Contact a 56 % d'images a 60 Hz ; sur le bureau, l'enveloppe
 * s'acquiert comme pour le voile (`pnpm run perf:enveloppe`, cinq
 * jugements, `aides/cliquet.ts`).
 *
 * Ici le canvas rend a chaque image pendant le balayage (l'arc suit le
 * defilement) : un blocage du fil principal se lit aussi dans les
 * intervalles, pas seulement dans les perdues comme a l'attente du voile.
 */
const PAGES = ["fr", "fr/services", "fr/projets", "fr/contact", "fr/memoire"];
const BALAYAGE_MS = 6000;

for (const chemin of PAGES) {
  test(`le defilement de /${chemin}`, async ({ browser }, info) => {
    const passes: Passe[] = [];
    const profil = profilDuProjet(info.project.name);
    for (let i = 1; i <= PASSES; i++) {
      const ctx = await browser.newContext(optionsDuProjet(info));
      const page = await ctx.newPage();
      if (profil.telephone) await emulerLeTelephone(page, { reseau: false });
      await page.goto(`/${chemin}?shaders-prod&veille=off`, { waitUntil: "commit" });
      await attendreLeFoyer(page);
      await page.waitForTimeout(3000);
      const t = await tracer(page);
      await defiler(page, BALAYAGE_MS);
      const evts = await t.arreter();
      const rendu = await infoRendu(page);
      await ctx.close();
      const pid = processusDeRendu(evts);
      const tid = filPrincipal(evts, pid);
      const rep = reperes(evts);
      const debut = rep.get(REPERE.debutDefilement);
      const fin = rep.get(REPERE.finDefilement);
      if (debut === undefined || fin === undefined) throw new Error(`reperes du balayage absents (${[...rep.keys()].join(", ")})`);
      passes.push(mesurer(evts, pid, tid, debut, fin, profil.budgetMs, rendu));
    }
    juger(info.project.name, `defilement-${chemin.replace("/", "-")}`, passes, CIBLE_BUREAU, info);
  });
}
