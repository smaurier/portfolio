import type { RimSpec } from "./xolotl-rim";

/**
 * LA CAMBRURE DE XOLOTL (13/09, retour Sylvain : « Xolotl est encore trop
 * rigide, il devrait se cambrer legerement au moment d'entrer et sortir du
 * bassin »).
 *
 * Jusqu'ici, le corps du chien n'avait qu'une ASSIETTE : un bloc rigide
 * dont le tangage se deduisait de ses quatre appuis (lib/stance-slew). Un
 * chien qui descend dans l'eau ARRONDIT le dos et rentre l'arriere-main ;
 * un chien qui remonte sur la pierre TEND le dos et pousse. C'est un
 * mouvement de colonne, pas d'assiette : il se repartit sur les cinq os du
 * dos, par-dessus la pose du cycle de marche.
 *
 * Pur et teste ; le composant ne fait que lire.
 */

/** Largeur (en unites monde) de part et d'autre de la pierre ou la
 * cambrure existe. Au-dela, le dos reprend la pose du cycle de marche. */
export const CAMBRURE_BANDE = 0.55;

/** Angle total de la cambrure, reparti sur la chaine (radians). Petit par
 * decision : Sylvain a demande « legerement », et le dos d'un quadrupede
 * ne plie pas comme un cou. */
export const CAMBRURE_MAX = 0.2;

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Distance a la pierre : nulle dessus, positive de part et d'autre. */
export function distanceALaPierre(radius: number, rim: RimSpec): number {
  if (radius < rim.inner) return rim.inner - radius;
  if (radius > rim.outer) return radius - rim.outer;
  return 0;
}

/**
 * La cambrure a l'instant present, dans [-1, 1].
 *  - |valeur| vaut 1 sur la pierre et retombe a 0 a `CAMBRURE_BANDE`.
 *  - le SIGNE vient du sens de marche : negatif quand le chien descend
 *    vers l'eau (le dos s'arrondit), positif quand il en sort (le dos se
 *    tend). A l'arret, rien.
 * `vitesseRadiale` est la variation du rayon par seconde : negative quand
 * il va vers le centre du bassin.
 */
export function cambrure(radius: number, vitesseRadiale: number, rim: RimSpec): number {
  const proche = 1 - smoothstep(0, CAMBRURE_BANDE, distanceALaPierre(radius, rim));
  if (proche <= 0) return 0;
  // Le sens, sature : au-dela de 10 cm par seconde, c'est franc.
  const sens = Math.max(-1, Math.min(1, vitesseRadiale / 0.1));
  return proche * sens;
}

/**
 * Repartition de l'angle sur la chaine du dos, de la croupe aux epaules.
 * Les poids montent vers l'avant : c'est le garrot qui plonge et se
 * releve, la croupe suit. Somme des poids = 1, donc la somme des angles
 * rendus vaut exactement l'angle demande.
 */
export function repartirCambrure(angle: number, nombreDOs: number): number[] {
  if (nombreDOs <= 0) return [];
  const poids: number[] = [];
  let total = 0;
  for (let i = 0; i < nombreDOs; i++) {
    const w = 1 + i; // 1, 2, 3... de la croupe vers les epaules
    poids.push(w);
    total += w;
  }
  return poids.map((w) => (angle * w) / total);
}

/** L'angle total a appliquer, cambrure comprise. */
export function angleCambrure(valeur: number): number {
  return valeur * CAMBRURE_MAX;
}
