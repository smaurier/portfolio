import { STORAGE_KEYS } from "@/lib/scene-controls";

/**
 * Etat des controles de scene (05/09), partage entre le bloc de boutons,
 * le fournisseur de profil de rendu (scene-refs-context) et la page.
 * Module mutable + abonnes, comme les autres stores de la scene : lu a
 * 60 fps par certains, change rarement.
 */
export type SceneControlsState = {
  /** Texte masque : seule la scene (et les controles) restent. */
  sceneOnly: boolean;
  /** Contemplation : la scene deroule seule, du progres courant au midi. */
  cinematic: boolean;
  /** Profil de rendu leger force. */
  eco: boolean;
  /** L'heure de Tenochtitlan : la scene figee a la hauteur reelle du
   * soleil sur Mexico, la camera qui orbite (lib solar). */
  tenochtitlan: boolean;
  /** Progres de l'arc impose par l'heure reelle (0 la nuit .. 1 le zenith). */
  tenochtitlanArc: number;
  /** Apres le midi solaire : soleil a l'ouest. */
  tenochtitlanAfternoon: boolean;
};

type Listener = (state: SceneControlsState) => void;

function readStored(): Partial<SceneControlsState> {
  if (typeof window === "undefined") return {};
  const out: Partial<SceneControlsState> = {};
  try {
    out.sceneOnly = window.sessionStorage.getItem(STORAGE_KEYS.sceneOnly) === "1";
  } catch {
    /* stockage indisponible : on part de zero */
  }
  try {
    out.eco = window.localStorage.getItem(STORAGE_KEYS.eco) === "1";
  } catch {
    /* idem */
  }
  return out;
}

const state: SceneControlsState = { sceneOnly: false, cinematic: false, eco: false, tenochtitlan: false, tenochtitlanArc: 0, tenochtitlanAfternoon: false };
const listeners = new Set<Listener>();
let hydrated = false;

/** Relit le stockage une fois, cote client (jamais au rendu serveur). */
export function hydrateSceneControls(): SceneControlsState {
  if (!hydrated && typeof window !== "undefined") {
    hydrated = true;
    Object.assign(state, readStored());
  }
  return state;
}

export function getSceneControls(): SceneControlsState {
  return state;
}

export function setSceneControls(patch: Partial<SceneControlsState>): void {
  Object.assign(state, patch);
  try {
    if (patch.sceneOnly !== undefined) window.sessionStorage.setItem(STORAGE_KEYS.sceneOnly, patch.sceneOnly ? "1" : "0");
    if (patch.eco !== undefined) window.localStorage.setItem(STORAGE_KEYS.eco, patch.eco ? "1" : "0");
  } catch {
    /* stockage indisponible : l'etat vit en memoire */
  }
  for (const l of listeners) l(state);
}

export function subscribeSceneControls(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
