/* eslint-disable @next/next/no-img-element */

import SplitText from "../split-text";
import RevealTrigger from "./reveal-trigger";
import FoyerArrival from "./foyer-arrival";
import VeilSoundChoice from "./veil-sound-choice";
import styles from "./piedra-skeleton.module.css";

/**
 * PiedraSkeleton (30/08). Server Component SSR pur : aucun useState,
 * useEffect, ni "use client". Rendu directement dans le HTML envoye au
 * navigateur, visible des la premiere frame avant meme le chargement
 * de React. Remplace le tandem `<div className="ssrLoadingVeil">` +
 * `<LoadingVeil>` client qui avait besoin de hacks (body class posee
 * en SSR + retiree au done, pseudo-element ::before, sync via
 * useEffect gymnastique) pour paraitre au premier frame.
 *
 * Pattern SOTY (Bruno Simon, Rauno Freiberg, Basement Studio) :
 *  - fallback SSR d'un boundary Suspense/state
 *  - anims CSS pures (rotations Ometeotl continues + reveal char +
 *    dots cardinaux qui jaillissent : tout timing en CSS custom
 *    properties, aucun rAF ni requestAnimationFrame)
 *  - ouverture pilotee par GSAP sur une horloge unique (lib/foyer)
 *  - pas de pourcentage (aveu de latence, aucun SOTY n'en affiche)
 *  - z-index 9700 pour couvrir compass/cursor/toggles sans avoir a
 *    les masquer un a un via body class + selectors [class*="..."]
 *
 * L'ouverture est declenchee par `<RevealTrigger />`, qui pose
 * `data-loaded="true"` sur <html> quand useProgress atteint 100 ET que
 * la sequence visible est finie, puis jouee par `<FoyerArrival />`
 * (08/09) : la fumee se retire depuis la clarte du foyer au lieu d'un
 * fondu d'opacite. Cf src/lib/foyer.ts.
 *
 * Piedra V2 (dessinee main par Sylvain) en 3 zones concentriques via
 * clip-path (coeur) + mask radial annulaire (bague / couronne), 3
 * rotations en sens INVERSES (signature Ometeotl : dualite creatrice).
 * Cf project-nahual-da pour la justification cosmogonique complete.
 *
 * 5 dots cardinaux (31/08) : a la fin du reveal texte, jaillissent
 * depuis le centre de la Piedra vers leur position cardinale
 * (Est/Sud/Ouest/Nord) + un dot central. Onde sequentielle Est → Sud →
 * Ouest → Nord (cycle jour narratif nahua : aube → midi → crepuscule →
 * mort), Centre en premier (Xiuhtecuhtli, feu axial). Timing pilote
 * par --reveal-end-ms passe en CSS var (calcule cote serveur en
 * fonction de la longueur des textes).
 */

const PIEDRA_SRC = "/img/piedra-del-sol-v2.svg";

