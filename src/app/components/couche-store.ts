"use client";

import { useSyncExternalStore } from "react";
import { COUCHE_EVENT, COUCHE_STORAGE_KEY, coucheInitiale, parseStoredCouche, type Couche, type CoucheContexte } from "@/lib/couche";

/**
 * LA COUCHE COURANTE (02/11/2026), partagee par la truelle, la scene et
 * l'amatl. Design :
 * docs/superpowers/specs/2026-11-02-trois-couches-design.md.
 *
 * Meme forme que theme-store.ts, et c'est voulu : le script inline du
 * layout a deja pose `data-couche` sur <html> AVANT le premier paint, et ce
 * module ne fait que le relire. Sans ca, on verrait un eclair de la
 * mauvaise couche a chaque chargement -- le defaut exact que le script du
 * theme existe pour eviter. ⛔ Ne PAS suivre le motif de
 * scene-controls-store.ts (relu a l'hydratation) meme si la truelle se rend
 * dans la meme barre que ses boutons.
 *
 * Toute la decision vit dans lib/couche.ts, qui est pur. Ici, et ici
 * seulement, les trois lectures impures : WebGL, mouvement reduit,
 * connexion.
 */
type Listener = () => void;
const listeners = new Set<Listener>();

/**
 * Un contexte WebGL a-t-il pu etre cree sur cette machine ? **Rien de tel
 * n'existait dans ce depot avant le 02/11** : la regle « l'amatl sans
 * WebGL » etait ecrite depuis le 14/10 sans que personne ne la verifie
 * jamais. Le `try/catch` n'est pas decoratif : certains navigateurs levent
 * au lieu de rendre `null`.
 */
function webglDisponible(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Meme lecture que `prelectureBienvenue` dans
 * stag-scene/mount-for-direction.tsx : une seule regle de connexion dans ce
 * site, pas deux qui divergeraient. `navigator.connection` n'existe pas
 * partout ; son absence vaut « connexion normale », pas « degradee ».
 */
function connexionDegradee(): boolean {
  if (typeof navigator === "undefined") return false;
  const c = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (!c) return false;
  return !!c.saveData || c.effectiveType === "slow-2g" || c.effectiveType === "2g";
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function contexteCouche(): CoucheContexte {
  return {
    prefersReducedMotion: prefersReducedMotion(),
    webglDisponible: webglDisponible(),
    connexionDegradee: connexionDegradee(),
  };
}

/**
 * Rendu serveur : personne ne peut connaitre la machine du visiteur avant
 * qu'il ait recu la page. On prend l'amatl, qui est le repli qui ne demande
 * rien -- jamais la scene, qui pourrait ne pas pouvoir se rendre. Le script
 * du layout corrige avant le premier paint, et ce module relit a
 * l'hydratation.
 */
function coucheSansDocument(): Couche {
  return "amatl";
}

function lireLeDocument(): Couche {
  if (typeof document === "undefined") return coucheSansDocument();
  const posee = parseStoredCouche(document.documentElement.getAttribute("data-couche"));
  if (posee) return posee;
  // L'attribut manque (script du layout en echec) : on refait sa regle,
  // plutot que de retomber sur une couche choisie d'avance.
  let stocke: string | null = null;
  try {
    stocke = window.localStorage.getItem(COUCHE_STORAGE_KEY);
  } catch {
    // Stockage refuse : le choix ne survivra pas au rechargement, c'est tout.
  }
  return coucheInitiale(stocke, contexteCouche());
}

export function getCouche(): Couche {
  return lireLeDocument();
}

export function applyCouche(couche: Couche): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-couche", couche);
  try {
    window.localStorage.setItem(COUCHE_STORAGE_KEY, couche);
  } catch {
    // Idem : la couche vit en memoire pour cette visite.
  }
  window.dispatchEvent(new CustomEvent(COUCHE_EVENT, { detail: { couche } }));
  for (const l of listeners) l();
}

function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** La couche courante, reactive. Rendu serveur : voir coucheSansDocument. */
export function useCouche(): Couche {
  return useSyncExternalStore(subscribe, lireLeDocument, coucheSansDocument);
}
