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

/**
 * Les valeurs a l'arc zero, sur mobile. DOSAGE DU 04/10, HYPOTHESE : la
 * validation a l'oeil n'a PAS eu lieu (Sylvain, 04/10 au matin : il n'avait
 * pas les captures sous les yeux et a mal lu la question). Ce dosage tient
 * par la mesure seule (ci-dessous) tant qu'un regard sur la capture a
 * 767 px contre 769 px, texte masque, ou sur un vrai telephone, ne l'a pas
 * confirme ou refuse.
 *
 * Ce que la mesure a dit avant de doser (oracle tests/e2e/nuit-mobile) :
 * sans compensation, mobile 76,3 % de noir / luminance mediane 6,1 contre
 * bureau 21,4 % / 21,4 ; a 1,6 / 2,5 / 1 (le point de depart du design) :
 * 67,7 % / 7,2, presque rien ; a 3 / 4 / 1,15 : 47,6 % / 11,1, et la scene
 * devient plate. Bissection du palier mobile : le Bloom seul ramene a 37,9 %
 * / 13,6, l'herbe seule (26 000 brins) a 54,5 % / 9,4 -- la nuit du bureau
 * est faite de Bloom et d'herbe dense, deux choses que le budget « zero
 * image de plus » interdit sur un telephone a dix images par seconde. Ce
 * dosage donne 56,1 % / 9,2 : le cerf, le foyer et les braises se lisent,
 * pas le rayonnement. L'exposition est au plafond du design (1,15).
 */
export const COMPENSATION_NUIT: CompensationNuit = { ambiant: 2.2, emissif: 3.5, exposition: 1.15 };

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
