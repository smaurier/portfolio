import type { DirectionKey } from "@/app/components/stag-scene/direction-colors";

/**
 * LES COUPES SON DU VOYAGE CARDINAL (11/09, C2 du backlog, choix de
 * Sylvain : un motif par direction).
 *
 * Le depart a deja son accord (le carillon de la direction, au clic). Ce
 * fichier decrit l'ARRIVEE : un motif court, generatif, de l'element de la
 * direction, joue quand la scene de la direction est prete (l'evenement de
 * chauffe). Pur et teste : les timbres sont dans sound-design.tsx, les
 * choix sont ici, en un seul endroit.
 */
export type ArrivalCue =
  | { kind: "crackle"; hits: number; spacingMs: number }
  | { kind: "breath"; seconds: number; fromHz: number; toHz: number }
  | { kind: "crack"; thumpFromHz: number; thumpToHz: number }
  | { kind: "gust"; seconds: number; centerHz: number }
  | { kind: "drops"; hits: number; spacingMs: number };

export const ARRIVAL_CUES: Record<DirectionKey, ArrivalCue> = {
  // Le foyer : trois crepitements, le feu qui reprend.
  jade: { kind: "crackle", hits: 3, spacingMs: 90 },
  // L'aube : un souffle qui s'ouvre, du grave vers le clair.
  dore: { kind: "breath", seconds: 0.9, fromHz: 300, toHz: 2400 },
  // Le midi : une braise qui claque, et un coup sourd.
  turquoise: { kind: "crack", thumpFromHz: 95, thumpToHz: 58 },
  // Le soir : une rafale de cendre.
  cendre: { kind: "gust", seconds: 1.1, centerHz: 320 },
  // La nuit : deux gouttes dans le bassin.
  obsidienne: { kind: "drops", hits: 2, spacingMs: 220 },
};

export function arrivalCueFor(direction: DirectionKey): ArrivalCue {
  return ARRIVAL_CUES[direction];
}

/** Une arrivee se joue seulement si l'on VIENT de quelque part : jamais au
 *  premier chargement (le voile a son propre silence), jamais deux fois pour
 *  la meme direction. */
export function shouldPlayArrival(previous: DirectionKey | null, next: DirectionKey, lastPlayed: DirectionKey | null): boolean {
  if (previous === null) return false;
  if (previous === next) return false;
  return lastPlayed !== next;
}
