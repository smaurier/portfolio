// Arc de reveal en 4 temps de l'Accueil Nahual (palier 1, cf memory
// project-nahual-da, section "Suite session 2") : pénombre → prise de
// conscience → face-à-face → chemins révélés. Fonctions pures, découplées du
// rendu (même principe que camera-path.ts) — pilotées par la même
// progression de scroll que la caméra, pas une timeline séparée.

import { clampProgress } from "./camera-path";

export type RevealPhase = "penombre" | "conscience" | "face-a-face" | "chemins-reveles";

// Bornes de progression pour chaque temps — un quart de scroll chacun.
const PHASE_START = {
  penombre: 0,
  conscience: 0.25,
  "face-a-face": 0.5,
  "chemins-reveles": 0.75,
} as const;

export function getRevealPhase(progress: number): RevealPhase {
  const p = clampProgress(progress);
  if (p < PHASE_START.conscience) return "penombre";
  if (p < PHASE_START["face-a-face"]) return "conscience";
  if (p < PHASE_START["chemins-reveles"]) return "face-a-face";
  return "chemins-reveles";
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/** Interpole entre from/to sur la portion [start, end] de la progression
 * totale, saturé avant/après (0 avant start, 1 après end). */
function lerpWithinRange(progress: number, start: number, end: number, from: number, to: number): number {
  const p = clampProgress(progress);
  if (p <= start) return from;
  if (p >= end) return to;
  return lerp(from, to, (p - start) / (end - start));
}

/** Variante easing de lerpWithinRange (Hermite/smoothstep : dérivée nulle
 * aux deux bornes) — une seule courbe continue sur toute la plage plutôt
 * que plat→rampe→plat, qui se lisait comme deux paliers nets plutôt qu'une
 * montée fluide (retour direct de Sylvain en regardant /lab). */
function easeWithinRange(progress: number, start: number, end: number, from: number, to: number): number {
  const p = clampProgress(progress);
  const t = end > start ? Math.min(1, Math.max(0, (p - start) / (end - start))) : p >= end ? 1 : 0;
  const smoothed = t * t * (3 - 2 * t);
  return lerp(from, to, smoothed);
}

// Lumière d'ambiance : tamisée en pénombre (silhouette visible, pas de noir
// total — vérifié par lecture de pixels : en dessous de ~0.3 le matériau du
// cerf tombe à (0,0,0) pur, "mystérieux" devenait juste invisible), monte
// jusqu'au climax du face-à-face, puis reste au plafond pour les chemins
// révélés (pas de redescente — la révélation ne s'éteint pas).
export function getAmbientIntensity(progress: number): number {
  return easeWithinRange(progress, PHASE_START.penombre, PHASE_START["chemins-reveles"], 0.35, 0.85);
}

// Lumière directionnelle (le "regard" qui se pose sur le cerf) : même plage
// que l'ambiante (pas de plat→rampe→plat séparé, qui créait deux paliers
// visuellement nets), mais l'easing concentre naturellement le plus gros du
// changement au milieu — le climax du face-à-face reste celui qui porte le
// plus l'intensité dramatique, sans discontinuité.
export function getDirectionalIntensity(progress: number): number {
  return easeWithinRange(progress, PHASE_START.penombre, PHASE_START["chemins-reveles"], 0.5, 1.8);
}

// Séquence d'entrée du cerf (18/08, retour de Sylvain : "on pourrait le
// faire marcher, avancer avec l'idle, ensuite on le verrait manger, puis
// un bon idle [Idle_2] momentanément, puis la dernière phase où il a juste
// la tête relevée") — Walk (avance, cf getWalkOffsetZ) -> Eating (se pose,
// broute) -> Idle_2 (passage bref) -> Idle (tête relevée, état final).
// Toute la séquence tient avant que `noticed` ne devienne vrai (scroll ou
// souris, cf StagModel/CursorRevealScene) : un déclenchement rapide bascule
// direct sur Idle quel que soit l'endroit de la séquence — surprend le
// cerf en pleine marche ou en train de manger, cohérent avec un sursaut.
// Jamais de retour en arrière une fois `noticed` vrai.
const WALK_END = 0.08;
const EATING_END = 0.16;

export function getIdleClipName(
  progress: number,
  noticed: boolean,
): "Walk" | "Eating" | "Idle_2" | "Idle" {
  if (noticed) return "Idle";
  const p = clampProgress(progress);
  if (p < WALK_END) return "Walk";
  if (p < EATING_END) return "Eating";
  return "Idle_2";
}

// Distance parcourue par le cerf pendant "Walk" — le clip lui-même n'a pas
// de root motion (vérifié dans le rig : le nœud racine ne bouge quasiment
// pas d'un keyframe à l'autre, cycle sur place), l'avancée réelle est donc
// pilotée ici plutôt que par l'animation. Le long de +Z (vers la position
// de départ de la caméra, cf camera-path.ts startRadius) : le cerf marche
// depuis un peu plus loin/en retrait, puis s'arrête pile à sa position de
// repos habituelle (0,0,0) à WALK_END — jamais de retour en arrière.
const WALK_START_OFFSET_Z = 1.1;

export function getWalkOffsetZ(progress: number): number {
  return lerpWithinRange(progress, 0, WALK_END, WALK_START_OFFSET_Z, 0);
}

// Emphase de la nav ("chemins révélés") : 0 avant le dernier quart, monte à
// 1 sur ce dernier quart. Sert de simple variable CSS, pas de mécanique de
// verrouillage — la nav reste cliquable dès le chargement (garde-fou déjà
// posé dans le Codex : ne jamais faire dépendre l'accès aux pages du scroll).
export function getNavEmphasis(progress: number): number {
  return lerpWithinRange(progress, PHASE_START["chemins-reveles"], 1, 0, 1);
}

// Croissance du maïs et des lianes (palier 3, cf memory project-nahual-da) :
// émerge du sol tôt — avec la prise de conscience, la vie s'éveille en même
// temps que le cerf — et atteint sa taille pleine avant le climax du
// face-à-face, pour ne jamais distraire pendant ce beat-là.
//
// `stagger` (0..1, retour de Sylvain le 18/08 : "tout ne devrait pas
// pousser en même temps") décale le DÉPART de la pousse à l'intérieur de
// cette même fenêtre, jamais la fin — chaque plante garde l'invariant
// "finie avant le climax", seul le moment où elle démarre varie. Une plante
// à stagger=1 a une fenêtre de pousse plus courte (elle démarre plus tard
// mais doit quand même finir à temps), pas une pousse plus lente qui
// déborderait sur le face-à-face.
export function getMilpaGrowth(progress: number, stagger: number = 0): number {
  const envelopeStart = PHASE_START.penombre;
  const envelopeEnd = PHASE_START["face-a-face"];
  const maxShift = (envelopeEnd - envelopeStart) * 0.35;
  const start = envelopeStart + clampProgress(stagger) * maxShift;
  return easeWithinRange(progress, start, envelopeEnd, 0, 1);
}
