/**
 * LES TROIS COUCHES (02/11/2026). Design :
 * docs/superpowers/specs/2026-11-02-trois-couches-design.md.
 *
 * Trois mediums par lesquels le site se presente : la scene (WebGL),
 * l'amatl (SVG, repli 2D), la parole (le document sr-only existant).
 * Cette regle dit laquelle des deux premieres s'ouvre a l'arrivee ; la
 * parole n'est jamais un defaut, elle est toujours a un geste.
 *
 * Pure : ne touche a rien du document. La detection (WebGL, connexion,
 * mouvement reduit) vit dans couche-store.ts (tache 2) -- meme separation
 * que theme.ts (pur) / theme-store.ts (impur).
 */
export type Couche = "scene" | "amatl" | "parole";

/** Meme nommage que THEME_STORAGE_KEY : les deux controles de la meme
 *  famille se rangent au meme endroit. */
export const COUCHE_STORAGE_KEY = "nahual-couche";
/** Evenement fenetre a chaque changement de couche : `detail.couche`. */
export const COUCHE_EVENT = "nahual:couche";

const COUCHES: readonly Couche[] = ["scene", "amatl", "parole"];

export function parseStoredCouche(raw: string | null | undefined): Couche | null {
  return COUCHES.includes(raw as Couche) ? (raw as Couche) : null;
}

export type CoucheContexte = {
  /** `matchMedia("(prefers-reduced-motion: reduce)").matches`. */
  prefersReducedMotion: boolean;
  /** Un contexte WebGL (1 ou 2) a pu etre cree sur cette machine. */
  webglDisponible: boolean;
  /** `navigator.connection.saveData` ou `effectiveType` slow-2g/2g -- meme
   *  lecture que `prelectureBienvenue` (stag-scene/mount-for-direction.tsx). */
  connexionDegradee: boolean;
};

/**
 * La couche d'ouverture. Le WebGL absent l'emporte sur tout : sans lui,
 * rien d'autre n'a de sens a verifier.
 */
export function coucheParDefaut(contexte: CoucheContexte): Couche {
  if (!contexte.webglDisponible) return "amatl";
  if (contexte.prefersReducedMotion) return "amatl";
  if (contexte.connexionDegradee) return "amatl";
  return "scene";
}

/**
 * La couche a l'ouverture : le choix memorise, sinon la regle par defaut.
 * Le choix manuel PERSISTE (decision du 02/11), comme la face du monde.
 *
 * Deux regles, et leur difference est le coeur de cette fonction :
 *
 *  - **une preference se respecte** : un choix memorise gagne sur le
 *    mouvement reduit et sur la connexion degradee. C'est la regle du
 *    depot, deja ecrite dans lib/reduced-motion.ts le 09/09 -- « une
 *    demande explicite gagne sur une preference generale ; c'est vrai ici
 *    comme partout ailleurs » ;
 *  - **une impossibilite ne se discute pas** : la scene memorisee sur une
 *    machine sans WebGL retombe sur l'amatl, sinon on ouvrirait sur une
 *    couche que rien ne peut rendre, c'est-a-dire sur une page vide. La
 *    parole et l'amatl, eux, ne demandent rien a la machine et restent
 *    honores quoi qu'il arrive.
 *
 * Une valeur de stockage abimee se traite comme une absence (parseStoredCouche
 * rend null), jamais comme une erreur : on n'echoue pas sur un localStorage
 * que n'importe qui peut editer.
 */
export function coucheInitiale(stocke: string | null | undefined, contexte: CoucheContexte): Couche {
  const choix = parseStoredCouche(stocke);
  if (!choix) return coucheParDefaut(contexte);
  if (choix === "scene" && !contexte.webglDisponible) return coucheParDefaut(contexte);
  return choix;
}

/**
 * `coucheInitiale` RECOPIEE EN UNE LIGNE DE JAVASCRIPT BRUT, pour le script
 * inline du layout. Elle doit etre posee sur <html> AVANT le premier paint,
 * sinon on voit un eclair de la mauvaise couche a chaque chargement -- meme
 * raison que le script de la face (voir THEME_STORAGE_KEY).
 *
 * ⚠️ C'est une DUPLICATION de la regle ci-dessus, et elle est assumee : ce
 * script tourne avant tout module, il ne peut donc rien importer. Elle vit
 * ici, collee a l'original, pour qu'une derive se voie ; et c'est
 * `tests/e2e/couche-degradation.spec.ts` qui garde les deux d'accord, en
 * lisant l'attribut rendu dans un vrai navigateur sous chaque condition
 * (sept cas, vus rouges avant que ce script existe).
 *
 * Elle est dans la lib et non dans le layout parce que ce dernier est au
 * plafond du cliquet de lignes -- meme parade que CSS_SANS_JAVASCRIPT le
 * 28/10.
 */
export const SCRIPT_COUCHE_AVANT_PAINT = `
try{var c=localStorage.getItem(${JSON.stringify(COUCHE_STORAGE_KEY)});var g=false;try{var cv=document.createElement("canvas");g=!!(cv.getContext("webgl2")||cv.getContext("webgl"));}catch(e){}var cn=navigator.connection,d=!!cn&&(!!cn.saveData||cn.effectiveType==="slow-2g"||cn.effectiveType==="2g"),r=matchMedia("(prefers-reduced-motion: reduce)").matches,v=c==="scene"||c==="amatl"||c==="parole"?c:null,o=v&&!(v==="scene"&&!g)?v:(!g||r||d?"amatl":"scene");document.documentElement.setAttribute("data-couche",o);}catch(e){document.documentElement.setAttribute("data-couche","amatl");}
`;
