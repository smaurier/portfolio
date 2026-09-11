// Filet mobile MINIMAL (palier "Usability", cf memory project-nahual-da :
// retour de Sylvain le 19/08). Volontairement pas le "vrai repli WebGL"
// promis pour plus tard (densité de flore réduite, scène simplifiée sans
// perte narrative) : juste un garde-fou de performance basique, pour ne pas
// exposer un canvas qui rame dès qu'il devient la home en prod. Fonction
// pure, découplée du rendu : même principe que reveal-arc.ts/camera-path.ts.

import { resolveQuality } from "./scene-controls";

const MOBILE_BREAKPOINT_PX = 768;

// react-three-fiber plafonne déjà le devicePixelRatio à 2 par défaut (prop
// `dpr` du Canvas) : un vrai plafond, mais pas assez bas pour beaucoup de
// téléphones (souvent DPR 3) sur une scène avec post-processing. 1.5 reste
// net à l'œil sur petit écran tout en réduisant sensiblement le nombre de
// fragments à calculer par frame.
const MOBILE_DPR_CAP = 1.5;
// RESTE A 2 (11/09). Le panel du 08/09 proposait 1,5 (« le plafond de
// densite est le poste de cout dominant ») ; Sylvain a demande de mesurer.
// A/B entrelace, meme machine, meme page, a quelques minutes d'ecart, ecran
// emule a densite 2, CPU x4, accueil a 45 % de l'arc :
//   densite 2   : 35 images en retard sur 1167, 5e centile 59,5 im/s
//   densite 1,5 : 296 images en retard sur 906, 5e centile 29,9 im/s
// Trois courses a 1,5, toutes mauvaises. Sur cette machine (ANGLE d3d11),
// un canvas a l'echelle 1,5 sur un ecran a densite 2 coute PLUS que le
// 1:1, sans doute le reechantillonnage non entier a la composition. Et 1,5
// est un peu moins net sur les bois et l'herbe. Le panel avait tort ici.
const DESKTOP_DPR_CAP = 2;

export type PerfProfile = {
  /** Plafond passé à la prop `dpr` du Canvas r3f (`dpr={[1, dprCap]}`). */
  dprCap: number;
  /** Post-processing (Bloom/ChromaticAberration/Vignette) : le coût le plus
   * concentré de la scène après le DPR : EffectComposer refait tourner un
   * pass plein écran par effet, désactivé sous le seuil mobile plutôt que
   * réglé plus léger (pas de valeur intermédiaire connue qui vaille le
   * coup, cf discussion 19/08). */
  postFx: boolean;
  /** Ombres portees (05/09) : directionnelle du Sud, projecteur du serpent. */
  shadows: boolean;
  /** Brins d'herbe de la prairie (05/09). */
  bladeCount: number;
  /** Meches de cheveux par porteuse, a l'Ouest (10/09). */
  hairStrands: number;
  /** Feuilles du vent de l'Ouest (11/09). */
  leafCount: number;
};

/**
 * `viewportWidth <= 0` (avant la première mesure côté client, pendant
 * l'hydratation) retombe sur le profil desktop plutôt que mobile : évite un
 * flash "version allégée" pour tout le monde le temps que la vraie largeur
 * soit lue (cf stag-scene.tsx, useEffect + window.innerWidth).
 */
export function getPerfProfile(viewportWidth: number, eco = false): PerfProfile {
  const isMobile = viewportWidth > 0 && viewportWidth < MOBILE_BREAKPOINT_PX;
  // Le mode eco (05/09, controles de scene) force le repli, meme sur ordi ;
  // les paliers vivent dans lib/scene-controls (resolveQuality), les
  // plafonds DPR d'ici en sont la source.
  const q = resolveQuality(eco, isMobile);
  return {
    dprCap: eco ? q.dprCap : isMobile ? MOBILE_DPR_CAP : DESKTOP_DPR_CAP,
    postFx: q.postFx,
    shadows: q.shadows,
    bladeCount: q.bladeCount,
    hairStrands: q.hairStrands,
    leafCount: q.leafCount,
  };
}
