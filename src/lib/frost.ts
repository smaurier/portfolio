/**
 * Le gel de l'Est (06/09, chantier Tlahuizcalpan, idee de Sylvain : « le
 * monde gele qui explose »). Itztlacoliuhqui, « tout s'est courbe sous le
 * froid », la matiere a l'etat sans vie (Andrews 2003, cf
 * docs/da/est-sources.md) : la page Services commence dans un monde pris
 * dans la glace, le temps arrete ; au lever du soleil, le premier dard fait
 * tout eclater, une fois, en temps reel (pas au scroll : une explosion ne
 * se rembobine pas) ; en marche arriere sous un seuil, le givre reprend
 * l'ecran quelques instants, le temps s'arrete, et le monde est de nouveau
 * gele. Machine d'etat pure.
 */

export const FROST = {
  /** Progres de scroll ou le soleil parait et ou tout eclate. */
  shatterAt: 0.55,
  /** En remontant sous ce seuil, le monde regele (sous shatterAt : pas de battement). */
  refreezeAt: 0.4,
  /** Le prelude : les dards de l'aube (volee de Venus, reponse du soleil)
   * avant que tout eclate (s). */
  preludeSeconds: 1.4,
  /** Duree de l'explosion (s), apres le prelude. */
  shatterSeconds: 2.6,
  /** Duree du regel : l'ecran givre, se tient, se degage sur le monde gele (s). */
  refreezeSeconds: 2.4,
};

export type FrostPhase = "frozen" | "shatter" | "thawed" | "refreeze";

export type FrostState = {
  phase: FrostPhase;
  /** Temps ecoule dans la phase courante (s). */
  t: number;
  /** Givre du monde : 1 gele, 0 degele. */
  frost: number;
  /** Progres des dards 0..1 pendant le prelude (0 hors prelude). */
  darts: number;
  /** Progres de l'explosion 0..1 (eclats, onde, poudre). */
  shatter: number;
  /** Couverture de givre sur l'ecran 0..1 (regel). */
  screen: number;
  /** Echelle de temps des animations (cerf, vent) : 0 = fige. */
  timeScale: number;
};

export function createFrostState(): FrostState {
  return { phase: "frozen", t: 0, frost: 1, darts: 0, shatter: 0, screen: 0, timeScale: 0 };
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}

function enter(s: FrostState, phase: FrostPhase): void {
  s.phase = phase;
  s.t = 0;
}

/** Une image. `reduced` : pas d'explosion animee ni d'ecran gele, on
 * bascule d'un etat a l'autre. */
export function frostStep(s: FrostState, progress: number, dt: number, reduced: boolean): FrostState {
  s.t += dt;
  switch (s.phase) {
    case "frozen":
      s.frost = 1; s.shatter = 0; s.darts = 0; s.screen = 0; s.timeScale = 0;
      if (progress >= FROST.shatterAt) {
        enter(s, reduced ? "thawed" : "shatter");
        if (reduced) { s.frost = 0; s.shatter = 1; s.timeScale = 1; }
      }
      break;
    case "shatter": {
      // Le prelude : les dards volent, le monde reste gele, puis tout eclate.
      const pre = FROST.preludeSeconds;
      if (s.t < pre) {
        s.darts = s.t / pre; s.frost = 1; s.shatter = 0; s.timeScale = 0; s.screen = 0;
        break;
      }
      s.darts = 1;
      const k = clamp01((s.t - pre) / FROST.shatterSeconds);
      s.shatter = k;
      // Le givre tombe vite (la coque part au premier instant), le reste fond.
      s.frost = 1 - smoothstep(0, 0.35, k);
      s.timeScale = smoothstep(0.1, 0.6, k);
      s.screen = 0;
      if (k >= 1) { enter(s, "thawed"); s.frost = 0; s.shatter = 1; s.timeScale = 1; }
      break;
    }
    case "thawed":
      s.frost = 0; s.shatter = 1; s.darts = 0; s.screen = 0; s.timeScale = 1;
      if (progress <= FROST.refreezeAt) {
        enter(s, reduced ? "frozen" : "refreeze");
        if (reduced) { s.frost = 1; s.shatter = 0; s.timeScale = 0; }
      }
      break;
    case "refreeze": {
      const k = clamp01(s.t / FROST.refreezeSeconds);
      // L'ecran givre (0..0.35), se tient (0.35..0.6), se degage (0.6..1) ;
      // derriere, le monde regele pendant que l'ecran est couvert.
      s.screen = smoothstep(0, 0.35, k) * (1 - smoothstep(0.6, 1, k));
      s.frost = smoothstep(0.2, 0.6, k);
      s.shatter = 1 - smoothstep(0.2, 0.6, k);
      s.timeScale = 0;
      s.darts = 0;
      if (k >= 1) { enter(s, "frozen"); s.frost = 1; s.shatter = 0; s.screen = 0; }
      break;
    }
  }
  return s;
}
