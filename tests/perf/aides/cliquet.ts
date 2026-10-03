/**
 * LE CLIQUET DE LA BARRE (pilier 1).
 *
 * Une barre a zero qui bloque `main` des le premier jour empecherait aussi
 * le correctif de securite. Donc chaque moment tient une ENVELOPPE par
 * compte (images au-dela du budget, images perdues) : le MEILLEUR et le
 * MAXIMUM observes a l'acquisition, et le PLAFOND juge = maximum +
 * (maximum - meilleur). Rouge = pire que le plafond : une regression sort
 * de l'enveloppe du bruit mesure, marge comprise. Progres a acquerir =
 * mieux que le meilleur. La cible est ecrite a cote, toujours. On juge des
 * COMPTES, pas des durees : une duree varie de quarante points d'une passe
 * a l'autre sur cette machine. Ce module est pur.
 *
 * POURQUOI CETTE FORME (03/10, deux mesures). (1) Le premier cliquet jugeait
 * « rouge = pire que le meilleur connu ». Sur le voile, quatre jugements
 * (chacun la mediane de trois passes) sans qu'une ligne de code ait bouge :
 * au-dela 8, 10, 9 contre un meilleur de 6 ; perdues 25, 28, 20 contre 18 ;
 * rouge quatre fois sur quatre. Sur un compte bruite, un cliquet au
 * meilleur descend sa barre a chaque passe chanceuse, puis rougit sur toute
 * passe normale. (2) Un plafond au MAX observe de 3 jugements (6-8 / 19-21)
 * a ete depasse par 4 des 9 jugements de la soiree (au-dela 5 a 10, perdues
 * 17 a 28) : un max de K echantillons est depasse par le suivant une fois
 * sur K+1, par construction. D'ou la marge, qui n'est pas un nombre choisi
 * mais l'ecart MESURE entre le meilleur et le maximum, et K = 5 jugements
 * a l'acquisition (`pnpm run perf:enveloppe`). Le JSON est versionne : une
 * enveloppe qui bouge est relue dans le commit qui la porte.
 *
 * DEUX MODES D'ACQUISITION. `progres` (`pnpm run perf:baseline`) : le
 * meilleur descend ; maximum et plafond ne bougent pas, donc un recul ne
 * s'inscrit jamais et une passe chanceuse n'elargit pas la porte.
 * `enveloppe` (`pnpm run perf:enveloppe`) : meilleur, maximum et plafond
 * se recalculent, on mesure le bruit ; c'est l'acte du point zero et de
 * chaque changement voulu, dit dans le message du commit.
 *
 * UN PROGRES NON ACQUIS RESTE VERT, ici, et rouge dans le cliquet des lints
 * (`tests/harnais/cliquets.test.ts`) : un compte de lint est deterministe,
 * une mediane de trois passes ne l'est pas, et faire tomber `main` parce
 * que le bruit a joue dans le bon sens serait un rouge sans cause. Le prix
 * est nomme : un progres reel se reperd sans bruit tant que `perf:baseline`
 * ne l'a pas inscrit ; le rapport le dit a chaque passe.
 */
export type Compte = { auDela: number; perdues: number };
export type Mesure = Compte & { pire: number };
/** `meilleur` et `maximum` = min et max observes ; `plafond` = maximum + (maximum - meilleur), ce qui est juge. */
export type Ligne = { meilleur: Compte; maximum: Compte; plafond: Compte; cible: Compte; pire: number; date: string };
export type Verdict = { rouge: boolean; progres: boolean; message: string };
export type ModeAcquisition = "progres" | "enveloppe";

const compte = (nom: string, valeur: number, ligne: Ligne, cle: keyof Compte): string =>
  `${nom} ${valeur} (meilleur connu ${ligne.meilleur[cle]}, maximum connu ${ligne.maximum[cle]}, plafond ${ligne.plafond[cle]}, cible ${ligne.cible[cle]})`;

export function verdict(mesure: Compte, ligne: Ligne | undefined): Verdict {
  if (!ligne) return { rouge: false, progres: true, message: "aucune ligne de base : a acquerir (pnpm run perf:enveloppe)" };
  const detail = `${compte("au-dela", mesure.auDela, ligne, "auDela")}, ${compte("perdues", mesure.perdues, ligne, "perdues")}`;
  const recul = mesure.auDela > ligne.plafond.auDela || mesure.perdues > ligne.plafond.perdues;
  if (recul) return { rouge: true, progres: false, message: `RECUL : ${detail}` };
  const mieux = mesure.auDela < ligne.meilleur.auDela || mesure.perdues < ligne.meilleur.perdues;
  if (mieux) return { rouge: false, progres: true, message: `progres a acquerir (pnpm run perf:baseline) : ${detail}` };
  return { rouge: false, progres: false, message: `tenu : ${detail}` };
}

const min = (a: Compte, b: Compte): Compte => ({ auDela: Math.min(a.auDela, b.auDela), perdues: Math.min(a.perdues, b.perdues) });
const max = (a: Compte, b: Compte): Compte => ({ auDela: Math.max(a.auDela, b.auDela), perdues: Math.max(a.perdues, b.perdues) });
/** Le plafond : le maximum observe, plus l'ecart observe en marge. */
const plafond = (meilleur: Compte, maximum: Compte): Compte => ({
  auDela: maximum.auDela + (maximum.auDela - meilleur.auDela),
  perdues: maximum.perdues + (maximum.perdues - meilleur.perdues),
});

/**
 * La ligne apres acquisition : le meilleur au mieux des deux ; en mode
 * `enveloppe`, le maximum au pire des deux et le plafond recalcule, en mode
 * `progres` ni l'un ni l'autre ne bouge ; la pire duree au mieux des deux
 * (informative, jamais jugee) ; la cible DU CODE (une cible resserree dans
 * le code doit gagner sur le JSON, pas l'inverse) ; la date de la mesure.
 */
export function acquerir(ligne: Ligne | undefined, mesure: Mesure, cible: Compte, date: string, mode: ModeAcquisition = "progres"): Ligne {
  const compteMesure: Compte = { auDela: mesure.auDela, perdues: mesure.perdues };
  if (!ligne) return { meilleur: compteMesure, maximum: compteMesure, plafond: compteMesure, cible, pire: mesure.pire, date };
  const meilleur = min(ligne.meilleur, compteMesure);
  const maximum = mode === "enveloppe" ? max(ligne.maximum, compteMesure) : ligne.maximum;
  return {
    meilleur,
    maximum,
    plafond: mode === "enveloppe" ? plafond(meilleur, maximum) : ligne.plafond,
    cible,
    pire: Math.min(ligne.pire, mesure.pire),
    date,
  };
}
