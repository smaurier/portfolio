/**
 * DETECTION AUTOMATIQUE D'UN APPAREIL FAIBLE (01/11, retour Sylvain : « j'ai
 * vu les animations sur le telephone d'une amie, c'etait moche »).
 *
 * Le seul repli existant (`getPerfProfile`, mobile-perf.ts) ne regarde QUE
 * la largeur d'ecran et un bouton manuel (eco, scene-controls.tsx) : un
 * telephone large ou simplement a GPU faible passe entre les deux,
 * profil complet, mauvaises images.
 *
 * Meme principe que mobile-perf.ts (« mesurer plutot que deviner ») : on
 * chronometre les vraies images une fois la scene revelee (cf
 * apres-le-voile.ts), et si elles sont trop souvent en retard on bascule
 * sur le MEME profil eco que le bouton manuel -- pas un troisieme palier,
 * la machinerie existe deja (lib/scene-controls.ts, resolveQuality).
 *
 * Fonction PURE, decouplee de requestAnimationFrame : le composant qui
 * chronometre (use-detection-perf-faible.ts) reste mince.
 */

export type ReglesDetection = {
  /** Au-dela de ce delai entre deux images, une image compte « en retard ».
   * 33,3 ms = BUDGET_TELEPHONE_MS du harnais de perf (tests/perf/aides/
   * images.ts), 30 im/s : le seuil le plus genereux du depot, donc le
   * signal le moins susceptible de se declencher a tort. */
  seuilMs: number;
  /** Fraction d'images en retard, dans la fenetre mesuree, qui declenche le repli. */
  tauxDeclenchement: number;
  /** Images ignorees au debut (compilation des shaders, premier GC) : un
   * demarrage lent est normal partout, pas un signal d'appareil faible. */
  imagesIgnorees: number;
  /** Nombre minimal d'images mesurees (apres les images ignorees) pour
   * conclure quoi que ce soit -- une fenetre trop courte ne juge pas. */
  echantillonMinimal: number;
};

export const REGLES_PAR_DEFAUT: ReglesDetection = {
  seuilMs: 33.3,
  tauxDeclenchement: 0.4,
  imagesIgnorees: 15,
  echantillonMinimal: 40,
};

/** Fraction des deltas (ms entre deux images) au-dela du seuil. */
export function tauxImagesEnRetard(deltasMs: number[], seuilMs: number): number {
  if (deltasMs.length === 0) return 0;
  const enRetard = deltasMs.filter((d) => d > seuilMs).length;
  return enRetard / deltasMs.length;
}

/** L'appareil doit-il basculer sur le profil eco, au vu des images mesurees ? */
export function appareilFaible(deltasMs: number[], regles: ReglesDetection = REGLES_PAR_DEFAUT): boolean {
  const mesures = deltasMs.slice(regles.imagesIgnorees);
  if (mesures.length < regles.echantillonMinimal) return false;
  return tauxImagesEnRetard(mesures, regles.seuilMs) >= regles.tauxDeclenchement;
}
