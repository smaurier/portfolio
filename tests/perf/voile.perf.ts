import { test } from "@playwright/test";
import { CIBLE_BUREAU, PASSES, juger, mesurer, optionsDuProjet, type Passe } from "./aides/barre";
import { filPrincipal, processusDeRendu, reperes } from "./aides/evenements";
import { BUDGET_BUREAU_MS, trames } from "./aides/images";
import { REPERE, attendreLeFoyer, infoRendu, poserLesReperes } from "./aides/site";
import { tracer } from "./aides/tracage";

/**
 * LE VOILE : L'ATTENTE, L'OUVERTURE, L'ARRIVEE (moments 1 a 3 de la barre).
 *
 *   voile-attente   du premier octet a data-loaded (la Piedra tourne, le
 *                   texte se revele, le script charge) ;
 *   voile-ouverture de data-loaded a data-foyer=done (la fumee se retire) ;
 *   arrivee         trois secondes immobiles apres l'ouverture.
 *
 * Une navigation par passe, dans un contexte NEUF (cache navigateur vide :
 * c'est la premiere visite), plus une navigation d'echauffement jamais
 * mesuree (caches du serveur). Point zero du 21/09, sonde indulgente a 50
 * ms : 9 a 10 images longues a l'attente, pire 617 a 767 ms.
 *
 * CE QUE LES DEUX COMPTES VOIENT (03/10) : une page avec script emet
 * souvent DEUX rapporteurs par balayage (le compositeur seul, puis le fil
 * principal). Quand le script bloque, le compositeur continue de presenter
 * la Piedra : l'intervalle entre presentations reste court, et c'est le
 * compte des PERDUES (les images du fil principal tombees) qui porte le
 * blocage, pas celui des images au-dela du budget. Les deux sont juges, le
 * cliquet rougit sur l'un comme sur l'autre. Attribuer un blocage du fil
 * principal a un intervalle long est un raffinement de B2.
 */
const ARRIVEE_US = 3_000_000;
const MOMENTS = ["voile-attente", "voile-ouverture", "arrivee"] as const;

test("le voile : l'attente, l'ouverture, l'arrivee", async ({ browser }, info) => {
  const passes: Record<(typeof MOMENTS)[number], Passe[]> = { "voile-attente": [], "voile-ouverture": [], arrivee: [] };
  for (let i = 0; i <= PASSES; i++) {
    const ctx = await browser.newContext(optionsDuProjet(info));
    const page = await ctx.newPage();
    await poserLesReperes(page);
    const t = await tracer(page);
    await page.goto("/fr?shaders-prod", { waitUntil: "commit" });
    await attendreLeFoyer(page);
    await page.waitForTimeout(ARRIVEE_US / 1000);
    const evts = await t.arreter();
    const rendu = await infoRendu(page);
    await ctx.close();
    if (i === 0) continue; // l'echauffement n'est pas mesure
    const pid = processusDeRendu(evts);
    const tid = filPrincipal(evts, pid);
    const rep = reperes(evts);
    const charge = rep.get(REPERE.charge);
    const foyer = rep.get(REPERE.foyer);
    if (charge === undefined || foyer === undefined) throw new Error(`reperes absents de la trace (${[...rep.keys()].join(", ")})`);
    const debut = trames(evts, pid)[0].debut;
    passes["voile-attente"].push(mesurer(evts, pid, tid, debut, charge, BUDGET_BUREAU_MS));
    passes["voile-ouverture"].push(mesurer(evts, pid, tid, charge, foyer, BUDGET_BUREAU_MS));
    passes.arrivee.push(mesurer(evts, pid, tid, foyer, foyer + ARRIVEE_US, BUDGET_BUREAU_MS, rendu));
  }
  // `juger` fait `expect` : si l'attente est rouge, les deux autres moments ne sont pas juges dans cette passe (B2 : expect.soft).
  for (const moment of MOMENTS) juger(info.project.name, moment, passes[moment], CIBLE_BUREAU, info);
});
