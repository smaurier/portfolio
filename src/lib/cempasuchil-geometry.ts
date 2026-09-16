/**
 * La cempasuchil modelisee (04/09, retour Sylvain : "on ne les identifie
 * pas du tout comme telles", puis "va pour le modele que tu controles").
 * Refaite le 16/09 : "je ne les trouve pas realistes".
 *
 * Tagetes erecta, la fleur des morts : un capitule DOUBLE, une boule dense
 * de centaines de ligules, orange a coeur plus sombre, portee par un calice
 * vert court.
 *
 * CE QUI N'ALLAIT PAS, vu au banc d'essai (une seule fleur, gros plan, fond
 * neutre, eclairage de studio : `.scratch/fleur`). La version d'avant se
 * lisait comme un TAS DE PLAQUES ORANGE, pas comme une fleur, pour trois
 * raisons de fond :
 *
 *  1. le ligule etait un ruban PLAT dont la largeur etait horizontale, donc
 *     les petales s'empilaient comme des tuiles au lieu de rayonner ;
 *  2. toutes les normales valaient la direction d'INSERTION du petale, pas
 *     celle de sa surface : l'eclairage etait donc uniforme sur toute une
 *     couche, et tout le relief disparaissait ;
 *  3. l'ondulation des bords etait une sinusoide appliquee a une bande de
 *     deux sommets, ce qui produisait des pointes triangulaires la ou un
 *     ligule a un bout ARRONDI.
 *
 * CE QUI FAIT LA FLEUR, et donc ce que fait ce fichier :
 *
 *  - **La gouttiere.** Un ligule de tagete n'est pas une lamelle plate : il
 *    est plie en canal sur sa longueur, creux vers le haut. C'est ce pli qui
 *    accroche la lumiere en une arete claire et laisse une ombre dans le
 *    creux, et c'est de la repetition de cette arete que nait la densite
 *    froissee du pompon. Trois sommets par rangee (bord, fond, bord) au lieu
 *    de deux, et le creux se referme a la base, s'ouvre vers le bout.
 *  - **Des normales de SURFACE**, calculees par differences finies sur la
 *    parametrisation elle-meme, donc justes partout, y compris dans le pli.
 *  - **Un bout arrondi** : la demi-largeur monte vite, tient, puis se rabat
 *    en quart de cercle sur un peu plus du tiers de la largeur. Elle ne se
 *    ferme PAS a zero : le dernier segment couvre un tiers de la longueur,
 *    et un ligule finissait alors en fer de lance.
 *  - **Un coeur sombre MAIS ORANGE** : la couleur suit la distance au centre
 *    de la boule, pas seulement la longueur du petale. C'est une occlusion
 *    cuite dans les sommets, la seule que puisse porter une geometrie
 *    instanciee sans texture. Poussee trop loin (un brun presque noir), elle
 *    faisait lire le coeur comme un trou : un capitule est dense, sa lumiere
 *    baisse, sa couleur ne change pas.
 *  - **Des ligules etroits et nombreux** : la largeur passe de 0,42 a 0,145
 *    rayon, et le compte de 96 a 150. Un pompon, ce sont des centaines de
 *    lanieres, pas des dizaines de palmes.
 *  - **Une BOULE, pas un ovoide.** Chaque ligule part du centre et fait
 *    presque la meme longueur : tous les bouts atterrissent donc sur une
 *    meme sphere. Une version intermediaire rabattait fortement les ligules
 *    externes, qui tombaient a la verticale et faisaient une jupe sous le
 *    calice.
 *  - **Un receptacle** : une petite boule sombre au coeur. Sans elle, le
 *    moindre interstice entre deux ligules laissait voir le fond de la
 *    scene, ce qui se lisait comme un trou au milieu de la fleur.
 *
 * Deterministe par graine : testable, et la graine casse la repetition.
 */

import { BufferGeometry, Color, Float32BufferAttribute } from "three";

export type CempasuchilSpec = {
  /** Nombre de ligules de la boule. */
  petals: number;
  /** Rayon de la boule (unites monde). */
  radius: number;
  /** Segments le long d'un ligule. */
  segments: number;
  /** Hauteur du calice sous la boule. */
  calyx: number;
};

export const CEMPASUCHIL_SPEC: CempasuchilSpec = {
  petals: 150,
  // 0.055 -> 0.075 (04/09) : a la distance de la camera, en dessous la
  // boule se lisait comme un bouton, pas comme une fleur.
  radius: 0.075,
  segments: 3,
  calyx: 0.02,
};

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
/**
 * Le compte de ligules pour lequel la largeur a ete reglee.
 *
 * Le telephone en pose moins (voir scene-controls.cempasuchilPetals), et
 * une boule a trous n'est plus un pompon : on ELARGIT alors les ligules dans
 * la meme proportion, en racine carree puisque c'est une surface qu'il faut
 * couvrir. La fleur allegee garde donc sa densite, elle n'a que des lanieres
 * plus larges, ce qui ne se voit pas a la taille ou elle est rendue.
 */
