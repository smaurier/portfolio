/**
 * LA PARTITION DU TEXTE (11/10/2026).
 *
 * Spec : docs/superpowers/specs/2026-10-10-partition-texte-design.md.
 * Audit visuel du 10/10 : le Centre empilait cinq systemes de texte dans le
 * meme coin, chacun avec sa propre horloge (hero 0 -> 0,25, cinq chapitres
 * par phase, le chant en flux de 0 a 0,82, la cloture de 0,75 a 1) ; a
 * t=0,15 trois panneaux se lisaient ensemble, a t=0,4 le chant cachait le
 * cerf. Sylvain : « un seul panneau a la fois, mais surtout on doit aussi
 * enlever du texte [...] C'est l'image qui prevaut. »
 *
 * La regle :
 *  1. une partition par page : chaque bloc recoit une fenetre [debut, fin]
 *     dans l'arc ; deux fenetres ne se chevauchent jamais et gardent au
 *     moins ECART_MIN entre elles ; des silences sont reserves, aucune
 *     fenetre ne les approche a moins de ECART_MIN ;
 *  2. l'image prevaut : le climax (0,75) est dans un silence ;
 *  3. une grammaire pour tous : entree sur les premiers 15 % de la
 *     fenetre, tenue, sortie sur les derniers 15 %, la sortie finit DANS
 *     la fenetre (l'ecart entre deux blocs est un vrai vide) ;
 *  4. lisible : toute tenue dure au moins TENUE_MIN de l'arc (8 %, soit
 *     140 px sur l'Accueil a 800 px de haut, deux crans de molette ; la
 *     regle du 13/09, « l'encadre apparait un court moment, c'est un
 *     bug », passee de 12 a 8 % parce que les blocs sont des one-liners
 *     et qu'on garde un silence de 12 % et le chant dans l'arc).
 *
 * Deux cas de bord qui sont des intentions : une fenetre qui commence a 0
 * n'a pas d'entree (le hero est la quand on arrive, avant tout
 * defilement) ; une fenetre qui finit a 1 ne sort jamais (la cloture reste
 * posee pendant l'acte de sortie, le dernier 0,55 vh hors arc, ou le
 * progres de l'arc vaut 1).
 *
 * Seule la cloture est exemptee de TENUE_MIN (0,04 d'arc sans sortie :
 * 3,4 %) ; le hero, lui, tient 8,5 % et la regle s'applique.
 *
 * Pur : aucune lecture du DOM ici. Le composant qui applique l'etat par
 * image est use-pilote-fenetre.ts.
 */
import { clampProgress } from "./camera-path";

export type Fenetre = { readonly debut: number; readonly fin: number };
export type Phase = "avant" | "entree" | "tenue" | "sortie" | "apres";
export type EtatBloc = {
  /** 0 avant et apres ; monte pendant l'entree, 1 en tenue, descend en sortie. */
  opacite: number;
  phase: Phase;
  /** La position dans la phase courante, 0 -> 1 (pour le CSS : `--avancement`). */
  avancement: number;
};

/** L'ecart minimal entre deux fenetres, et entre une fenetre et un silence. */
export const ECART_MIN = 0.02;
/** La part de la fenetre consommee par l'entree, puis par la sortie. */
export const PART_ENTREE = 0.15;
export const PART_SORTIE = 0.15;
/** La tenue minimale d'un bloc, en fraction de l'arc. */
export const TENUE_MIN = 0.08;

export type BlocCentre = "hero" | "chapitre-0" | "chant" | "chapitre-1" | "chapitre-2" | "cloture";

/**
 * La partition du Centre (docs/da/plans/centre.md pour la scene a chaque
 * moment) : le hero a l'arrivee ; I · L'approche dans la penombre ; le
 * chant quand la lumiere monte et que le mais pousse ; II · Le regard
 * quand la tete se tourne ; le silence du face-a-face, climax compris ;
 * IV · Les chemins quand ils se revelent ; la cloture sur l'image finale.
 * Les chapitres gardes sont I, II et IV (III « Un silence. » est dit par
 * le silence lui-meme, V « L'Ollin » par la cloture qui est deja le
 * depart) ; les index 0, 1, 2 suivent l'ordre du dictionnaire.
 */
export const PARTITION_CENTRE: Record<BlocCentre, Fenetre> = {
  hero: { debut: 0, fin: 0.1 },
  "chapitre-0": { debut: 0.12, fin: 0.3 },
  chant: { debut: 0.32, fin: 0.5 },
  "chapitre-1": { debut: 0.52, fin: 0.64 },
  "chapitre-2": { debut: 0.8, fin: 0.94 },
  cloture: { debut: 0.96, fin: 1 },
};

