/**
 * LA PROFONDEUR DE PAGE, LUE UNE FOIS AU LIEU DE SOIXANTE (16/09).
 *
 * Cinq composants calculaient, chacun dans sa boucle par image :
 *
 *   const denom = document.documentElement.scrollHeight - window.innerHeight;
 *   const depth = denom > 0 ? Math.min(1, window.scrollY / denom) : 1;
 *
 * Ces trois lectures dependent toutes de la mise en page, et une boucle
 * d'animation tourne AVANT que le navigateur l'ait refaite : repondre
 * exige donc de la recalculer sur-le-champ, a chaque image et par appelant.
 * L'un de ces composants pesait 1,85 ms par image sur Contact (Pixel 7,
 * processeur divise par quatre, profil du 16/09) : le premier poste du site,
 * devant les matrices de three. Le commentaire de `stag-mirror` disait
 * « par frame, negligeable » ; le profil dit l'inverse.
 *
 * ET LA PLUS CHERE DES TROIS EST `scrollY`, pas `scrollHeight` : une
 * premiere version ne gardait que le denominateur, et le profil suivant a
 * montre 1,86 ms dans la seule lecture du defilement. D'ou la forme
 * actuelle : le defilement est note dans l'ecouteur `scroll`, ou la mise
 * en page est deja a jour et la lecture gratuite, et la boucle par image
 * ne fait plus que relire une variable.
 *
 * Le denominateur ne change que si la page change de taille. On le relit
 * donc sur `resize`, sur le `ResizeObserver` de la racine (un chapitre qui
 * se deplie change la hauteur sans redimensionner la fenetre), et de toute
 * facon au moins une fois par demi-seconde : meme si les deux signaux nous
 * echappaient, la valeur ne peut pas vieillir davantage.
 *
 * La logique de peremption est separee du DOM (`creerLecteurProfondeur`)
 * parce que les tests de ce depot tournent sans navigateur : c'est le seul
 * moyen de PROUVER que la hauteur n'est plus relue a chaque image, ce qui
 * est tout l'interet du fichier.
 */

/** Combien de temps au maximum on garde un denominateur sans le relire. */
export const PEREMPTION_MS = 500;

/**
 * La part parcourue, entre 0 en haut et 1 en bas. Un denominateur nul ou
 * negatif (page plus courte que la fenetre) vaut 1 : tout est deja vu.
 */
export function calculerProfondeur(scrollY: number, denom: number): number {
  return denom > 0 ? Math.min(1, Math.max(0, scrollY / denom)) : 1;
}

export type SourceProfondeur = {
  /** La hauteur defilable : hauteur du document moins celle de la fenetre. */
  hauteurUtile: () => number;
  /** Le defilement courant. */
  defilement: () => number;
  /** L'horloge, en millisecondes. */
  maintenant: () => number;
};

export type LecteurProfondeur = {
  lire: () => number;
  /** Jette le denominateur garde : la page a change de taille. */
  oublier: () => void;
};

export function creerLecteurProfondeur(source: SourceProfondeur): LecteurProfondeur {
  let denom = -1;
  let luA = -Infinity;
  return {
    lire() {
      const t = source.maintenant();
      if (denom < 0 || t - luA > PEREMPTION_MS) {
        denom = source.hauteurUtile();
        luA = t;
      }
      return calculerProfondeur(source.defilement(), denom);
    },
    oublier() {
      denom = -1;
      luA = -Infinity;
    },
  };
}

let lecteur: LecteurProfondeur | null = null;
let defilementNote = 0;

function brancher(): LecteurProfondeur {
  if (lecteur) return lecteur;
  defilementNote = window.scrollY;
  lecteur = creerLecteurProfondeur({
    hauteurUtile: () => document.documentElement.scrollHeight - window.innerHeight,
    defilement: () => defilementNote,
    maintenant: () => performance.now(),
  });
  const oublier = () => lecteur?.oublier();
  const noter = () => {
    defilementNote = window.scrollY;
  };
  window.addEventListener("scroll", noter, { passive: true });
  window.addEventListener("resize", () => {
    noter();
    oublier();
  }, { passive: true });
  window.addEventListener("orientationchange", () => {
    noter();
    oublier();
  }, { passive: true });
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(oublier).observe(document.documentElement);
  }
  return lecteur;
}

/**
 * Le defilement courant, tel que l'ecouteur `scroll` l'a note.
 *
 * A preferer a `window.scrollY` PARTOUT dans une boucle d'animation ou un
 * `requestAnimationFrame` : la lecture directe y force le navigateur a
 * refaire sa mise en page sur-le-champ, alors qu'un ecouteur `scroll` la
 * trouve deja a jour. Un rappel de `requestAnimationFrame` s'execute apres
 * les ecouteurs `scroll` de la meme image : la valeur rendue ici est donc
 * fraiche, jamais celle de l'image d'avant.
 */
export function defilementPage(): number {
  if (typeof window === "undefined") return 0;
  brancher();
  return defilementNote;
}

/** La profondeur de page, sans forcer la mise en page a chaque image. */
export function profondeurPage(): number {
  if (typeof document === "undefined" || typeof window === "undefined") return 1;
  return brancher().lire();
}
