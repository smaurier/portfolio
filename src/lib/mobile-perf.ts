// Filet mobile MINIMAL (palier "Usability", cf memory project-nahual-da :
// retour de Sylvain le 19/08). Volontairement pas le "vrai repli WebGL"
// promis pour plus tard (densité de flore réduite, scène simplifiée sans
// perte narrative) : juste un garde-fou de performance basique, pour ne pas
// exposer un canvas qui rame dès qu'il devient la home en prod. Fonction
// pure, découplée du rendu : même principe que reveal-arc.ts/camera-path.ts.

const MOBILE_BREAKPOINT_PX = 768;

// react-three-fiber plafonne déjà le devicePixelRatio à 2 par défaut (prop
// `dpr` du Canvas) : un vrai plafond, mais pas assez bas pour beaucoup de
// téléphones (souvent DPR 3) sur une scène avec post-processing. 1.5 reste
// net à l'œil sur petit écran tout en réduisant sensiblement le nombre de
// fragments à calculer par frame.
const MOBILE_DPR_CAP = 1.5;
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
};

/**
 * `viewportWidth <= 0` (avant la première mesure côté client, pendant
 * l'hydratation) retombe sur le profil desktop plutôt que mobile : évite un
 * flash "version allégée" pour tout le monde le temps que la vraie largeur
 * soit lue (cf stag-scene.tsx, useEffect + window.innerWidth).
 */
export function getPerfProfile(viewportWidth: number): PerfProfile {
  const isMobile = viewportWidth > 0 && viewportWidth < MOBILE_BREAKPOINT_PX;
  return {
    dprCap: isMobile ? MOBILE_DPR_CAP : DESKTOP_DPR_CAP,
    postFx: !isMobile,
  };
}
