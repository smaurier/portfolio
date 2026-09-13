/**
 * LA VEILLE (13/09, Sylvain : « j'adore [...] les textes peuvent
 * s'effacer, une transition et une contemplation facon Miyazaki avec une
 * musique de fond »). Miyazaki appelle ca le ma, l'intervalle : le plan ou
 * rien n'arrive et ou le monde continue d'exister sans nous.
 *
 * Quand le visiteur ne fait plus un geste pendant une VINGTAINE de
 * secondes (vingt signes des jours, vingt jours du mois : le nombre est
 * aussi attestee que le 52, deja donne au Feu Nouveau), les textes, les
 * controles et le bandeau s'effacent, la camera quitte le chemin du
 * defilement pour une derive tres lente autour du cerf, la profondeur de
 * champ s'adoucit, et une musique entre sous les couches ambiantes. Tout
 * geste rend le monde en moins d'une seconde.
 *
 * Pur : l'echeance, la part de veille lissee (lente a entrer, vive a
 * sortir), la derive de la camera, la melodie. Les effets sont dans
 * `veille.tsx` (le compte, l'attribut), `orbit-camera`, `post-fx`,
 * `sound-design` et `globals.css`.
 */
export const VEILLE_DELAI_MS = 20_000;
/** `?veille=<ms>` sur l'URL raccourcit le delai (tests, demonstration). */
export const VEILLE_PARAM = "veille";
/** Attribut pose sur <html> pendant la veille. */
export const VEILLE_ATTR = "data-veille";
export const VEILLE_EVENT = "nahual:veille";

export function veilleDue(now: number, dernierGeste: number, delai: number): boolean {
  return now - dernierGeste >= delai;
}

/** Constantes de temps : l'entree prend ~2,5 s, le reveil ~0,25 s. */
const ENTREE_S = 2.5;
const REVEIL_S = 0.25;
const SNAP_EPSILON = 0.002;
/** Part de veille (0 eveil, 1 veille), approchee par le temps ecoule. */
export function approachVeille(current: number, target: number, dt: number): number {
  const tau = target > current ? ENTREE_S : REVEIL_S;
  const alpha = 1 - Math.exp(-dt / tau);
  const next = current + (target - current) * alpha;
  return Math.abs(target - next) < SNAP_EPSILON ? target : next;
}

/** La derive de la camera pendant la veille, en fonction du temps de
 * veille (s) : un tour tres lent (un tour complet en ~3 min) et une
 * respiration en hauteur. Nulle a t = 0 pour partir de la pose du chemin. */
export function deriveVeille(t: number): { azimuth: number; height: number } {
  return {
    azimuth: t * 0.035,
    height: 0.3 * Math.sin(t * 0.11) * Math.min(1, t / 8),
  };
}

/** La gamme : pentatonique mineure sur la (A2 = 110 Hz), deux octaves,
 * en frequences. Un timbre doux, un registre bas : la musique reste sous le
 * vent. */
export const VEILLE_GAMME: readonly number[] = [110, 130.81, 146.83, 164.81, 196, 220, 261.63, 293.66, 329.63, 392, 440];

/** Generateur deterministe (LCG) : la meme phrase pour le meme index. */
function bruit(i: number): number {
  let x = (i * 1103515245 + 12345) & 0x7fffffff;
  x = (x * 1103515245 + 12345) & 0x7fffffff;
  return x / 0x7fffffff;
}

export type NoteVeille = { degre: number | null; frequence: number; duree: number };

/** La note suivante de la melodie : un silence une fois sur quatre
 * environ, sinon un degre a au plus trois pas du precedent, une duree
 * entre 1,2 et 4 s. */
export function noteVeille(index: number, precedent: number): NoteVeille {
  const r1 = bruit(index * 3 + 1);
  const r2 = bruit(index * 3 + 2);
  const r3 = bruit(index * 3 + 3);
  const duree = 1.2 + r3 * 2.8;
  if (r1 < 0.24) return { degre: null, frequence: 0, duree };
  let degre: number;
  if (precedent < 0) degre = Math.floor(r2 * 4) + 2;
  else {
    const pas = Math.round((r2 - 0.5) * 6); // -3..3
    degre = Math.min(VEILLE_GAMME.length - 1, Math.max(0, precedent + pas));
  }
  return { degre, frequence: VEILLE_GAMME[degre], duree };
}
