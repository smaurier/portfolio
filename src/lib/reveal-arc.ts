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

// Lumière d'ambiance : tamisée en pénombre (silhouette visible, pas de noir
// total — vérifié par lecture de pixels : en dessous de ~0.3 le matériau du
// cerf tombe à (0,0,0) pur, "mystérieux" devenait juste invisible), monte
// progressivement jusqu'au climax du face-à-face, puis reste au plafond
// pour les chemins révélés (pas de redescente — la révélation ne s'éteint
// pas).
export function getAmbientIntensity(progress: number): number {
  return lerpWithinRange(progress, PHASE_START.penombre, PHASE_START["chemins-reveles"], 0.35, 0.85);
}

// Lumière directionnelle (le "regard" qui se pose sur le cerf) : monte plus
// tard et plus vite que l'ambiante, pour que le climax du face-à-face soit
// bien celui qui porte l'intensité dramatique.
export function getDirectionalIntensity(progress: number): number {
  return lerpWithinRange(progress, PHASE_START.conscience, PHASE_START["face-a-face"], 0.5, 1.8);
}

// Le cerf est tête basse (Idle_Headlow, inconscient de la présence) tant
// qu'on est en pénombre, puis relève la tête (Idle) dès qu'il "remarque" le
// visiteur — reste sur ce clip jusqu'à la fin, pas de retour en arrière.
export function getIdleClipName(progress: number): "Idle_Headlow" | "Idle" {
  return getRevealPhase(progress) === "penombre" ? "Idle_Headlow" : "Idle";
}

// Emphase de la nav ("chemins révélés") : 0 avant le dernier quart, monte à
// 1 sur ce dernier quart. Sert de simple variable CSS, pas de mécanique de
// verrouillage — la nav reste cliquable dès le chargement (garde-fou déjà
// posé dans le Codex : ne jamais faire dépendre l'accès aux pages du scroll).
export function getNavEmphasis(progress: number): number {
  return lerpWithinRange(progress, PHASE_START["chemins-reveles"], 1, 0, 1);
}
