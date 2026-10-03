/**
 * MESURER UNE FENETRE, JUGER TROIS PASSES.
 *
 * Une passe = une fenetre de trace resumee (images presentees, intervalles,
 * au-dela, pire, 60/30/20 Hz, p5, perdues) et le temps propre de sa pire
 * image. Trois passes se jugent a la MEDIANE, compte par compte, contre le
 * cliquet ; le rapport complet part dans les annotations du test et sur la
 * sortie, vert ou rouge. En mode acquisition (PERF_ACQUERIR=1, `pnpm run
 * perf:baseline`), un progres ou un moment nouveau s'inscrit dans la ligne
 * de base ; un recul ne s'inscrit jamais.
 *
 * UNE FENETRE QUI N'A RIEN MESURE NE CONCLUT PAS (relecture du 22/09) : un
 * moment sans images presentees resumerait a zero, passerait pour parfait,
 * et l'acquisition ecrirait 0/0 dans la ligne de base, un meilleur connu
 * qu'aucune mesure honnete n'atteint. Un plancher d'images presentees
 * garde chaque moment, comme l'auto-test garde la machine.
 */
import { expect, type BrowserContextOptions, type TestInfo } from "@playwright/test";
import type { Evenement } from "./evenements";
import { acquerir, verdict, type Compte, type Ligne } from "./cliquet";
import { tempsPropre, type Part } from "./fil-principal";
import { fenetre, fenetrePaires, mediane, paires, perdues, presentees, resumer, trames, type Resume } from "./images";
import { ecrireLigneDeBase, lireLigneDeBase } from "./ligne-de-base";
import type { InfoRendu } from "./site";

export type Passe = { presentees: number; resume: Resume; perdues: number; pireFonctions: Part[]; rendu?: InfoRendu };

export const ACQUERIR = process.env.PERF_ACQUERIR === "1";
export const DPR = Number(process.env.PERF_DPR ?? "1");
/** Impair, pour que la mediane d'un compte soit un compte. */
export const PASSES = 3;
export const CIBLE_BUREAU: Compte = { auDela: 0, perdues: 0 };
/** Le moment le plus court (l'ouverture du voile, ~1 s) presente au moins quelques dizaines d'images. */
export const PLANCHER_PRESENTEES = 20;

/** Les options de contexte du projet courant, pour ouvrir un contexte neuf par passe. */
export function optionsDuProjet(info: TestInfo): BrowserContextOptions {
  const { viewport, deviceScaleFactor, userAgent, isMobile, hasTouch } = info.project.use;
  return { viewport, deviceScaleFactor, userAgent, isMobile, hasTouch };
}

/** Une fenetre [debut, fin] (us de trace) : les paires se forment sur TOUTES les trames, puis se decoupent. */
export function mesurer(evts: Evenement[], pid: number, tid: number, debut: number, fin: number, budgetMs: number, rendu?: InfoRendu): Passe {
  const toutes = trames(evts, pid);
  const dans = fenetre(toutes, debut, fin);
  const p = fenetrePaires(paires(toutes), debut, fin);
  const pire = p.length > 0 ? p.reduce((a, b) => (b.ms > a.ms ? b : a)) : null;
  return {
    presentees: presentees(dans),
    resume: resumer(p.map((x) => x.ms), budgetMs),
    perdues: perdues(dans),
    pireFonctions: pire ? tempsPropre(evts, pid, tid, pire.debut, pire.fin) : [],
    rendu,
  };
}

export function juger(projet: string, moment: string, passes: Passe[], cible: Compte, info: TestInfo): void {
  if (passes.length % 2 === 0) throw new Error(`${passes.length} passes : il en faut un nombre impair pour que la mediane d'un compte soit un compte`);
  const mesure = {
    presentees: mediane(passes.map((p) => p.presentees)),
    auDela: mediane(passes.map((p) => p.resume.auDela)),
    perdues: mediane(passes.map((p) => p.perdues)),
    pire: mediane(passes.map((p) => p.resume.pire)),
  };
  const base = lireLigneDeBase();
  const entree = base[projet];
  if (entree && entree.dpr !== DPR) {
    throw new Error(`la ligne de base de ${projet} a ete mesuree au dpr ${entree.dpr}, cette passe est au dpr ${DPR} : relance avec PERF_DPR=${entree.dpr}, ou acquiers une ligne neuve`);
  }
  const ligne: Ligne | undefined = entree?.moments[moment];
  const v = verdict(mesure, ligne);
  const lignes = passes.map(
    (p, i) =>
      `  passe ${i + 1} : ${p.presentees} images presentees, ${p.resume.intervalles} intervalles, ${p.resume.auDela} au-dela, pire ${p.resume.pire} ms, ${p.perdues} perdues, ` +
      `60/30/20 Hz ${p.resume.hz60}/${p.resume.hz30}/${p.resume.hz20} %, p5 ${p.resume.p5Fps} fps` +
      (p.rendu ? ` ; rendu : ${p.rendu.appels} appels, ${p.rendu.triangles} triangles, ${p.rendu.programmes} programmes, ${p.rendu.geometries} geometries, ${p.rendu.textures} textures` : ""),
  );
  const pire = passes.reduce((a, b) => (b.resume.pire > a.resume.pire ? b : a));
  const fonctions = pire.pireFonctions.map((f) => `    ${f.propreMs} ms  ${f.nom}`);
  const rapport = [`${projet} / ${moment} : ${v.message}`, ...lignes, `  la pire image (${pire.resume.pire} ms), temps propre du fil principal :`, ...fonctions].join("\n");
  info.annotations.push({ type: "mesure", description: rapport });
  console.log(rapport);
  expect(
    mesure.presentees,
    `${projet} / ${moment} n'a presente que ${mesure.presentees} images (plancher ${PLANCHER_PRESENTEES}) : la barre ne peut pas conclure sur ce moment\n${rapport}`,
  ).toBeGreaterThanOrEqual(PLANCHER_PRESENTEES);
  if (ACQUERIR && !v.rouge && v.progres) {
    base[projet] = { dpr: DPR, moments: { ...(entree?.moments ?? {}), [moment]: acquerir(ligne, mesure, cible, new Date().toISOString().slice(0, 10)) } };
    ecrireLigneDeBase(base);
  }
  expect(v.rouge, rapport).toBe(false);
  if (!ACQUERIR) expect(ligne !== undefined, `${projet} / ${moment} n'a pas de ligne de base : pnpm run perf:baseline`).toBe(true);
}
