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
export const codexStore: { amount: number; front: number; sign: 1 | -1; x: number; y: number } = {
  amount: 0,
  front: 0,
  sign: 1,
  x: 0,
  y: 0,
};
