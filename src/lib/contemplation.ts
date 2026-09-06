/**
 * La contemplation (06/09, Sylvain : l'heure de Tenochtitlan « à
 * n'intégrer qu'en mode contemplation », option 2 : la vraie heure
 * d'abord, puis le jour entier). Le deroule, en secondes depuis le geste :
 *  - ARRIVE : du progres courant a l'heure vraie de Tenochtitlan, en
 *    douceur ;
 *  - HOLD : on se tient sur l'heure vraie (la camera orbite, le toast dit
 *    l'heure) ;
 *  - UP / DOWN / BACK : le jour entier a vitesse uniforme, heure vraie ->
 *    midi -> nuit -> heure vraie, chaque troncon en ease-in-out ;
 *  - puis HOLD de nouveau, et ainsi de suite jusqu'au geste qui arrete.
 * Partie pure : le composant (scene-controls.tsx) ne fait que scroller la
 * page a `progress` et afficher le toast quand `atRealHour`.
 */

export const CONTEMPLATION = {
  /** Du progres courant a l'heure vraie (s). */
  arrive: 4,
  /** Tenue sur l'heure vraie (s). */
  hold: 30,
  /** Duree d'un arc complet nuit -> midi (s), la vitesse de reference. */
  day: 75,
};

export type ContemplationPhase = "arrive" | "hold" | "up" | "down" | "back";

export type ContemplationStep = {
  /** Progres de l'arc, 0 (nuit) .. 1 (midi). */
  progress: number;
  phase: ContemplationPhase;
  /** Vrai pendant la tenue sur l'heure de Tenochtitlan. */
  atRealHour: boolean;
};

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function smooth(u: number): number {
  const c = clamp01(u);
  return c * c * (3 - 2 * c);
}

/** Un troncon de `a` vers `b` en `seconds`, ease-in-out ; `seconds` = 0 = deja arrive. */
function leg(a: number, b: number, elapsed: number, seconds: number): number {
  if (seconds <= 0) return b;
  return a + (b - a) * smooth(elapsed / seconds);
}

export function contemplationStep(elapsed: number, from: number, realArc: number, c = CONTEMPLATION): ContemplationStep {
  const start = clamp01(from);
  const real = clamp01(realArc);
  if (elapsed < c.arrive) return { progress: leg(start, real, Math.max(0, elapsed), c.arrive), phase: "arrive", atRealHour: false };
  // Un tour = tenue + jour entier (montee + descente + retour).
  const up = c.day * (1 - real);
  const down = c.day;
  const back = c.day * real;
  const cycle = c.hold + up + down + back;
  const t = (elapsed - c.arrive) % cycle;
  if (t < c.hold) return { progress: real, phase: "hold", atRealHour: true };
  if (t < c.hold + up) return { progress: leg(real, 1, t - c.hold, up), phase: "up", atRealHour: false };
  if (t < c.hold + up + down) return { progress: leg(1, 0, t - c.hold - up, down), phase: "down", atRealHour: false };
  return { progress: leg(0, real, t - c.hold - up - down, back), phase: "back", atRealHour: false };
}
