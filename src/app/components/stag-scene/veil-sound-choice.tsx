"use client";

import { useEffect, useState } from "react";
import styles from "./piedra-skeleton.module.css";

/**
 * LE CHOIX DU SON, AU VOILE (11/09, arbitrage de Sylvain : « deux boutons au
 * voile »).
 *
 * Trois faits qui decident de la forme :
 *  - aucun navigateur ne laisse partir un son sans un geste de l'utilisateur
 *    (MDN, guide de l'autoplay : clic, touche, tap) ; le voile est l'endroit
 *    ou le visiteur arrive, donc l'endroit ou ce geste a un sens ;
 *  - un jure qui ne clique jamais sur le bouton du rail n'entend rien, et le
 *    son est l'ecart le plus net avec les laureats (docs/da/etat-de-l-art.md,
 *    septieme constante) ;
 *  - c'est le site d'un futur auditeur RGAA : le son est un CHOIX, jamais une
 *    surprise, et « sans le son » est un bouton aussi grand que l'autre.
 *
 * Le voile s'ouvre de lui-meme quand la scene est la, avec ou sans choix :
 * les boutons sont une invitation pendant l'attente, pas une porte. Sans
 * reponse, le site reste muet, comme avant.
 *
 * Le choix est persiste (la meme cle que le bouton du rail), et ce composant
 * ne s'affiche qu'a la premiere visite : celui qui a deja repondu n'a pas a
 * repondre deux fois. Le bouton du rail reste la pour changer d'avis.
 *
 * Le geste doit rester DANS le gestionnaire de clic : SoundDesign ecoute
 * l'evenement et cree l'AudioContext a ce moment-la, pas plus tard.
 */
const STORAGE_KEY = "nahual-sound-muted";
/** La cle du CHOIX, distincte de la cle du muet : SoundDesign ecrit celle du
 *  muet des son montage, donc « pas de cle » n a jamais voulu dire
 *  « premiere visite ». Mesure du 11/09 : la cle valait « 1 » a 4,2 s, avant
 *  que ce composant ait pu lire quoi que ce soit. */
const CHOICE_KEY = "nahual-sound-choice";

export const SOUND_CHOICE_EVENT = "nahual:sound-choice";

export default function VeilSoundChoice({
  label,
}: {
  label: { choiceLabel: string; enterWith: string; enterWithout: string };
}) {
  // null tant qu'on ne sait pas : rien n'est rendu, donc aucun eclair de
  // boutons pour le visiteur qui a deja choisi.
  const [visible, setVisible] = useState<boolean | null>(null);

  useEffect(() => {
    let deja: string | null = null;
    try {
      deja = window.localStorage.getItem(CHOICE_KEY);
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture du stockage, cote client seulement
    setVisible(deja === null);
  }, []);

  if (visible !== true) return null;

  const choisir = (avecLeSon: boolean) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, avecLeSon ? "0" : "1");
      window.localStorage.setItem(CHOICE_KEY, avecLeSon ? "on" : "off");
    } catch {}
    window.dispatchEvent(new CustomEvent(SOUND_CHOICE_EVENT, { detail: { on: avecLeSon } }));
    setVisible(false);
  };

  return (
    <div className={styles.soundChoice} role="group" aria-label={label.choiceLabel}>
      <button type="button" className={styles.soundChoiceButton} onClick={() => choisir(true)}>
        {label.enterWith}
      </button>
      <button type="button" className={styles.soundChoiceButton} onClick={() => choisir(false)}>
        {label.enterWithout}
      </button>
    </div>
  );
}
