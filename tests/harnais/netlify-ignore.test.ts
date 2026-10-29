import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { RACINE } from "../../eslint/cliquets.mjs";

/**
 * LA REGLE QUI DECIDE SI NETLIFY CONSTRUIT (oracle ecrit le 29/10, apres
 * un incident reel).
 *
 * `netlify.toml` porte une commande `ignore` : code 0 = on saute la
 * construction, code different de 0 = on construit. Elle existe depuis le
 * 14/09 pour ne pas bruler les 300 minutes mensuelles sur des commits qui
 * ne changent rien de ce qui est servi au visiteur. Ses trois gardes
 * avaient ete verifiees A LA MAIN sur de vrais commits, et jamais depuis.
 *
 * CE QUI EST ARRIVE LE 28/10. `main` est passe de b7d3944 a f344ec7 (51
 * fichiers, dont douze de `src/`), et Netlify a ANNULE le deploiement :
 * « Canceled build due to no content change ». Le site a servi la version
 * du 10/10 pendant une demi-heure sans que rien ne le signale -- et
 * interroger le site ne le montrait pas, les reponses venant du cache Edge
 * (Age : 18 jours).
 *
 * LA CAUSE : si `CACHED_COMMIT_REF` est VIDE, `git diff --quiet $CACHED
 * $COMMIT` n'a plus qu'une reference. `git diff --quiet <commit>` compare
 * alors l'arbre de travail a ce commit, ne trouve rien sur une copie
 * propre, et renvoie 0 -- donc on saute. Deux references identiques font
 * pareil. Le commentaire de `netlify.toml` affirmait l'inverse (« la
 * commande echoue, donc on construit : le defaut est du bon cote ») : il
 * etait faux, et le defaut etait du mauvais cote.
 *
 * CE QUE CET ORACLE GARDE : qu'on ne saute que pour une bonne raison, et
 * qu'on construise dans TOUS les cas douteux. Il lit la commande dans
 * `netlify.toml` lui-meme, pour qu'une modification du fichier soit
 * jugee ici, et il la lance dans `bash`, le shell de Netlify.
 */

/** La commande `ignore` de la section [build], lue dans le fichier servi a Netlify. */
function commandeIgnore(): string {
  const toml = readFileSync(join(RACINE, "netlify.toml"), "utf8");
  // La section [build] s'arrete au prochain en-tete entre crochets : les
  // contextes (branch-deploy, deploy-preview) ont leur propre `ignore`,
  // et ce n'est pas celui-la qu'on juge.
  const debut = toml.indexOf("[build]");
  expect(debut, "netlify.toml porte une section [build]").toBeGreaterThanOrEqual(0);
  const suite = toml.slice(debut + "[build]".length);
  const fin = suite.search(/^\[/m);
  const section = fin === -1 ? suite : suite.slice(0, fin);
  const trouve = /^\s*ignore\s*=\s*"(.*)"\s*$/m.exec(section);
  expect(trouve, "la section [build] porte une commande ignore").not.toBeNull();
  return trouve![1];
}

/** Le code de sortie de la commande, avec les deux variables que Netlify pose. */
function code(cached: string, commit: string): number {
  try {
    execFileSync("bash", ["-c", commandeIgnore()], {
      cwd: RACINE,
      env: { ...process.env, CACHED_COMMIT_REF: cached, COMMIT_REF: commit },
      stdio: "pipe",
    });
    return 0;
  } catch (erreur) {
    const stat = (erreur as { status?: number }).status;
    return typeof stat === "number" ? stat : 1;
  }
}

/**
 * Deux couples de commits REELS du depot, donc stables : l'histoire ne se
 * reecrit pas. `2b70e94` ne touche qu'un fichier de `docs/` (son parent est
 * `5754906`) ; `b7d3944` -> `f344ec7` est la poussee du 28/10, 51 fichiers
 * dont douze de `src/`.
 */
const DOCS_SEULEMENT = { avant: "5754906", apres: "2b70e94" };
const AVEC_DU_CODE = { avant: "b7d3944", apres: "f344ec7" };

describe("la regle qui decide si Netlify construit", () => {
  it("saute quand la difference ne touche que docs, tests, .scratch ou du markdown", () => {
    expect(code(DOCS_SEULEMENT.avant, DOCS_SEULEMENT.apres), "un commit de documentation seule ne doit pas construire").toBe(0);
  });

  it("construit des qu'un fichier servi au visiteur a change", () => {
    expect(code(AVEC_DU_CODE.avant, AVEC_DU_CODE.apres), "51 fichiers dont douze de src/ : il faut construire").not.toBe(0);
  });

  // LES TROIS CAS DOUTEUX. Chacun doit CONSTRUIRE : mieux vaut deux
  // minutes de construction qu'un site qui reste en arriere sans bruit.
  it("construit quand la reference du dernier deploiement manque", () => {
    // Le defaut du 28/10 : sans cette garde, la commande n'a plus qu'une
    // reference, compare l'arbre de travail a lui-meme, et saute.
    expect(code("", AVEC_DU_CODE.apres), "CACHED_COMMIT_REF vide : on construit, on ne saute pas").not.toBe(0);
  });

  it("construit quand les deux references sont la meme", () => {
    expect(code(AVEC_DU_CODE.apres, AVEC_DU_CODE.apres), "deux refs identiques : rien a comparer, donc on construit").not.toBe(0);
  });

  it("construit quand la reference est inconnue du clone", () => {
    // Clone superficiel : le commit cache peut ne pas avoir ete recupere.
    expect(code("0".repeat(40), AVEC_DU_CODE.apres), "ref inconnue : on construit").not.toBe(0);
  });
});
