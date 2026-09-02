/**
 * Variation des gestes du cerf au Nord (02/09, retour Sylvain "le
 * mouvement est repetitif" a propos du sabot qui gratte le sol : c'est
 * la boucle d'animation). Au Mictlan le cerf alterne ses trois clips
 * (Idle, Idle_2, Eating) par segments de duree aleatoire mais
 * DETERMINISTE en fonction du temps (pas de Math.random dans le rendu :
 * rejouable, testable), jamais deux fois le meme de suite.
 */

export type StagClip = "Idle" | "Idle_2" | "Eating";

const CLIPS: StagClip[] = ["Idle", "Idle_2", "Eating"];
export const NORTH_CLIP_MIN = 7;
export const NORTH_CLIP_MAX = 15;

function hash(k: number): number {
  const v = Math.sin(k * 12.9898 + 78.233) * 43758.5453;
  return v - Math.floor(v);
}

function segmentDuration(index: number): number {
  return NORTH_CLIP_MIN + hash(index * 3 + 1) * (NORTH_CLIP_MAX - NORTH_CLIP_MIN);
}

function clipOfSegment(index: number): StagClip {
  // Sans repetition immediate : on choisit parmi les deux autres clips
  // que celui du segment precedent, recursivement depuis le segment 0.
  if (index <= 0) return CLIPS[Math.floor(hash(0.5) * 3)];
  const prev = clipOfSegment(index - 1);
  const others = CLIPS.filter((c) => c !== prev);
  return others[Math.floor(hash(index * 3 + 2) * others.length)];
}

/** Clip a jouer a l'instant `time` (secondes), et l'index du segment
 * courant (pour ne relancer l'action qu'au changement). */
export function pickNorthClip(time: number): { clip: StagClip; segment: number } {
  let t = Math.max(0, time);
  let index = 0;
  // Les segments sont courts et le temps de page borne : la boucle reste
  // petite (quelques centaines d'iterations au pire apres une heure).
  let d = segmentDuration(index);
  while (t >= d) {
    t -= d;
    index++;
    d = segmentDuration(index);
  }
  return { clip: clipOfSegmentCached(index), segment: index };
}

const cache = new Map<number, StagClip>();
function clipOfSegmentCached(index: number): StagClip {
  const hit = cache.get(index);
  if (hit) return hit;
  // Remplit sequentiellement (evite la recursion profonde).
  let prev: StagClip | null = cache.get(index - 1) ?? null;
  let from = prev ? index : 0;
  if (!prev) {
    for (let i = index - 1; i >= 0; i--) {
      const c = cache.get(i);
      if (c) {
        prev = c;
        from = i + 1;
        break;
      }
    }
  }
  for (let i = from; i <= index; i++) {
    let clip: StagClip;
    if (i === 0) clip = CLIPS[Math.floor(hash(0.5) * 3)];
    else {
      const others = CLIPS.filter((c) => c !== prev);
      clip = others[Math.floor(hash(i * 3 + 2) * others.length)];
    }
    cache.set(i, clip);
    prev = clip;
  }
  return cache.get(index) ?? clipOfSegment(index);
}