const LIGULES_REFERENCE = 150;
/** Le fond du capitule : sombre, mais ORANGE. Une premiere version le
 *  poussait a #5f2200, un brun presque noir, et le coeur de la fleur se
 *  lisait comme un trou. Un capitule de tagete est dense, pas creux : sa
 *  lumiere baisse, sa couleur ne change pas. */
const ORANGE_COEUR = new Color("#8f3903");
/** Le corps du ligule. */
const ORANGE_CORPS = new Color("#d44f07");
/** Le bout, la ou le soleil tape. */
const ORANGE_BOUT = new Color("#ff9d2b");
const CALYX_GREEN = new Color("#3f6b2a");

/** Le calice : un tronc de cone a dix pans. */
export const CALYX_SIDES = 10;
/** Le receptacle : une petite boule, en meridiens et paralleles. */
export const RECEPTACLE_MERIDIENS = 8;
export const RECEPTACLE_PARALLELES = 5;

type V3 = [number, number, number];

const soustraire = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const ajouter = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const fois = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const produitVectoriel = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const longueur = (a: V3): number => Math.hypot(a[0], a[1], a[2]);
const normaliser = (a: V3): V3 => {
  const l = longueur(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const produitScalaire = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const borner01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
const adoucir = (x: number): number => x * x * (3 - 2 * x);

function hash(seed: number, i: number, k: number): number {
  const v = Math.sin(seed * 91.7 + i * 12.9898 + k * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

/**
 * La demi-largeur du ligule le long de sa longueur.
 *
 * Elle monte vite (le ligule s'elargit des sa sortie du capitule), tient sur
 * tout le corps, puis se ferme en DEMI-CERCLE sur les quinze derniers pour
 * cent : c'est ce qui donne un bout arrondi et non une pointe.
 */
export function demiLargeurLigule(u: number): number {
  const montee = adoucir(borner01(u / 0.22));
  // Le bout ne se ferme PAS sur une pointe : il se rabat sur un peu plus du
  // tiers de la largeur, en quart de cercle. Une premiere version le fermait
  // a zero, et comme le dernier segment couvre un quart de la longueur, le
  // ligule finissait en fer de lance.
  const bout = u <= 0.78 ? 1 : 0.42 + 0.58 * Math.sqrt(Math.max(0, 1 - ((u - 0.78) / 0.22) ** 2));
  return montee * bout;
}

/** Un ligule : sa parametrisation, de quoi en tirer points et normales. */
type Ligule = {
  point: (u: number, v: number) => V3;
  normale: (u: number, v: number) => V3;
  teinte: number;
};

function construireLigule(i: number, seed: number, spec: CempasuchilSpec): Ligule {
  // t : 0 au coeur dresse, 1 au bord rabattu.
  const t = (i + 0.5) / spec.petals;
  // La calotte descend un peu sous l'equateur (0,62 pi ~ 112 deg). A 0,72 pi
  // les ligules externes s'inseraient bien plus bas, et comme ils sont aussi
  // les plus longs, la fleur devenait un OVOIDE HIRSUTE dont la jupe pendait
  // sous le calice. Un capitule de tagete est une boule, a peine plus large
  // que haute.
  const polaire = Math.pow(t, 0.8) * Math.PI * 0.62;
  const azimut = i * GOLDEN_ANGLE + (hash(seed, i, 1) - 0.5) * 0.5;
  const radial: V3 = [
    Math.sin(polaire) * Math.cos(azimut),
    Math.cos(polaire),
    Math.sin(polaire) * Math.sin(azimut),
  ];
  // LES LIGULES PARTENT DU CENTRE. C'est la clef de la boule : si chacun
  // suit sa propre radiale, tous les bouts atterrissent sur une meme sphere.
  // Les internes se redressent un peu, les externes suivent la radiale sans
  // plus. Une version precedente rabattait fortement les externes
  // (0,5 - 0,85 t) : ils tombaient a la verticale et faisaient une jupe.
  const redressement = 0.26 * (1 - t);
  const avant = normaliser([radial[0], radial[1] + redressement, radial[2]]);
  // Au POLE, `avant` est vertical et le produit vectoriel avec la verticale
  // s'effondre : le repere devenait arbitraire, et les ligules du sommet
  // partaient dans tous les sens. On retombe alors sur la tangente de
  // l'azimut, qui reste definie partout.
  let cote = produitVectoriel([0, 1, 0], avant);
  if (longueur(cote) < 1e-3) cote = [-Math.sin(azimut), 0, Math.cos(azimut)];
  cote = normaliser(cote);
  const haut = normaliser(produitVectoriel(avant, cote));

  // Longueur presque constante : c'est elle qui pose les bouts sur la
  // sphere. Le leger surcroit des externes suffit a ouvrir la couronne.
  const L = spec.radius * (0.62 + 0.2 * t) * (0.88 + 0.24 * hash(seed, i, 2));
  // 0,19 -> 0,145 rayon : a 0,19 les ligules se chevauchaient comme les
  // ecailles d'une pomme de pin. Un pompon, ce sont des LANIERES.
  const couverture = Math.sqrt(LIGULES_REFERENCE / Math.max(1, spec.petals));
  const W = spec.radius * 0.145 * couverture * (0.82 + 0.36 * hash(seed, i, 3));
  // Le ligule se recourbe doucement sur sa longueur.
  const courbe = 0.14 + 0.26 * t;
  // La profondeur de la gouttiere, propre a chaque ligule.
  const pli = 0.9 * (0.78 + 0.44 * hash(seed, i, 5));
  const racine: V3 = fois(radial, spec.radius * 0.34);
  // LES LIGULES INTERNES SE REFERMENT SUR LE POLE. Sans ce terme, ceux du
  // sommet montaient tout droit et laissaient voir le fond entre eux : un
  // capitule double n'a pas de trou au milieu, ses ligules internes
  // s'arquent par-dessus le centre.
  const versAxe: V3 = [-Math.cos(azimut), 0, -Math.sin(azimut)];
  const rentrant = 0.42 * Math.pow(1 - t, 2.2);

  const ligneMediane = (u: number): V3 =>
    ajouter(
      ajouter(ajouter(racine, fois(avant, L * u)), fois(haut, -courbe * L * u * u)),
      fois(versAxe, rentrant * L * u * u),
    );

  const point = (u: number, v: number): V3 => {
    const w = W * demiLargeurLigule(u);
    // Le creux se referme a la base et s'ouvre vers le bout : un ligule
    // sort du capitule roule, et s'epanouit.
    const creux = pli * w * v * v * (1 - 0.55 * u);
    return ajouter(ajouter(ligneMediane(u), fois(cote, v * w)), fois(haut, creux));
  };

  const EPS = 1e-3;
  const normale = (u: number, v: number): V3 => {
    const long = soustraire(point(Math.min(1, u + EPS), v), point(Math.max(0, u - EPS), v));
    const travers = soustraire(point(u, Math.min(1, v + EPS)), point(u, Math.max(-1, v - EPS)));
    let n = produitVectoriel(long, travers);
    if (longueur(n) < 1e-9) n = haut;
    // On l'oriente vers l'exterieur de la boule : les deux faces sont
    // rendues, mais une normale retournee eteint le ligule.
    if (produitScalaire(n, point(u, v)) < 0) n = fois(n, -1);
    return normaliser(n);
  };

  return { point, normale, teinte: hash(seed, i, 4) };
}

/**
 * Geometrie fusionnee d'une cempasuchil : boule de ligules + calice, pied du
 * calice a y = 0, axe Y vers le haut, centree en xz. Deterministe.
 */
export function makeCempasuchilGeometry(seed: number, spec: CempasuchilSpec = CEMPASUCHIL_SPEC): BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const tmp = new Color();

  const ligules = Array.from({ length: spec.petals }, (_, i) => construireLigule(i, seed, spec));

  // La hauteur du centre se DEDUIT de la boule au lieu d'etre devinee : on
  // cherche le point le plus bas des ligules, et on pose la boule assez haut
  // pour qu'aucun ne passe sous le calice. Les petales externes se rabattent,
  // donc cette marge n'est pas la meme selon les reglages.
  let plusBas = 0;
  for (const l of ligules) {
    for (let s = 0; s <= spec.segments; s++) {
      for (const v of [-1, 0, 1]) {
        const y = l.point(s / spec.segments, v)[1];
        if (y < plusBas) plusBas = y;
      }
    }
  }
  // La boule mord legerement sur le calice : une fleur n'est pas posee sur
  // son pedoncule, elle en sort.
  const centreY = spec.calyx * 0.55 - plusBas;
  const centre: V3 = [0, centreY, 0];

  const couleur = (p: V3, u: number, teinte: number) => {
    // L'occlusion cuite : ce qui est ENFOUI est sombre, ce qui depasse est
    // orange. La distance au centre de la boule le dit mieux que la longueur
    // du petale, parce qu'un ligule interne est court mais tout aussi
    // expose au sommet.
    const expose = borner01((longueur(p) - spec.radius * 0.2) / (spec.radius * 1.15));
    const e = adoucir(expose);
    tmp.copy(ORANGE_COEUR).lerp(ORANGE_CORPS, e).lerp(ORANGE_BOUT, borner01(u * 1.15) * e * 0.85);
    tmp.offsetHSL((teinte - 0.5) * 0.015, 0, (teinte - 0.5) * 0.06);
    return tmp;
  };

  const poser = (l: Ligule, u: number, v: number) => {
    const p = l.point(u, v);
    const n = l.normale(u, v);
    positions.push(p[0], p[1] + centreY, p[2]);
    normals.push(n[0], n[1], n[2]);
    const c = couleur(p, u, l.teinte);
    colors.push(c.r, c.g, c.b);
  };

  for (const l of ligules) {
    for (let s = 0; s < spec.segments; s++) {
      const u0 = s / spec.segments;
      const u1 = (s + 1) / spec.segments;
      // Deux quads par segment : le versant gauche et le versant droit de
      // la gouttiere, separes par son fond (v = 0).
      for (const [va, vb] of [
        [-1, 0],
        [0, 1],
      ] as const) {
        poser(l, u0, va);
        poser(l, u0, vb);
        poser(l, u1, vb);
        poser(l, u0, va);
        poser(l, u1, vb);
        poser(l, u1, va);
      }
    }
  }

  // ---- LE RECEPTACLE : une petite boule sombre au coeur du capitule.
  //
  // Elle ne s'invente pas : c'est le plateau ou s'inserent les centaines de
  // fleurons, et il est plein. Sans elle, le moindre interstice entre deux
  // ligules laissait voir le FOND DE LA SCENE, ce qui se lisait comme un
  // trou au milieu de la fleur. Avec elle, un interstice montre de la chair
  // de fleur. Une quarantaine de triangles pour ne plus jamais voir a
  // travers.
  const recept = spec.radius * 0.42;
  const surRecept = (ia: number, ip: number): V3 => {
    const a = (ia / RECEPTACLE_MERIDIENS) * Math.PI * 2;
    const p = (ip / RECEPTACLE_PARALLELES) * Math.PI;
    return [Math.sin(p) * Math.cos(a) * recept, centreY + Math.cos(p) * recept, Math.sin(p) * Math.sin(a) * recept];
  };
  const COEUR_SOMBRE = ORANGE_COEUR.clone().multiplyScalar(0.62);
  for (let ip = 0; ip < RECEPTACLE_PARALLELES; ip++) {
    for (let ia = 0; ia < RECEPTACLE_MERIDIENS; ia++) {
      const a0 = surRecept(ia, ip);
      const a1 = surRecept(ia + 1, ip);
      const b1 = surRecept(ia + 1, ip + 1);
      const b0 = surRecept(ia, ip + 1);
      for (const v of [a0, a1, b1, a0, b1, b0]) {
        positions.push(v[0], v[1], v[2]);
        const n = normaliser([v[0], v[1] - centreY, v[2]]);
        normals.push(n[0], n[1], n[2]);
        colors.push(COEUR_SOMBRE.r, COEUR_SOMBRE.g, COEUR_SOMBRE.b);
      }
    }
  }

  // ---- Calice : petit tronc de cone vert sous la boule.
  // Resserre (16/09) : a 0,42 et 0,3 rayon, le calice depassait des ligules
  // du bas et se lisait comme un POT DE FLEUR sous la boule. Un calice de
  // tagete est un etui etroit, qu'on devine entre les ligules.
  const rTop = spec.radius * 0.3;
  const rBottom = spec.radius * 0.2;
  for (let s = 0; s < CALYX_SIDES; s++) {
    const a0 = (s / CALYX_SIDES) * Math.PI * 2;
    const a1 = ((s + 1) / CALYX_SIDES) * Math.PI * 2;
    const anneau = (a: number, r: number, y: number): V3 => [Math.cos(a) * r, y, Math.sin(a) * r];
    const p0 = anneau(a0, rBottom, 0);
    const p1 = anneau(a1, rBottom, 0);
    const p2 = anneau(a1, rTop, spec.calyx);
    const p3 = anneau(a0, rTop, spec.calyx);
    for (const v of [p0, p1, p2, p0, p2, p3]) {
      positions.push(v[0], v[1], v[2]);
      // Normale VRAIMENT unitaire (16/09) : l'ancienne poussait
      // `[x/n, 0.2, z/n]`, dont la longueur vaut 1,0198 et non 1. three
      // normalise au fragment, donc ca ne se voyait pas, mais une normale
      // qui ment est une normale qu'on ne peut plus tester.
      const n = normaliser([v[0], Math.hypot(v[0], v[2]) * 0.2, v[2]]);
      normals.push(n[0], n[1], n[2]);
      colors.push(CALYX_GREEN.r, CALYX_GREEN.g, CALYX_GREEN.b);
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new Float32BufferAttribute(normals, 3));
  geo.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geo.computeBoundingSphere();
  return geo;
}
