/**
 * LE ZENITH DU DOME (09/09). Le dome de ciel prend chaque image la couleur
 * du brouillard a l'horizon et tire vers un bleu profond en montant. La
 * regle d'origine dosait ce bleu par la LUMINOSITE de l'horizon, si bien
 * qu'a la nuit le zenith valait exactement l'horizon : dome noir.
 *
 * Au Sud c'est juste, et voulu : la nuit du haut de page est celle des 400
 * etoiles, qui viennent s'y poser. A l'Est, rien ne s'y pose. Mesure du
 * cadre d'arrivee de la page Services, bande 85-180 px : moyenne 12/15/18,
 * un trou noir au-dessus des montagnes gelees. Et l'Est est justement la
 * scene ou l'on arrive AVANT l'aube : un ciel d'avant-jour n'est pas noir,
 * il est indigo, et les montagnes de glace ne se detachent que sur lui.
 *
 * Ce module ne connait pas les couleurs : il ne porte que le MELANGE, pour
 * que la regle soit prouvable sans carte graphique. La preuve qui compte
 * n'est pas qu'un melange melange, c'est que les pages qui n'ont PAS de
 * couleur de nuit rendent exactement ce qu'elles rendaient avant : c'est
 * l'identite algebrique verifiee dans le test.
 */

/** Un triplet lineaire. THREE.Color en est un, ce qui evite toute allocation
 * par image cote scene, et un objet nu suffit au test. */
export type Rgb = { r: number; g: number; b: number };

/** Poids de luminosite perceptuelle, ceux de la regle d'origine. */
export function horizonLuminance(horizon: Rgb): number {
  const lum = horizon.r * 0.3 + horizon.g * 0.59 + horizon.b * 0.11;
  return Number.isFinite(lum) ? lum : 0;
}

/**
 * Part de JOUR au zenith. L'horizon atteint le plein jour bien avant d'etre
 * blanc : au tiers de luminosite, le zenith est deja celui du jour.
 */
export function skyDaylight(horizonLum: number): number {
  if (!Number.isFinite(horizonLum)) return 0;
  return Math.min(1, Math.max(0, horizonLum * 3));
}

/** Combien le zenith du jour tire vers le bleu profond. */
export const ZENITH_PULL = 0.7;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Ecrit la couleur du zenith dans `target`.
 *
 *  - `horizon` : la couleur du brouillard, deja posee a l'horizon ;
 *  - `deep` : le bleu profond du zenith de jour ;
 *  - `night` : la couleur du zenith quand l'horizon est noir, ou `null`
 *    pour garder le comportement d'origine (zenith = horizon la nuit) ;
 *  - `daylight` : la sortie de `skyDaylight`.
 *
 * `target` peut etre `horizon` : la fonction lit tout avant d'ecrire.
 */
export function zenithInto(target: Rgb, horizon: Rgb, deep: Rgb, night: Rgb | null, daylight: number): Rgb {
  const d = Number.isFinite(daylight) ? Math.min(1, Math.max(0, daylight)) : 0;
  const hr = horizon.r, hg = horizon.g, hb = horizon.b;
  // Le zenith de plein jour : l'horizon tire vers le bleu profond.
  const dr = lerp(hr, deep.r, ZENITH_PULL);
  const dg = lerp(hg, deep.g, ZENITH_PULL);
  const db = lerp(hb, deep.b, ZENITH_PULL);
  // Le zenith de nuit : la couleur d'avant-jour s'il y en a une, l'horizon
  // sinon (et dans ce cas le melange se simplifie exactement en la regle
  // d'origine, cf le test d'identite).
  const nr = night ? night.r : hr;
  const ng = night ? night.g : hg;
  const nb = night ? night.b : hb;
  target.r = lerp(nr, dr, d);
  target.g = lerp(ng, dg, d);
  target.b = lerp(nb, db, d);
  return target;
}

/**
 * OU LE DEGRADE ATTEINT SA COULEUR DE ZENITH (09/09), en unites de vDir.y.
 *
 * Poser la bonne couleur ne suffit pas : encore faut-il qu'elle soit dans
 * le cadre. Mesure du 09/09 sur la page Services, colonne de ciel pur du
 * bord gauche : 2/255 avant comme apres avoir mis le zenith en indigo. La
 * raison est geometrique et non colorimetrique -- le regard de l'Est est
 * pique d'environ 9 degres, le champ vertical fait 45 degres, donc la bande
 * de ciel visible tient entre 4 et 14 degres d'elevation, la ou une
 * courbe qui monte jusqu'a 0,85 ne rend que 2 a 19 % de la couleur de
 * zenith. Le zenith geometrique, lui, n'est jamais regarde (il le sera au
 * Centre, dont l'arc vertical est prevu).
 *
 * La nuit, le degrade monte donc beaucoup plus vite, pour que le ciel
 * d'avant-jour occupe la bande REELLEMENT vue ; de jour, la courbe revient
 * exactement a celle d'origine. Sans couleur de nuit, la valeur ne change
 * jamais : les pages sans avant-jour ne peuvent pas etre touchees.
 */
export const ZENITH_SPREAD_DAY = 0.85;
export const ZENITH_SPREAD_NIGHT = 0.3;

export function zenithSpread(hasNightColour: boolean, daylight: number): number {
  if (!hasNightColour) return ZENITH_SPREAD_DAY;
  const d = Number.isFinite(daylight) ? Math.min(1, Math.max(0, daylight)) : 0;
  // Egalite EXACTE en plein jour, et pas a 1e-16 pres : la courbe de jour
  // est censee etre celle d'origine, et une identite documentee se prouve.
  if (d >= 1) return ZENITH_SPREAD_DAY;
  return ZENITH_SPREAD_NIGHT + (ZENITH_SPREAD_DAY - ZENITH_SPREAD_NIGHT) * d;
}
