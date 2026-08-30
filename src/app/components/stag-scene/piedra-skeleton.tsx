/* eslint-disable @next/next/no-img-element */

import styles from "./piedra-skeleton.module.css";

/**
 * PiedraSkeleton (30/08). Server Component SSR pur — aucun useState,
 * useEffect, ni "use client". Rendu directement dans le HTML envoye au
 * navigateur, visible des la premiere frame avant meme le chargement
 * de React. Remplace le tandem `<div className="ssrLoadingVeil">` +
 * `<LoadingVeil>` client qui avait besoin de hacks (body class posee
 * en SSR + retiree au done, pseudo-element ::before, sync via
 * useEffect gymnastique) pour paraitre au premier frame.
 *
 * Pattern SOTY (Bruno Simon, Rauno Freiberg, Basement Studio) :
 *  - fallback SSR d'un boundary Suspense/state
 *  - anims CSS pures (rotations Ometeotl continues)
 *  - fade out par CSS quand `html[data-loaded="true"]`
 *  - pas de pourcentage (aveu de latence, aucun SOTY n'en affiche)
 *  - z-index 9700 pour couvrir compass/cursor/toggles sans avoir a
 *    les masquer un a un via body class + selectors [class*="..."]
 *
 * Le fade out est declenche par `<LoadingSync />` (petit client
 * component) qui pose `data-loaded="true"` sur <html> quand
 * useProgress atteint 100 + MIN_VEIL_DURATION_MS ecoulee.
 *
 * Piedra V2 (dessinee main par Sylvain) en 3 zones concentriques via
 * clip-path (coeur) + mask radial annulaire (bague / couronne), 3
 * rotations en sens INVERSES (signature Ometeotl — dualite creatrice).
 * Cf project-nahual-da pour la justification cosmogonique complete.
 */

const PIEDRA_SRC = "/img/piedra-del-sol-v2.svg";

export default function PiedraSkeleton({
  phrase,
  translation,
  label,
}: {
  phrase: string;
  translation: string;
  label: string;
}) {
  return (
    <div
      className={styles.skeleton}
      role="status"
      aria-live="polite"
      aria-label={label}
      data-testid="piedra-skeleton"
    >
      <div className={styles.stage}>
        <div className={styles.piedra}>
          <div className={styles.rotatorForward}>
            <img src={PIEDRA_SRC} alt="" className={styles.inner} />
            <img src={PIEDRA_SRC} alt="" className={styles.outer} />
          </div>
          <div className={styles.rotatorReverse}>
            <img src={PIEDRA_SRC} alt="" className={styles.middle} />
          </div>
        </div>
        <p className={styles.phrase} lang="nah">{phrase}</p>
        <p className={styles.translation}>{translation}</p>
      </div>
    </div>
  );
}
