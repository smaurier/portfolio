/**
 * Etat partage du xiuhcoatl (04/09). Le companion ecrit, la passe de
 * post-traitement (xiuhcoatl-heat) lit : la trainee chaude qui deforme
 * l'air derriere lui (Sylvain : « une trainee chaude qui deforme
 * l'atmosphere, comme l'asphalte en ete »). Mutations 60 fps, hors React.
 */

export type HeatPoint = {
  x: number;
  y: number;
  z: number;
  /** Instant d'emission (performance.now(), ms). */
  bornAt: number;
};

export const HEAT_TRAIL_MAX = 16;
/** Duree de vie d'un point de chaleur (ms) : l'air se calme derriere lui. */
export const HEAT_POINT_LIFE_MS = 1400;

export const xiuhcoatlStore = {
  /** Points de chaleur, du plus ancien au plus recent. */
  trail: [] as HeatPoint[],
  /** 0..1 : presence (fondu d'arrivee), 0 = rien a deformer. */
  presence: 0,
  /** 0..1 : SOUFFLE CHAUD du midi au Sud (05/09, Sylvain « j'aime bien le
   * souffle chaud ») : l'air tremble au ras du sol comme sur l'asphalte
   * en ete, sur toute la largeur. Ecrit par SudSky, lu par la passe de
   * chaleur. */
  groundHeat: 0,
};

/** Ajoute un point, borne la file, purge les morts. */
export function pushHeat(x: number, y: number, z: number, now: number): void {
  const t = xiuhcoatlStore.trail;
  t.push({ x, y, z, bornAt: now });
  while (t.length > HEAT_TRAIL_MAX) t.shift();
  while (t.length > 0 && now - t[0].bornAt > HEAT_POINT_LIFE_MS) t.shift();
}
