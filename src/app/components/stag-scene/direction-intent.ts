"use client";

import { useSyncExternalStore } from "react";
import type { DirectionKey } from "./direction-colors";

/**
 * L'INTENTION DE DIRECTION (11/09).
 *
 * Une direction « intentionnee » est montee INVISIBLE avant qu'on y aille :
 * ses modeles se chargent et la chauffe des shaders compile ses programmes
 * pendant que le visiteur lit encore la page courante. A l'arrivee, il n'y
 * a plus rien a compiler, et le voyage cardinal ne fige plus le fil
 * principal (mesure du 11/09 : 1 a 2,6 s de gel par trajet avant cela).
 *
 * Deux sources d'intention : le survol ou le focus d'un lien cardinal
 * (PreloadOnIntent), et, quelques secondes apres le voile, la direction
 * SUIVANTE dans l'ordre du site, celle vers laquelle la cloture de page
 * emmene.
 */
const intents = new Set<DirectionKey>();
const listeners = new Set<() => void>();
let version = 0;

export const NEXT_DIRECTION: Record<DirectionKey, DirectionKey | null> = {
  jade: "dore",
  dore: "turquoise",
  turquoise: "cendre",
  cendre: "obsidienne",
  obsidienne: null,
};

export function addIntent(direction: DirectionKey): void {
  if (intents.has(direction)) return;
  intents.add(direction);
  version += 1;
  for (const l of listeners) l();
}

export function hasIntent(direction: DirectionKey): boolean {
  return intents.has(direction);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * LE MONTAGE ETALE (11/09, T4 du backlog). Une direction intentionnee compte
 * une dizaine de composants ; les monter tous dans le meme commit React
 * coutait une image de 114 a 214 ms pendant la lecture (mesure sur le
 * serveur de dev). Chaque MountForDirection demande un creneau, et le
 * distributeur en accorde un toutes les deux images : la somme est la meme,
 * le pic est celui d'un seul composant.
 */
const creneaux: Array<() => void> = [];
let distribution = false;
function distribuer() {
  const suivant = creneaux.shift();
  suivant?.();
  if (creneaux.length > 0) requestAnimationFrame(() => requestAnimationFrame(distribuer));
  else distribution = false;
}
/** Demande un creneau de montage ; retourne de quoi se retirer de la file. */
export function requestMountSlot(callback: () => void): () => void {
  creneaux.push(callback);
  if (!distribution && typeof requestAnimationFrame === "function") {
    distribution = true;
    requestAnimationFrame(distribuer);
  }
  return () => {
    const i = creneaux.indexOf(callback);
    if (i >= 0) creneaux.splice(i, 1);
  };
}

/** Change a chaque intention nouvelle : a lire pour re-rendre. */
export function useIntentVersion(): number {
  return useSyncExternalStore(subscribe, () => version, () => 0);
}