/** Le face-a-face tenu, et le climax 0,75 dedans : l'image seule. */
export const SILENCES_CENTRE: readonly Fenetre[] = [{ debut: 0.66, fin: 0.78 }];

/** Tolerance des comparaisons : 0,64 + 0,02 n'est pas exactement 0,66 en flottant. */
const EPSILON = 1e-9;

/** La duree de la tenue d'une fenetre, en fraction de l'arc. */
export function tenueDe(fenetre: Fenetre): number {
  const entree = fenetre.debut <= 0 ? 0 : PART_ENTREE;
  const sortie = fenetre.fin >= 1 ? 0 : PART_SORTIE;
  return (fenetre.fin - fenetre.debut) * (1 - entree - sortie);
}

export function etatBloc(progress: number, fenetre: Fenetre): EtatBloc {
  const p = clampProgress(progress);
  const { debut, fin } = fenetre;
  const sansEntree = debut <= 0;
  const sansSortie = fin >= 1;
  if (p < debut) return { opacite: 0, phase: "avant", avancement: 0 };
  if (p >= fin && !sansSortie) return { opacite: 0, phase: "apres", avancement: 1 };
  const t = fin > debut ? (p - debut) / (fin - debut) : 1;
  // Les frontieres de phase portent la meme tolerance que partitionValide :
  // (0,37 - 0,2) / 0,2 vaut 0,8499999999999999 en flottant, pas 0,85.
  if (!sansEntree && t < PART_ENTREE - EPSILON) {
    const a = Math.min(1, Math.max(0, t / PART_ENTREE));
    return { opacite: a, phase: "entree", avancement: a };
  }
  const debutSortie = 1 - PART_SORTIE;
  if (!sansSortie && t >= debutSortie - EPSILON) {
    const a = Math.min(1, Math.max(0, (t - debutSortie) / PART_SORTIE));
    return { opacite: 1 - a, phase: "sortie", avancement: a };
  }
  const debutTenue = sansEntree ? 0 : PART_ENTREE;
  const finTenue = sansSortie ? 1 : debutSortie;
  const a = finTenue > debutTenue ? Math.max(0, Math.min(1, (t - debutTenue) / (finTenue - debutTenue))) : 1;
  return { opacite: 1, phase: "tenue", avancement: a };
}

/**
 * Les violations d'une partition, vide si tout va. Un oracle unitaire
 * l'applique a PARTITION_CENTRE : la prochaine fenetre deplacee a la main
 * qui mord sur le silence ou sur sa voisine fait rougir la suite.
 */
export function partitionValide(
  partition: Record<string, Fenetre>,
  silences: readonly Fenetre[],
  options: { ignorerTenue?: readonly string[]; dernier?: string } = {},
): string[] {
  const ignorer = new Set(options.ignorerTenue ?? []);
  const dernier = options.dernier ?? "cloture";
  const violations: string[] = [];
  const blocs = Object.entries(partition).sort((a, b) => a[1].debut - b[1].debut);
  for (const [nom, f] of blocs) {
    if (!(f.debut >= 0 && f.fin <= 1 && f.debut < f.fin)) {
      violations.push(`${nom} : fenetre invalide [${f.debut}, ${f.fin}]`);
    }
    const tenue = tenueDe(f);
    if (!ignorer.has(nom) && tenue + EPSILON < TENUE_MIN) {
      violations.push(`${nom} : tenue ${(tenue * 100).toFixed(1)} % < ${TENUE_MIN * 100} %`);
    }
    for (const s of silences) {
      const avant = f.fin + ECART_MIN <= s.debut + EPSILON;
      const apres = f.debut + EPSILON >= s.fin + ECART_MIN;
      if (!avant && !apres) violations.push(`${nom} : touche le silence [${s.debut}, ${s.fin}]`);
    }
  }
  for (let i = 1; i < blocs.length; i++) {
    const [nomA, a] = blocs[i - 1];
    const [nomB, b] = blocs[i];
    if (b.debut + EPSILON < a.fin) {
      violations.push(`${nomA} et ${nomB} se chevauchent`);
    } else if (b.debut - a.fin + EPSILON < ECART_MIN) {
      violations.push(`${nomA} et ${nomB} : ecart ${(b.debut - a.fin).toFixed(3)} < ${ECART_MIN}`);
    }
  }
  if (Object.hasOwn(partition, dernier) && blocs[blocs.length - 1][0] !== dernier) {
    violations.push(`${dernier} n'est pas le dernier bloc`);
  }
  return violations;
}
