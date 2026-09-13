/**
 * LE TRACE DU CODEX (13/09, Sylvain : « toute la scene 3d devrait se
 * dessiner comme si elle etait dessinee rapidement par les auteurs du
 * codex »). L'etat partage entre la ceremonie du miroir, qui le remplit
 * une fois par image, et le shader de la scene, qui le lit.
 *
 * `x` et `y` sont en pixels CSS, origine en haut a gauche (convention du
 * DOM) : la conversion vers le repere du fragment se fait la ou elle se
 * fait deja pour la souris (cursor-reveal-scene). Meme pattern que
 * frostStore et refletStore : un objet mute, pas d'etat React.
 */
export const codexStore: { amount: number; front: number; sign: 1 | -1; x: number; y: number; matiere: number } = {
  amount: 0,
  front: 0,
  sign: 1,
  x: 0,
  y: 0,
  /** LA MATIERE DU TRACE (13/09, Sylvain : « dans la transition entre le
   * lightmode et le darkmode, on doit avoir un effet de gravure et non de
   * dessin »). 1 : le papier, ou le trait est d'encre sombre. 0 : la
   * pierre, ou le trait est une INCISION claire, parce que l'entaille est
   * la seule chose qui accroche la lumiere sur un miroir noir. C'est la
   * face d'ARRIVEE qui decide : on dessine le monde ou l'on va. */
  matiere: 1,
};
