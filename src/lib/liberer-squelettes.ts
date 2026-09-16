import type { Object3D, Skeleton, SkinnedMesh } from "three";

/**
 * LIBERER LES SQUELETTES D'UNE FIGURE DEMONTEE (16/09).
 *
 * three donne a chaque `Skeleton` une TEXTURE D'OS : une image ou il ecrit
 * une matrice par os, et qu'il televerse a chaque image. Sa taille suit le
 * nombre d'os (`Skeleton.computeBoneTexture`, r185) : soixante-deux os
 * tiennent dans 16 x 16 pixels.
 *
 * Comme toute ressource graphique, elle ne part que sur `dispose()`. Le
 * ramasse-miettes de JavaScript peut bien reprendre le squelette d'une
 * porteuse partie, sa texture d'os, elle, reste sur la carte.
 *
 * Mesure du 16/09, cinq tours des cinq directions en cliquant (la toile
 * survit aux changements de page) : le compte de textures montait de TREIZE
 * par tour, sans jamais redescendre, et les orphelines etaient toutes des
 * 16 x 16. Quarante et une apres cinq tours.
 *
 * CE QUE CA PESE, ET POURQUOI ON LE CORRIGE QUAND MEME : une texture d'os
 * de 16 x 16 fait un kilo-octet. Treize par tour, c'est treize kilo-octets,
 * une paille a cote des 114 Mo de textures d'une page de bureau. Ce n'est
 * donc pas la memoire qui commande ici, c'est que le compte MONTE SANS FIN :
 * une visite longue finit par des milliers d'objets graphiques, et c'est le
 * genre de derive qui se paie d'un coup, en perte de contexte WebGL, sur un
 * telephone dont la memoire graphique est serree. Le vrai poids, lui, etait
 * ailleurs : sept copies de la photographie de ciel, 48 Mo (voir sud-sky).
 *
 * CE QU'ON NE LIBERE PAS, et c'est la meme regle que `use-libere` : un
 * squelette qu'on n'a pas fabrique. `SkeletonUtils.clone` en cree de
 * nouveaux, donc le composant qui clone les possede ; un composant qui rend
 * directement la scene du cache de `useGLTF`, lui, n'en possede aucun, et
 * les liberer casserait le modele pour tous les suivants.
 *
 * Plusieurs maillages d'une meme figure partagent souvent un squelette
 * (voir `share-skeletons`) : on ne le libere qu'une fois, d'ou l'ensemble.
 */
export function libererSquelettes(root: Object3D): number {
  const vus = new Set<Skeleton>();
  root.traverse((o) => {
    const mesh = o as SkinnedMesh;
    if (!mesh.isSkinnedMesh || !mesh.skeleton) return;
    vus.add(mesh.skeleton);
  });
  for (const sk of vus) sk.dispose();
  return vus.size;
}