export default function PiedraSkeleton({
  phrase,
  translation,
  label,
  sound,
}: {
  phrase: string;
  translation: string;
  label: string;
  sound: { choiceLabel: string; enterWith: string; enterWithout: string };
}) {
  return (
    <div
      className={styles.skeleton}
      role="status"
      aria-live="polite"
      aria-label={label}
      data-testid="piedra-skeleton"
      /* Cible stable pour la sortie de secours sans JavaScript (09/09) :
         un nom de classe de module CSS est hache, on ne peut pas le viser
         depuis un <style> global. */
      data-veil="1"
    >
      {/* LA FUMEE (08/09, chantier du foyer). Le voile n'est plus un
          calque qu'on fait disparaitre en opacite : c'est de la fumee de
          copal, et elle se RETIRE depuis la clarte du foyer (masque
          radial pilote par --foyer-hole). Le plateau du codex (Piedra,
          phrase, traduction) est DEDANS : il est consomme avec elle,
          d'un seul geste, au lieu de se fondre a part. Cf lib/foyer. */}
      <div className={styles.smoke} data-foyer="smoke">
      <div className={styles.stage}>
        <div className={styles.piedra} data-foyer="plate">
          <div className={styles.rotatorForward}>
            <img src={PIEDRA_SRC} alt="" className={styles.inner} />
            <img src={PIEDRA_SRC} alt="" className={styles.outer} />
          </div>
          <div className={styles.rotatorReverse}>
            <img src={PIEDRA_SRC} alt="" className={styles.middle} />
          </div>
          <div className={styles.dots} aria-hidden="true">
            {/* Ripple concentrique (D) : 2 ondes qui jaillissent depuis le
                centre au moment du burst du dot Xiuhtecuhtli, donnent du
                poids au geste (effet "pierre jetee a l'eau"). */}
            <span className={`${styles.ripple} ${styles.rippleOne}`} />
            <span className={`${styles.ripple} ${styles.rippleTwo}`} />
            {/* 5 dots cardinaux : Centre part le premier (Xiuhtecuhtli),
                puis onde Est → Sud → Ouest → Nord (cycle jour nahua).
                Chaque dot enchaine burst + pulse continu (B) qui respire
                a 30 bpm apres son arrivee. */}
            <span className={`${styles.dot} ${styles.dotCenter}`} data-foyer-dot="jade" />
            <span className={`${styles.dot} ${styles.dotEast}`} data-foyer-dot="dore" />
            <span className={`${styles.dot} ${styles.dotSouth}`} data-foyer-dot="turquoise" />
            <span className={`${styles.dot} ${styles.dotWest}`} data-foyer-dot="cendre" />
            <span className={`${styles.dot} ${styles.dotNorth}`} data-foyer-dot="obsidienne" />
            {/* Cercle d'union (C) : mandala nahua : cadran des 5
                directions du Codex Fejervary-Mayer refermé une fois
                tous les dots poses. Fade in subtil, aucun trace stroke. */}
            <span className={styles.unionCircle} />
          </div>
        </div>
        <p className={styles.phrase} lang="nah">
          <SplitText text={phrase} ariaLabel={phrase} />
        </p>
        <p className={styles.translation}>
          <SplitText text={translation} ariaLabel={translation} />
        </p>
        {/* Le choix du son (11/09) : une invitation pendant l'attente, pas une
            porte. Le voile s'ouvre de lui-meme, avec ou sans reponse. */}
        <VeilSoundChoice label={sound} />
      </div>
      </div>
      {/* LE FOYER : la flamme du Centre, posee par FoyerArrival sur la
          projection EXACTE du feu 3D (lib/foyer, projectToScreen). Elle
          se leve quand la fumee l'atteint, puis passe la main aux
          braises WebGL qui brulent au meme pixel : le raccord de medium
          se fait sur un point brillant, seule facon de ne pas le voir. */}
      <span className={styles.hearth} data-foyer="hearth" aria-hidden="true" />
      {/* Pont de vol : les quatre dots cardinaux y sont deposes (hors du
          masque) pour rejoindre la boussole. Le voile ne perd rien, il
          se range : le quinconce montre pendant l'attente EST la croix a
          cinq points de la boussole en bas a droite. */}
      <div className={styles.flightDeck} data-foyer="deck" aria-hidden="true" />
      {/* Logo Nahual signature finale (31/08, etape 3/3) : positionne
          en top-left du voile, meme structure que le vrai .logoLink du
          header (mini-logo.svg 32x32 + gap 10px + texte casse normale
          font-weight 700 size 1.1rem letter-spacing 0.02em). Effet :
          "le header est deja la, en train de se reveiller". L'icone
          se pose juste avant le premier char du texte (fade + scale
          doux), le texte s'ecrit ensuite char-by-char. aria-hidden :
          le voile porte deja son role et aria-label global. */}
      <p className={styles.logoSignature} aria-hidden="true">
        <img
          src="/img/mini-logo.svg"
          alt=""
          width={32}
          height={32}
          className={styles.logoIcon}
        />
        <SplitText text="Nahual" />
      </p>
      {/* Pose data-reveal-done="true" sur skeleton apres l'animation
          du dernier char de la traduction : gate CSS pour toute la
          sequence post-reveal (dots + cercle + logo). */}
      <RevealTrigger />
      {/* Orchestre l'arrivee quand data-loaded apparait : ouverture de la
          fumee, vol des dots vers la boussole, descente de la camera,
          et la decision « le foyer brule-t-il encore ? » pour un
          visiteur qui revient. */}
      <FoyerArrival />
    </div>
  );
}
