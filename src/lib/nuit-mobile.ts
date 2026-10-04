/**
 * LA NUIT MOBILE (04/10/2026). Design :
 * docs/superpowers/specs/2026-10-04-nuit-mobile-design.md.
 *
 * Sous 768 px, le profil de performance coupe le post-traitement, et avec
 * lui le Bloom qui faisait rayonner le foyer, les braises et les
 * speculaires du cerf : la premiere image de nuit du Centre etait noire sur
 * un vrai telephone (Redmi Note 9 Pro, 04/10), et sur le Chromium du PC a
 * 767 px, pas a 769 px. Rallumer le Bloom n'est pas une option sur un
 * appareil a dix images par seconde. On rend donc en LUMIERE ce que le
 * Bloom ajoutait : trois facteurs, a 1 des que le profil porte le
 * post-traitement, et a 1 des que le jour s'est leve (meme courbe que la
 * lumiere de l'arc : la compensation n'existe que la ou le Bloom manquait).
 *
 * L'ordre des leviers (design, section 2) : d'abord ce qui eclaire
 * localement (le foyer, les braises), puis l'ambiante, et l'exposition en
 * dernier recours, parce qu'elle est globale et grise la penombre. Ces
 * nombres sont un dosage valide a l'oeil contre la capture a 769 px, puis
 * garde par tests/e2e/nuit-mobile.spec.ts. Ce module est pur.
 */
import { PHASE_START, easeWithinRange } from "./reveal-arc";

export type CompensationNuit = { ambiant: number; emissif: number; exposition: number };

/** Les valeurs a l'arc zero, sur mobile. Point de depart du 04/10, a doser (plan, tache 4). */
export const COMPENSATION_NUIT: CompensationNuit = { ambiant: 1.6, emissif: 2.5, exposition: 1 };

const UN: CompensationNuit = { ambiant: 1, emissif: 1, exposition: 1 };

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function compensationNuit(profil: { postFx: boolean }, progress: number): CompensationNuit {
  if (profil.postFx) return { ...UN };
  const p = clamp01(progress);
  return {
    ambiant: easeWithinRange(p, PHASE_START.penombre, PHASE_START["chemins-reveles"], COMPENSATION_NUIT.ambiant, 1),
    emissif: easeWithinRange(p, PHASE_START.penombre, PHASE_START["chemins-reveles"], COMPENSATION_NUIT.emissif, 1),
    exposition: easeWithinRange(p, PHASE_START.penombre, PHASE_START["chemins-reveles"], COMPENSATION_NUIT.exposition, 1),
  };
}
