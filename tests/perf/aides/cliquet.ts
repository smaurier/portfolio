/**
 * LE CLIQUET DE LA BARRE (pilier 1).
 *
 * Une barre a zero qui bloque `main` des le premier jour empecherait aussi
 * le correctif de securite. Donc chaque moment tient son MEILLEUR RESULTAT
 * CONNU, et rouge = pire que lui : une regression. La cible est ecrite a
 * cote, toujours ; quand un moment l'atteint, le cliquet s'y verrouille.
 * On juge des COMPTES (images au-dela du budget, images perdues), pas des
 * durees : une duree varie de quarante points d'une passe a l'autre sur
 * cette machine, un compte median de trois passes tient. Ce module est pur.
 *
 * UN PROGRES NON ACQUIS RESTE VERT, ici, et rouge dans le cliquet des lints
 * (`tests/harnais/cliquets.test.ts`). C'est voulu, et c'est la difference
 * des deux mesures : un compte de lint est deterministe, une mediane de
 * trois passes ne l'est pas, et faire tomber `main` parce que le bruit a
 * joue dans le bon sens serait un rouge sans cause. Le prix est nomme : un
 * progres reel se reperd sans bruit tant que `pnpm run perf:baseline` ne
 * l'a pas inscrit ; le rapport le dit a chaque passe (« progres a
 * acquerir »).
 */
export type Compte = { auDela: number; perdues: number };
export type Mesure = Compte & { pire: number };
export type Ligne = { meilleur: Compte; cible: Compte; pire: number; date: string };
export type Verdict = { rouge: boolean; progres: boolean; message: string };

export function verdict(mesure: Compte, ligne: Ligne | undefined): Verdict {
  if (!ligne) return { rouge: false, progres: true, message: "aucune ligne de base : a acquerir (pnpm run perf:baseline)" };
  const detail =
    `au-dela ${mesure.auDela} (meilleur connu ${ligne.meilleur.auDela}, cible ${ligne.cible.auDela}), ` +
    `perdues ${mesure.perdues} (meilleur connu ${ligne.meilleur.perdues}, cible ${ligne.cible.perdues})`;
  const recul = mesure.auDela > ligne.meilleur.auDela || mesure.perdues > ligne.meilleur.perdues;
  if (recul) return { rouge: true, progres: false, message: `RECUL : ${detail}` };
  const mieux = mesure.auDela < ligne.meilleur.auDela || mesure.perdues < ligne.meilleur.perdues;
  if (mieux) return { rouge: false, progres: true, message: `progres a acquerir (pnpm run perf:baseline) : ${detail}` };
  return { rouge: false, progres: false, message: `tenu : ${detail}` };
}

/**
 * La ligne apres acquisition : chaque compte au mieux des deux, la pire
 * duree au mieux des deux (informative, jamais jugee), la cible DU CODE
 * (une cible resserree dans le code doit gagner sur le JSON, pas l'inverse),
 * la date de la mesure.
 */
export function acquerir(ligne: Ligne | undefined, mesure: Mesure, cible: Compte, date: string): Ligne {
  if (!ligne) return { meilleur: { auDela: mesure.auDela, perdues: mesure.perdues }, cible, pire: mesure.pire, date };
  return {
    meilleur: { auDela: Math.min(ligne.meilleur.auDela, mesure.auDela), perdues: Math.min(ligne.meilleur.perdues, mesure.perdues) },
    cible,
    pire: Math.min(ligne.pire, mesure.pire),
    date,
  };
}
