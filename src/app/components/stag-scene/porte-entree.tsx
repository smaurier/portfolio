"use client";

import { useState } from "react";
import { ENTRER_EVENT } from "./reveal-trigger";
import styles from "./piedra-skeleton.module.css";

/**
 * LA PORTE DU VOILE (16/09, idee de Sylvain).
 *
 * Un voile qui retient sans porte se lit comme une contrainte ; le meme
 * voile avec une porte se lit comme une offre, et qui veut la ceremonie la
 * regarde. C'est aussi une sortie pour qui ne veut pas subir une sequence
 * chronometree, ce qui est le meme reflexe que la pause du mouvement.
 *
 * LE BOUTON SAUTE LA CHOREGRAPHIE, JAMAIS LE TRAVAIL. L'evenement marque la
 * sequence comme finie ; les trois portes de RevealTrigger (les octets, la
 * sequence, la chauffe des shaders) restent en place. On n'entre donc jamais
 * dans une scene dont les programmes ne sont pas compiles : ce serait une
 * scene qui saccade, c'est-a-dire pire que d'attendre. Mesure du 16/09 : la
 * chauffe finit a 3,1 s, donc presser la porte a une seconde fait entrer a
 * trois, pas a une.
 *
 * Il vit dans un fichier a lui pour que le voile reste rendu au serveur :
 * la phrase en nahuatl est tiree cote serveur et doit etre dans le HTML
 * servi, un test le garde.
 */
export default function PorteDEntree({ label, hint }: { label: string; hint: string }) {
  const [presse, setPresse] = useState(false);
  return (
    <button
      type="button"
      className={styles.porte}
      data-presse={presse ? "true" : undefined}
      title={hint}
      onClick={() => {
        if (presse) return;
        setPresse(true);
        window.dispatchEvent(new CustomEvent(ENTRER_EVENT));
      }}
    >
      {label}
    </button>
  );
}
