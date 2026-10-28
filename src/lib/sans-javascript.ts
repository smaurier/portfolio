/**
 * LA FEUILLE DU VISITEUR SANS JAVASCRIPT (09/09, nommee et sortie du
 * layout le 28/10).
 *
 * Teste le 08/09 : le site n'est pas noir sans JavaScript, 98 Ko de HTML
 * sont bien servis et tout le texte est dans le DOM. Mais on ne
 * franchissait JAMAIS le voile, parce que `data-loaded` est pose par le
 * client, et tout le texte revele restait a opacite 0, parce que sa classe
 * de revelation vient d'un IntersectionObserver. Le visiteur restait
 * devant un ecran de chargement definitif, avec le contenu invisible
 * derriere. Pour la vitrine d'un futur auditeur RGAA, c'est un point de
 * credibilite autant que d'ergonomie : la degradation gracieuse est
 * precisement ce qu'il aura a prescrire.
 *
 * LA REGLE DE CES REGLES : chacune neutralise un masquage qu'un visiteur
 * AVEC JavaScript verrait lever a la premiere image. Aucune ne cache quoi
 * que ce soit, aucune ne coute rien a qui a JavaScript -- le `<noscript>`
 * ne s'applique qu'a lui seul. Les masquages viennent tous de styles en
 * ligne ou de classes posees par le client, d'ou le `!important` : une
 * feuille l'emporte alors sur un style en ligne.
 *
 * Les cibles sont des attributs et des classes GLOBALES, jamais un nom de
 * module CSS : ceux-la sont haches, on ne peut pas les viser d'ici.
 *
 * Son oracle : tests/e2e/sans-javascript.spec.ts, qui charge la page avec
 * `javaScriptEnabled: false` et verifie que le voile s'efface, que les
 * mots reveles sont lisibles et que le chant -- le temoin du contenu --
 * est visible.
 */
export const CSS_SANS_JAVASCRIPT = `
  /* LE VOILE. Cible par data-veil et non par sa classe (hachee). */
  [data-veil] { display: none !important; }

  /* LES MOTS REVELES. Ils partent a opacite 0 et ne sont montres que par
     une classe posee en JavaScript : sans lui, les titres et les lignes de
     chapitre etaient invisibles. */
  [data-reveal-word] { opacity: 1 !important; transform: none !important; }

  /* LE CHANT (28/10). Depuis la partition du texte (11/10), le chant vit
     dans un BlocEnFlux dont l'opacite suit sa fenetre (0,32 -> 0,50) : le
     HTML servi porte donc visibility: hidden en style en ligne -- pose
     expres, c'est la parade au flash du 19/08. Sans JavaScript aucune
     image ne passe, donc rien ne le relevait, et le chant est justement le
     temoin sans JS depuis que le paragraphe du hero est parti.
     Meme regle que body.reading-mode .blocEnFlux : un bloc EN flux garde
     sa place, il se lit. Cible la classe et non [data-bloc], qui
     emporterait aussi les chapitres du calque fixe -- eux empiles en
     colonne, et deja invisibles sans JS avant la partition. */
  .blocEnFlux { opacity: 1 !important; visibility: visible !important; pointer-events: auto !important; }
`;
