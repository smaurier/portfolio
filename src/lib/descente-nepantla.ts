/**
 * LA DESCENTE VERS LA NUIT, AU MOMENT DU PASSAGE (16/09).
 *
 * Decision de Sylvain : « on doit remonter absolument tout en haut lorsqu'on
 * arrive sur une nouvelle scene, sinon tout se joue lorsqu'on arrive ».
 *
 * CE QUE CA RENVERSE. Depuis le 28/08, le defilement etait conserve d'une
 * page a l'autre, et `scene-refs-context` le disait en toutes lettres :
 * « l'utilisateur qui navigue en interne ne veut pas repartir de zero a
 * chaque nav, il veut voir la scene continue de la nouvelle direction ».
 * L'argument qui l'emporte est narratif : chaque direction porte un arc
 * complet, de la penombre aux chemins reveles. Arriver au milieu de cet
 * arc, c'est arriver quand tout est deja joue.
 *
 * POURQUOI UNE DESCENTE ET PAS UNE REMISE A ZERO SECHE. Une remise a zero
 * seche ne peut tomber qu'a un seul endroit sans faire clignoter : ni avant
 * le commit (l'ancienne direction serait rendue une image a sa nuit), ni
 * apres (la nouvelle serait rendue une image a l'ancienne profondeur).
 * C'est exactement le creux mesure le 15/09, une image au noir entre deux
 * etats eclaires.
 *
 * Une descente n'a pas ce probleme : elle n'a pas d'instant. Le defilement
 * glisse vers zero PENDANT le tour de camera, donc l'ancienne direction
 * redescend vers sa nuit pendant que le monde tourne, et la nouvelle
 * arrive a sa nuit a elle. Le passage devient ce qu'il raconte : on
 * redescend dans la nuit pour changer de direction.
 *
 * ET CA EN REGLE UNE AUTRE, gratuitement. La marche mesuree le 16/09
 * venait de `mount-for-direction`, qui rend `<group visible={visible}>` :
 * le monde qui arrive s'allume en une image quand ses shaders ont fini de
 * chauffer. A l'arrivee a la nuit, `getRevealFloor(0)` vaut zero et la
 * scene est a son plus sombre : la bascule a lieu dans le noir, la ou elle
 * ne se voit pas.
 */

/** Ce qu'il faut d'un moteur de defilement lisse pour mener la descente. */
export type MoteurDefilement = {
  scrollTo: (cible: number, options?: { duration?: number; immediate?: boolean; force?: boolean }) => void;
};

export type ContexteDescente = {
  /** Le moteur lisse, s'il est monte (il ne l'est pas en mouvement reduit). */
  moteur: MoteurDefilement | null;
  /** Le repli quand il n'y en a pas : `window.scrollTo`. */
  sansMoteur: (y: number) => void;
  /** Deja en haut : inutile de jouer quoi que ce soit. */
  defilement: number;
  /** Mouvement reduit : on se pose en haut, sans glissade. */
  mouvementReduit: boolean;
};

/**
 * Mene la descente. Retourne ce qui a ete fait, pour que les tests puissent
 * le lire sans navigateur.
 */
export function descendreVersLaNuit(ctx: ContexteDescente, duree: number): "rien" | "immediat" | "glisse" {
  if (ctx.defilement <= 0) return "rien";
  if (ctx.mouvementReduit || !ctx.moteur) {
    // Sans moteur lisse, `window.scrollTo` saute : c'est le bon
    // comportement en mouvement reduit, et le seul possible sinon.
    if (ctx.moteur) ctx.moteur.scrollTo(0, { immediate: true, force: true });
    else ctx.sansMoteur(0);
    return "immediat";
  }
  // `force` : Lenis refuse de bouger pendant qu'il est arrete ou verrouille,
  // et la classe `nahual-transitioning` peut poser l'un ou l'autre.
  ctx.moteur.scrollTo(0, { duration: duree, force: true });
  return "glisse";
}

/**
 * LA GARANTIE, parce que la glissade seule ne suffit pas.
 *
 * Mesure du 16/09 : partie de 1 080 pixels sur une descente de 0,95 s, la
 * glissade s'arretait a 418. Ce n'est pas un plafond de page (Contact
 * defile sur 2 797), c'est l'animation de Lenis qui est interrompue quelque
 * part pendant le remplacement du contenu. La cause exacte n'est pas
 * etablie, et elle n'a pas besoin de l'etre pour que l'invariant tienne :
 * on redemande la descente au commit, puis on se pose franchement a la fin
 * du passage s'il reste quoi que ce soit.
 *
 * L'ordre compte. Au commit, une glissade : le monde est encore en
 * mouvement et un saut se verrait. A la toute fin, un saut : l'arc y est
 * deja bas, le residu est petit, et l'invariant de Sylvain doit tenir
 * meme quand tout le reste a echoue.
 */
export function garantirLeHaut(ctx: ContexteDescente): boolean {
  if (ctx.defilement <= 0) return false;
  if (ctx.moteur) ctx.moteur.scrollTo(0, { immediate: true, force: true });
  else ctx.sansMoteur(0);
  return true;
}
