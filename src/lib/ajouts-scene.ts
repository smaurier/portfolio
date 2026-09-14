import type { Object3D } from "three";

/**
 * SAVOIR SI UN OBJET A PU APPARAITRE DANS LA SCENE (14/09).
 *
 * La chauffe des shaders doit attraper tout objet nouveau AVANT le rendu
 * qui le montrerait, sinon c'est le rendu qui compile son programme, en
 * synchrone (mesure du 11/09 : le rig du serpent, un programme ne au rendu
 * a 15 % de l'arc a Projets). Elle s'en assurait en parcourant la scene
 * entiere a chaque image, DEUX fois : une dans sa boucle d'image, une dans
 * `scene.onBeforeRender`.
 *
 * Ce parcours ne s'arretait jamais. Mesure du 14/09, Contact, Pixel 7 au
 * processeur divise par quatre : 856 objets dans la scene, et `traverse`
 * pese 3,3 % des echantillons a lui seul, pour ne rien trouver la quasi
 * totalite du temps.
 *
 * Or three previent : `Object3D.add` et `Object3D.attach` emettent
 * `childadded` SUR LE PARENT (verifie a la source de r185, Object3D.js).
 * Il suffit donc d'ecouter chaque objet qu'on a deja vu : tant que
 * personne n'a rien ajoute sous eux, il n'y a rien a trouver, et le
 * parcours peut ne pas avoir lieu.
 *
 * LE CONTRAT, et il est strict : un balayage doit appeler `surveiller` sur
 * TOUT ce qu'il traverse. Un objet non surveille est un trou par lequel un
 * sous-arbre entier peut entrer sans reveiller personne. En echange, un
 * sous-arbre monte a l'ecart puis accroche (Suspense) reveille le suivi au
 * moment de l'accrochage, ce qui suffit : le balayage qui suit le trouvera
 * en entier.
 */
export type SuiviAjouts = {
  /** Un balayage complet est-il du ? */
  sale: () => boolean;
  /** A appeler sur chaque objet traverse par un balayage. */
  surveiller: (o: Object3D) => void;
  /** A appeler une fois le balayage complet termine. */
  marquerPropre: () => void;
  /** Combien d'objets sont sous surveillance. */
  taille: () => number;
};

export function creerSuiviAjouts(): SuiviAjouts {
  // Sale a la naissance : rien n'a encore ete vu, donc tout est nouveau.
  let sale = true;
  let taille = 0;
  // Faible : un objet retire de la scene et oublie ailleurs doit pouvoir
  // etre ramasse. L'ecouteur, lui, est porte par l'objet lui-meme, donc il
  // part avec lui.
  const vus = new WeakSet<Object3D>();
  const salir = () => {
    sale = true;
  };

  return {
    sale: () => sale,
    marquerPropre: () => {
      sale = false;
    },
    taille: () => taille,
    surveiller: (o: Object3D) => {
      if (vus.has(o)) return;
      vus.add(o);
      taille += 1;
      o.addEventListener("childadded", salir);
    },
  };
}
