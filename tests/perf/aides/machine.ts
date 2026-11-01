import os from "node:os";

/**
 * LA MACHINE QUI MESURE (01/11, retour Sylvain : deux pushs vers `main`
 * en recul net sur TOUT, voile compris, depuis un portable ESN jamais
 * utilise pour ce depot -- la ligne de base avait ete acquise ailleurs,
 * probablement la tour). Chaque poste garde desormais sa propre
 * enveloppe : comparer un portable a la tour qui a mesure la ligne de
 * base d'origine n'a jamais eu de sens, comme comparer deux dpr n'en a
 * pas (meme principe, cf le controle `entree.dpr !== dpr` de barre.ts).
 *
 * `PERF_MACHINE` nomme un poste a la main si le hostname systeme n'est
 * pas lisible dans le JSON versionne.
 */
export function identifiantMachine(): string {
  return process.env.PERF_MACHINE || os.hostname();
}

/**
 * La ligne de base d'origine (avant ce changement), gardee comme repli en
 * lecture pour un poste qui n'a pas encore la sienne -- retrocompatible,
 * aucune migration a la main. Jamais reecrite une fois qu'un poste a sa
 * propre entree (cf ligne-de-base.ts, entreeMachine/ecrireEntreeMachine) :
 * un repere historique, pas une cible mouvante.
 */
export const MACHINE_PARTAGEE = "partagee";
