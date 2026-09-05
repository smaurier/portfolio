import type { DirectionKey } from "@/app/components/stag-scene/direction-colors";

/**
 * Rig lumiere par direction (01/09, etage 2 du sprint identites de
 * scene, cf Codex Nahual : "lumiere motivee", doctrine 2). Au cinema
 * on ne teinte pas une scene : on la re-eclaire. Chaque heure cosmique
 * a sa source diegetique nommable : l'aube, le zenith, le couchant, la
 * lueur du puits, le foyer.
 *
 * Seul le NORD a un rig non-neutre pour l'instant (pilote du sprint,
 * fiche Mictlampa enrichie le 01/09). Les autres directions recevront
 * le leur quand leur fiche sera enrichie au meme niveau (doctrine 1
 * amendee : lead / contre-chant / tissu par scene) : ne pas remplir
 * ces slots par symetrie, chaque rig doit sortir de sa fiche.
 */
export type LightRig = {
  /** Position de la directionnelle (world units). */
  position: [number, number, number];
  /** Teinte cible de la lumiere : dosee par colorMix, portee telle quelle. */
  color: string;
  /** Multiplicateur applique a l'intensite ambient issue du reveal-arc. */
  ambientScale: number;
  /** Multiplicateur applique a l'intensite directionnelle issue du reveal-arc. */
  directionalScale: number;
  /** Dose de la teinte rig dans la couleur finale (0 = logique historique seule). */
  colorMix: number;
  /** Etat de NUIT du rig (05/09, Sylvain : « la lune qui amenera son ombrage
   * puis au fur et a mesure du scroll c'est le soleil qui se levera ») : en
   * haut de page la source est la lune, basse et froide ; l'arc de
   * revelation l'emmene vers l'etat de jour ci-dessus (rigAtArc). Absent =
   * rig fixe. */
  night?: { position: [number, number, number]; color: string; ambientScale: number; directionalScale: number; colorMix: number };
};

/** Comportement historique exact : directionnelle [4,6,4], pas de
 * teinte rig, intensites reveal-arc inchangees. */
export const NEUTRAL_RIG: LightRig = {
  position: [4, 6, 4],
  color: "#ffffff",
  ambientScale: 1,
  directionalScale: 1,
  colorMix: 0,
};

export const DIRECTION_LIGHT_RIG: Record<DirectionKey, LightRig> = {
  jade: NEUTRAL_RIG,
  dore: NEUTRAL_RIG,
  /** Sud/midi (04/09, fiche Huitzilopochtli, go Sylvain « la page la plus
   * lumineuse du site ») : le ZENITH. Le soleil ne vient d'aucun cote, il
   * tombe d'en haut : directionnelle quasi verticale (un soupcon vers la
   * camera pour que les faces se lisent), couleur de midi a peine chaude,
   * ambiante et directionnelle AU-DESSUS du neutre en fin d'arc. La seule
   * direction qui depasse le neutre : le Nord est son inverse exact. */
  turquoise: {
    position: [0.6, 10, 1.2],
    color: "#ffe6bd",
    // La lune de Coatepec : basse, derriere a gauche, froide ; ses ombres
    // longues balaient la scene quand le soleil monte au zenith.
    night: { position: [-7, 3, -6], color: "#a9bde0", ambientScale: 0.9, directionalScale: 0.85, colorMix: 0.7 },
    // 1.25/1.55 -> 1.12/1.3 (04/09, premiere capture : montagnes cramees
    // en blanc plat) : au-dessus du neutre, mais l'image garde du modele.
    ambientScale: 1.12,
    directionalScale: 1.3,
    colorMix: 0.65,
  },
  cendre: NEUTRAL_RIG,
  /** Nord/minuit : la lueur du puits. Top light froide quasi zenithale
   * (l'ouverture du Mictlan vue depuis l'interieur), contre-jour :
   * ambient tres bas, directionnelle affaiblie et teintee froide
   * (#8a7fb0, palette colorscript Mictlampa valide par Sylvain). */
  obsidienne: {
    position: [0, 8, 0],
    color: "#8a7fb0",
    // 0.4/0.55 -> 0.7/0.8 (02/09, "sous-exposee, on ne voit rien") :
    // toujours sous le neutre, mais on lit la scene.
    ambientScale: 0.7,
    directionalScale: 0.8,
    colorMix: 0.8,
  },
};

export function getLightRig(direction: DirectionKey): LightRig {
  return DIRECTION_LIGHT_RIG[direction];
}

/**
 * ASTRONOMIE du Sud (05/09, Sylvain : « on doit etre coherent avec
 * l'astronomie »). Une seule source de verite pour la lumiere ET les
 * disques dans le ciel (sud-sky-bodies) :
 *  - le SOLEIL se leve a l'EST (+x, la droite en tete de page), monte en
 *    arc jusqu'au ZENITH au climax ;
 *  - la LUNE est a l'OUEST (-x, la gauche), basse, et se COUCHE a mesure
 *    que le soleil monte (elle passe sous l'horizon vers le tiers de l'arc).
 * `t` = position sur l'arc de revelation (0 nuit, 1 midi). Directions
 * unitaires ; les positions de lumiere en derivent (x LIGHT_DISTANCE).
 */
