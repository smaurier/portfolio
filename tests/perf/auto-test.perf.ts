import { expect, test } from "@playwright/test";
import { BUDGET_BUREAU_MS, fenetre, fenetrePaires, paires, perdues, presentees, resumer, trames } from "./aides/images";
import { tracer } from "./aides/tracage";

/**
 * L'AUTO-TEST DE MESURE : une barre qui ne sait pas quand elle ne peut pas
 * mesurer ment.
 *
 * Avant de conclure sur le site, la suite mesure une rotation CSS isolee :
 * une page `data:` sans un octet de script, une animation que le
 * compositeur tient seul. Si des images y manquent, LE CHEMIN DE MESURE
 * est en defaut (pas de compositeur dans la trace, rendu sans vsync, GPU
 * absent ou drapeaux ANGLE perdus) et le projet `perf-bureau`, qui depend
 * de celui-ci, ne tourne pas. Le design du 21/09 nommait « la rotation CSS
 * de la Piedra du voile » ; on prefere une rotation HORS du site :
 * l'auto-test ne doit pas dependre du site qu'il sert a mesurer.
 *
 * CE QU'IL NE GARDE PAS, mesure le 03/10 : le bruit de la machine. Une
 * rotation composee ne depend pas du fil principal, et Windows arbitre en
 * faveur du navigateur : 24 boucles `for(;;)` sur 12 coeurs (le build a
 * pris 2 min au lieu de 37 s) ont laisse 191 images presentees, 0 au-dela,
 * pire 19,1 ms ; une page avec 8 ms de script par image a tenu 60 Hz sous
 * la meme charge ; le rendu logiciel force (`--disable-gpu`) aussi ; 24
 * boucles en priorite haute ont empeche Chromium de charger la page, sans
 * faire rougir l'assertion. Le bruit est donc porte ailleurs : par la
 * mediane de trois passes et par un cliquet qui juge des comptes, pas des
 * durees (`aides/cliquet.ts`).
 *
 * VU ROUGE le 03/10 par sabotage de la page : la rotation passee en
 * animation NON composee (`margin-left` posee par rAF) sous 40 ms de
 * blocage par image → 143 presentees, 72 au-dela, pire 40,7 ms, 102
 * perdues, code 1. Le meme blocage avec la rotation `transform` gardee
 * reste vert (246 presentees, 0 au-dela) : c'est bien la presentation que
 * l'assertion juge, pas le fil principal.
 *
 * Releve du 22/09 : 60 Hz tenus, et UNE trame perdue, deterministe, a une
 * seconde de la premiere presentation (un artefact de naissance de la page,
 * pas du bruit). La fenetre commence donc 1,5 s apres la PREMIERE
 * presentation (pas la premiere trame de la liste : c'etait la perdue,
 * avant le tri par instant), et dure trois secondes : ~180 images.
 */
const PAGE =
  "data:text/html," +
  encodeURIComponent(
    `<!doctype html><style>body{margin:0;background:#111}div{width:200px;height:200px;margin:100px;background:#c84;will-change:transform;animation:r 2s linear infinite}@keyframes r{to{transform:rotate(360deg)}}</style><div></div>`,
  );
const NAISSANCE_US = 1_500_000;
const MESURE_MS = 3000;
/** A 60 Hz, trois secondes font 180 images ; en dessous de 120, le compositeur ne presente pas en continu. */
const PLANCHER_IMAGES = 120;

test("le compositeur presente une rotation CSS a 60 Hz, sans image en retard ni perdue", async ({ page }, info) => {
  const t = await tracer(page);
  await page.goto(PAGE);
  await page.waitForTimeout(NAISSANCE_US / 1000 + MESURE_MS);
  const toutes = trames(await t.arreter());
  const premiere = toutes.find((x) => x.etat.startsWith("STATE_PRESENTED"));
  if (!premiere) throw new Error("aucune image presentee : la trace ne porte pas le compositeur");
  const debut = premiere.fin + NAISSANCE_US;
  const dans = fenetre(toutes, debut, Number.MAX_SAFE_INTEGER);
  const r = resumer(fenetrePaires(paires(toutes), debut, Number.MAX_SAFE_INTEGER).map((x) => x.ms), BUDGET_BUREAU_MS);
  const images = presentees(dans);
  const p = perdues(dans);
  const rapport = `auto-test : ${images} images presentees, ${r.auDela} au-dela du budget, pire ${r.pire} ms, ${p} perdues`;
  info.annotations.push({ type: "mesure", description: rapport });
  console.log(rapport);
  expect(images, `${rapport} -- trop peu d'images : le compositeur ne presente pas en continu`).toBeGreaterThan(PLANCHER_IMAGES);
  expect(r.auDela + p, `${rapport} -- le chemin de mesure est en defaut (compositeur, vsync, GPU) : la barre ne peut pas conclure`).toBe(0);
});
