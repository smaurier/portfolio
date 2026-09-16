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
 * donc sur `resize`, et de toute facon au moins une fois par demi-seconde :
 * meme si ce signal nous echappait, la valeur ne peut pas vieillir
 * davantage.
 *
 * ET LA LECTURE NE SE FAIT PLUS DANS LA BOUCLE D'IMAGE DU TOUT, ce qui est
 * la correction du soir meme. La premiere version relisait paresseusement,
 * depuis `lire()`, donc depuis le `useFrame` de l'appelant. Sur mobile, le
 * defilement fait apparaitre et disparaitre la barre d'URL, ce qui emet des
 * `resize` : la hauteur etait invalidee en plein arc et relue depuis la
 * boucle. Mesure sur Memoire, en comptant les lectures faites DEPUIS un
 * rappel de `requestAnimationFrame` : vingt et une, la ou l'on en attendait
 * deux par seconde.
 *
 * La hauteur se rafraichit donc dans l'ecouteur `scroll`, ou la mise en page
 * est deja a jour et la lecture gratuite. `lire()` ne touche plus a rien :
 * il ne fait qu'une division. Une profondeur fausse de moins d'une
 * demi-seconde pilote des fondus, personne ne la voit.
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
  /** Ne lit JAMAIS la mise en page : c'est tout l'interet. */
  lire: () => number;
  /** Relit la hauteur si elle a vieilli. A n'appeler que d'un endroit ou la
   *  mise en page est deja a jour, donc d'un ecouteur `scroll` ou `resize`. */
  rafraichir: () => void;
  /** Jette le denominateur garde : la page a change de taille. */
  oublier: () => void;
};

export function creerLecteurProfondeur(source: SourceProfondeur): LecteurProfondeur {
  let denom = -1;
  let luA = -Infinity;
  const relire = () => {
    denom = source.hauteurUtile();
    luA = source.maintenant();
  };
  return {
    lire() {
      // Le tout premier appel n'a rien en reserve : il lit, une fois.
      if (denom < 0) relire();
      return calculerProfondeur(source.defilement(), denom);
    },
    rafraichir() {
      if (denom < 0 || source.maintenant() - luA > PEREMPTION_MS) relire();
    },
    oublier() {
      denom = -1;
      luA = -Infinity;
    },
  };
}

let lecteur: LecteurProfondeur | null = null;
let defilementNote = 0;
let defileA = -Infinity;

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
    defileA = performance.now();
    // La hauteur se relit ICI, dans l'ecouteur, ou la mise en page est deja
    // a jour : la boucle d'image, elle, ne lira plus jamais rien.
    lecteur?.rafraichir();
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
  return lecteur;
}

/**
 * Quand le visiteur a defile pour la derniere fois, en temps de page.
 *
 * Sert a CEDER LE PAS : une tache de fond qui coute vingt millisecondes
 * passe inapercue dans une pause et se voit comme une secousse en plein
 * mouvement. Le meme ecouteur `scroll` la note, donc ca ne coute rien.
 */
export function dernierDefilement(): number {
  if (typeof window === "undefined") return -Infinity;
  brancher();
  return defileA;
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
