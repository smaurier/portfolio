"use client";

// eslint-disable @next/next/no-img-element : Next Image n'apporte rien
// sur un SVG local — pas de conversion webp/avif (SVG deja vectoriel),
// pas d'optimisation de taille (le fichier fait 171 KB fetche une seule
// fois via cache navigateur meme si utilise plusieurs fois). L'overhead
// de next/image (wrapper + lazy loading) est contre-productif pour un
// asset deja resident au moment du render.

import styles from "./piedra-veil.module.css";

/**
 * PiedraVeil (30/08). Piedra del Sol V2 (dessinee main par Sylvain
 * dans Adobe Illustrator, cf public/img/piedra-del-sol-v2.svg) au
 * voile de chargement. Remplace les 4 tentatives de silhouette
 * Xiuhcoatl echouees (20-21/08 parametrique, 30/08 bezier main
 * au juge, 30/08 SVG source LLM) — la vraie silhouette dessinee main
 * par Sylvain lui-meme, comme la leçon 21/08 le pointait depuis le
 * debut.
 *
 * Composition finale (apres iterations avec Sylvain 30/08) :
 *  - Coeur central (clip-path circle 25 %) : opacite 0.30, rotation
 *    HORAIRE (45 s/tour)
 *  - Bague du milieu (mask annulaire 33-58 %) : opacite 0.40, rotation
 *    ANTI-horaire (60 s/tour) — SENS INVERSE
 *  - Couronne exterieure (mask annulaire 60-95 %) : opacite 0.50,
 *    rotation HORAIRE (45 s/tour, meme sens que le coeur)
 *  - Deux rotators : forward porte coeur+couronne, reverse porte
 *    bague du milieu
 *  - Gaps 8 % (coeur→milieu) et 2 % (milieu→couronne) — evite
 *    superpositions visuelles entre zones
 *  - Piedra visible des progress=0 (retour Sylvain "pourquoi le svg
 *    n'apparait il pas des 0 % ?") — pas de fade-in ni radial reveal
 *
 * Sens cosmogonique nahua :
 *  - Les DEUX rotations en sens inverses incarnent OMETEOTL (le
 *    "Deux-Dieu", principe de dualite creatrice — source des couples
 *    Ometecuhtli/Omecihuatl, Tezcatlipoca/Quetzalcoatl, jour/nuit).
 *    Dans la pensee nahua rien ne bouge sans polarite complementaire ;
 *    les 2 rotations contra incarnent litteralement ce principe.
 *    Elles repondent au "pourquoi Nahui Ollin ?" (cf Codex Nahual) :
 *    le 5e Soleil tient par la tension entre forces contradictoires.
 *  - Les 2 vitesses (45 s / 60 s) sont incommensurables — elles ne
 *    se realignent jamais parfaitement, echo des cycles nahuas
 *    (tonalpohualli 260 j + xihuitl 365 j qui ne coincident que tous
 *    les 52 ans = ceremonie du Feu Nouveau).
 *
 * Refs : Miguel Leon-Portilla "La pensee azteque" (Ometeotl), James
 * Maffie "Aztec Philosophy" (teotl comme force en polarites
 * complementaires), Danza de los Voladores de Papantla (contra-
 * rotation rituelle vivante, mat central + 4 danseurs 13x4=52 tours).
 */

const PIEDRA_SRC = "/img/piedra-del-sol-v2.svg";

// Retour Sylvain 30/08 : "pourquoi le svg n'apparait il pas des 0 % ?"
// → retire le fade-in progressif d'opacite et le radial reveal
// clip-path. La Piedra est PLEINEMENT visible des progress=0. Seules
// les rotations continues CSS (Ometeotl) animent le voile. Le prop
// progress reste dans la signature au cas ou on veut le reutiliser
// plus tard (ex : accelerer les rotations en fin de chargement).

export default function PiedraVeil({ progress: _progress }: { progress: number }) {
  return (
    <div className={styles.container}>
      <div className={styles.reveal}>
        {/* Rotator HORAIRE (45 s) : porte le coeur central ET la
            couronne exterieure. Les deux tournent ensemble dans le
            meme sens, la bague du milieu contra-tournera entre eux. */}
        <div className={styles.rotatorForward}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={PIEDRA_SRC} alt="" className={styles.inner} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={PIEDRA_SRC} alt="" className={styles.outer} />
        </div>
        {/* Rotator ANTI-horaire (60 s) : porte la bague du milieu
            (annulaire 47-72 %). Sens INVERSE du coeur et de la
            couronne — signature Ometeotl (dualite creatrice). */}
        <div className={styles.rotatorReverse}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={PIEDRA_SRC} alt="" className={styles.middle} />
        </div>
      </div>
    </div>
  );
}
