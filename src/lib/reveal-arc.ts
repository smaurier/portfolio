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

function componentToHex(value: number): string {
  return Math.round(Math.min(255, Math.max(0, value))).toString(16).padStart(2, "0");
}

// Jade assombri à 15% (--jade-bg #00a86b -> rgb(0,168,107), 15% de ça)
// plutôt que le jade vif : un brouillard plein jade écraserait la pénombre
// nocturne que tout l'arc construit (retour de Sylvain le 20/08 : penser
// l'intégration du jade plutôt que le plaquer en aplat, cf memory
// project-nahual-da — étude concurrentielle, piste "lueur d'ambiance").
const FOG_JADE_TINT = { r: 0, g: 25, b: 16 };

// Teinte du brouillard : noir pur en pénombre (cf fog args par défaut dans
// RevealLighting), dérive vers un noir-jade profond sur la même fenêtre que
// les intensités lumineuses ci-dessus — le jade devient un signal narratif
// ("le monde se teinte de la couleur de la marque en s'éveillant") plutôt
// qu'une couleur de fond plaquée. Jamais de retour en arrière, même logique
// que le reste de l'arc.
export function getFogColor(progress: number): string {
  const t = easeWithinRange(progress, PHASE_START.penombre, PHASE_START["chemins-reveles"], 0, 1);
  const r = lerp(0, FOG_JADE_TINT.r, t);
  const g = lerp(0, FOG_JADE_TINT.g, t);
  const b = lerp(0, FOG_JADE_TINT.b, t);
  return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;
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
//
// WALK_END 0.08 -> 0.18 (retour Sylvain : "la marche ne fonctionne pas, le
// cerf glisse... aussi la marche est trop courte") — 8% du scroll total
// (300vh, cf stag-scene.module.css) ne laissait pas le temps à un cycle de
// foulée complet de se jouer avant le fondu vers Eating (crossfade 0.4s) :
// à vitesse de scroll normale, la fenêtre passait en moins d'une seconde,
// le poids du clip Walk n'avait jamais le temps de monter à 1 avant de
// redescendre — d'où l'impression de glissement plutôt que de vraie
// marche. Fenêtre plus que doublée pour laisser jouer plusieurs foulées.
const WALK_END = 0.18;
const EATING_END = 0.22;

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
// pilotée ici plutôt que par l'animation.
//
// -2.3 (pas +2.3) : bug de signe trouvé le 20/08 (Sylvain, en vérifiant en
// direct avec une valeur exagérée pour le débugger : "je vois qu'il bouge
// maintenant, même s'il va en arrière"). La caméra démarre à +Z (radius sur
// +Z, cf camera-path.ts startRadius) — un Z de cerf plus GRAND le rapproche
// de la caméra, plus PETIT (ou négatif) l'en éloigne. +2.3 faisait donc
// partir le cerf plus PRÈS de la caméra qu'à son repos (Z=0), puis reculer
// vers Z=0 en "marchant" — l'inverse de l'intention ("le cerf marche depuis
// un peu plus loin/en retrait, puis s'arrête pile à sa position de repos").
// -2.3 le fait démarrer plus LOIN (en retrait) et se rapprocher en marchant.
// 1.1 -> 2.3 en magnitude (même retour que WALK_END ci-dessus) : la fenêtre
// de marche a plus que doublé, la distance parcourue suit pour rester
// cohérente — sinon le cerf aurait mis longtemps à parcourir une toute
// petite distance.
const WALK_START_OFFSET_Z = -2.3;

export function getWalkOffsetZ(progress: number): number {
  return lerpWithinRange(progress, 0, WALK_END, WALK_START_OFFSET_Z, 0);
}

// Nombre de foulées jouées sur toute la fenêtre de marche — assez pour se
// lire comme une vraie marche (pas une seule demi-enjambée étirée), pas
// trop pour rester lisible dans WALK_END.
const WALK_STRIDE_COUNT = 3;

/**
 * Position dans le cycle de marche (0..1, boucle), en fonction du scroll —
 * pas du temps réel. Retour de Sylvain le 18/08 : "le cerf ne doit marcher
 * qu'au scroll, sinon position de repos, même si on est dans le
 * pourcentage donné" — jouer le clip Walk normalement (mixer en temps
 * réel) désynchronisait les jambes de l'avancée du corps (scroll-driven,
 * cf getWalkOffsetZ) : à scroll rapide, le corps atteignait sa position
 * finale bien avant que les jambes n'aient eu le temps d'animer, lu comme
 * un glissement plutôt qu'une marche. StagModel "scrube" le clip Walk (fixe
 * `action.time` chaque frame plutôt que de le laisser jouer) à partir de
 * cette phase — si le scroll s'arrête, la phase reste figée, le cerf ne
 * continue jamais de marcher tout seul.
 */
export function getWalkCyclePhase(progress: number): number {
  const t = lerpWithinRange(progress, 0, WALK_END, 0, 1);
  return (t * WALK_STRIDE_COUNT) % 1;
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

// Opacité de la couche "préface" superposée à la scène — le texte
// d'accroche (hero) au premier plan, la Piedra del Sol en fond très
// discret (mise à l'échelle par le composant, cf memory
// project-nahual-da : "ce qui existe avant que le cerf n'apparaisse").
// Pleinement visible en tout début de scroll (retour de Sylvain le 19/08 :
// "si rien n'invite au scroll, l'utilisateur va-t-il forcément y penser ?"
// — l'accroche doit donc se lire AVANT tout scroll, pas après), puis
// s'efface sur la fenêtre de "pénombre" — le même rythme que la prise de
// conscience du cerf, pour que l'accroche cède la place plutôt que de
// s'attarder pendant que la scène change de sens.
export function getIntroOpacity(progress: number): number {
  return easeWithinRange(progress, PHASE_START.penombre, PHASE_START.conscience, 1, 0);
}
