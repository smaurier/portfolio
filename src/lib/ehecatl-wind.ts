import { swingAzimuth, swingSpeed, type NepantlaDirection } from "./nepantla";

/**
 * Ehecatl (03/09, etage 4 Nepantla) : le vent du passage rendu
 * VISIBLE. Pendant un voyage cardinal, des filaments de vent balaient
 * l'orbite autour du cerf dans le sens du voyage : c'est Ehecatl qui
 * emporte le contenu et la camera ne fait que le suivre, donc le vent
 * va PLUS VITE que la camera (laps > 1 tour la ou la camera n'en fait
 * qu'un). Meme horloge que tout le passage : l'ease vient de
 * swingAzimuth (source unique lib/nepantla), l'intensite de swingSpeed
 * (rien aux bornes, pic au coeur du mouvement, la ou la nav se fait).
 * Le Centre (jade) est un retour au foyer sans orbite : pas de vent.
 */

export type StreakSpec = {
  /** Azimut de repos (radians, 0..2π). */
  azimuth0: number;
  /** Distance au cerf (l'axe du monde). */
  radius: number;
  /** Hauteur du filament au-dessus du sol. */
  height: number;
  /** Longueur de base du filament (unites monde). */
  length: number;
  /** Tours de vent la ou la camera n'en fait qu'un (> 1 : Ehecatl devance). */
  laps: number;
};

/** Pseudo-hasard deterministe par graine (meme convention que les
 *  lames d'obsidienne : multiples fractionnaires, pas de RNG). */
function frac(x: number): number {
  return x - Math.floor(x);
}

/** Le filament d'une graine (0..1), toujours identique. */
export function streakSpec(seed: number): StreakSpec {
  return {
    azimuth0: frac(seed) * Math.PI * 2,
    radius: 3.2 + frac(seed * 13.7) * 3.4,
    height: 0.4 + frac(seed * 7.3) * 2.8,
    length: 1.2 + frac(seed * 29.1) * 1.6,
    laps: 1.6 + frac(seed * 47.9),
  };
}

/** Azimut du filament a progress t : l'azimut de repos plus le voyage
 *  du vent (l'orbite camera multipliee par les tours du filament :
 *  meme ease, meme sens, jamais de retour en arriere). */
export function streakAzimuth(t: number, spec: StreakSpec, direction: NepantlaDirection): number {
  return spec.azimuth0 + swingAzimuth(t, direction) * spec.laps;
}

/** Visibilite du vent : la vitesse du passage. Zero aux deux bouts
 *  (le monde au repos ne montre pas Ehecatl), pic au coeur. Jade :
 *  pas d'orbite, pas de vent. */
export function streakIntensity(t: number, direction: NepantlaDirection): number {
  if (swingAzimuth(1, direction) === 0) return 0;
  return swingSpeed(t);
}