export type Dir3 = { x: number; y: number; z: number };

const LIGHT_DISTANCE = 10;

function normalize(v: Dir3): Dir3 {
  const l = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / l, y: v.y / l, z: v.z / l };
}
function smooth(u: number): number {
  const c = Math.min(1, Math.max(0, u));
  return c * c * (3 - 2 * c);
}

/** Direction du soleil : sous l'horizon a l'est la nuit, il se leve vers
 * t = 0.15, monte en arc et atteint le zenith a t = 1 (un peu vers la
 * camera pour que les faces se lisent). */
/** Azimut de l'est et de l'ouest par rapport au regard de tete de page
 * (la camera regarde -z) : 35 deg a droite / a gauche. Plein est (+x) et
 * plein ouest (-x) sortiraient du cadre (demi-champ ~30 deg) : le lever et
 * le coucher ne se verraient jamais. */
const EAST_AZIMUTH = (35 * Math.PI) / 180;

export function sunDirection(t: number): Dir3 {
  const u = smooth((t - 0.12) / 0.88);
  // Arc est -> zenith : angle d'elevation de -8 deg (sous l'horizon) a 86 deg.
  const elev = (-8 + 94 * u) * (Math.PI / 180);
  const c = Math.cos(elev);
  return normalize({ x: Math.sin(EAST_AZIMUTH) * c, y: Math.sin(elev), z: -Math.cos(EAST_AZIMUTH) * c });
}

/** Direction de la lune : a l'ouest, 16 deg au-dessus de l'horizon la
 * nuit, elle se couche (passe sous l'horizon) entre t = 0.2 et t = 0.55. */
export function moonDirection(t: number): Dir3 {
  const set = smooth((t - 0.2) / 0.35);
  const elev = (14 - 24 * set) * (Math.PI / 180);
  const c = Math.cos(elev);
  return normalize({ x: -Math.sin(EAST_AZIMUTH) * c, y: Math.sin(elev), z: -Math.cos(EAST_AZIMUTH) * c });
}

/** Le soleil est-il leve (au-dessus de l'horizon) a t ? */
export function sunUp(t: number): boolean {
  return sunDirection(t).y > 0;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Le rig au point `floor` (0..1) de l'arc de revelation : de l'etat de
 * nuit (lune) a l'etat de jour. Sans etat de nuit, le rig est rendu tel
 * quel. Lissage smoothstep : la lune s'efface doucement, le soleil monte. */
export function rigAtArc(rig: LightRig, floor: number): LightRig {
  if (!rig.night) return rig;
  const u = Math.min(1, Math.max(0, floor));
  // La source passe de la LUNE au SOLEIL quand celui-ci se leve (t 0.15 ->
  // 0.4) ; sa position suit l'astre (une seule verite : sunDirection /
  // moonDirection), ses reglages (couleur, intensites) se fondent en meme temps.
  const t = smooth((u - 0.15) / 0.25);
  const n = rig.night;
  const [nr, ng, nb] = hexToRgb(n.color);
  const [dr, dg, db] = hexToRgb(rig.color);
  const moon = moonDirection(u);
  const sun = sunDirection(u);
  const dir = normalize({ x: lerp(moon.x, sun.x, t), y: lerp(Math.max(0.08, moon.y), Math.max(0.08, sun.y), t), z: lerp(moon.z, sun.z, t) });
  return {
    position: [dir.x * LIGHT_DISTANCE, dir.y * LIGHT_DISTANCE, dir.z * LIGHT_DISTANCE],
    color: rgbToHex(lerp(nr, dr, t), lerp(ng, dg, t), lerp(nb, db, t)),
    ambientScale: lerp(n.ambientScale, rig.ambientScale, t),
    directionalScale: lerp(n.directionalScale, rig.directionalScale, t),
    colorMix: lerp(n.colorMix, rig.colorMix, t),
  };
}

/** Meme convention que approachFog (direction-fog.ts) : easing
 * exponentiel frame-based, snap sous epsilon pour converger vraiment. */
const SNAP_EPSILON = 0.005;

function approachValue(current: number, target: number, alpha: number): number {
  const next = current + (target - current) * alpha;
  return Math.abs(target - next) < SNAP_EPSILON ? target : next;
}

/**
 * Rapproche le rig courant de la cible. La couleur ne s'interpole pas
 * ici (pas de lerp de string hex) : elle bascule sur la couleur cible
 * et c'est colorMix, lui interpole, qui dose son poids reel dans la
 * couleur finale : transition continue sans parser de hex par frame.
 */
export function approachRig(current: LightRig, target: LightRig, alpha: number): LightRig {
  return {
    position: [
      approachValue(current.position[0], target.position[0], alpha),
      approachValue(current.position[1], target.position[1], alpha),
      approachValue(current.position[2], target.position[2], alpha),
    ],
    color: target.color,
    ambientScale: approachValue(current.ambientScale, target.ambientScale, alpha),
    directionalScale: approachValue(current.directionalScale, target.directionalScale, alpha),
    colorMix: approachValue(current.colorMix, target.colorMix, alpha),
  };
}
