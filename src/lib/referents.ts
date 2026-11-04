/**
 * Compteur de sites referents : la logique pure, sans Netlify ni Blobs, pour
 * qu'elle soit tenue par des tests plutot que par un deploiement.
 *
 * POURQUOI CE FICHIER EXISTE. Le site ne mesure rien et le dit : sa page vie
 * privee promet, en trois langues, « pas de cookies de tracage ni d'outils
 * d'analyse tiers (pas de Google Analytics, pas de Meta Pixel) ». Poser un
 * script de mesure rendrait cette phrase fausse sur le site qui vend du
 * serieux en accessibilite. Mais Sylvain veut savoir si Mexicolore lui envoie
 * du monde (lien pose le 27/10 sur leur page `mexica-teachers`).
 *
 * LA SORTIE CHOISIE : compter cote serveur, au bord, le DOMAINE d'ou vient la
 * requete, et rien d'autre. Aucun script dans la page, aucun cookie, aucune
 * adresse IP, aucun chemin, aucune personne. Un total par domaine et par
 * jour. La promesse reste vraie au mot pres, et il n'y a pas de donnee
 * personnelle a declarer.
 */

/**
 * Le domaine a retenir d'un en-tete `Referer`, ou `null` si rien ne doit
 * etre compte.
 *
 * `hoteDuSite` est le domaine du site lui-meme (sans `www`) : il sert a
 * ecarter les navigations internes, qui ne sont pas des venues.
 */
export function hoteReferent(referer: string | null, hoteDuSite: string): string | null {
  if (!referer || referer.trim() === "") return null;

  let url: URL;
  try {
    url = new URL(referer);
  } catch {
    // Un `Referer` illisible n'est pas une erreur a remonter : c'est une
    // requete qu'on ne compte pas, et la page doit etre servie quand meme.
    return null;
  }

  // Seul le web compte. Un `file:` ou un `data:` n'a pas d'hote, et un
  // `javascript:` n'est pas une provenance.
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const hote = sansWww(url.hostname.toLowerCase());
  if (hote === "") return null;

  // Le site lui-meme et ses sous-domaines (le wiki) sont a nous : les
  // compter noierait les vrais referents sous notre propre trafic.
  const nous = sansWww(hoteDuSite.toLowerCase());
  if (hote === nous || hote.endsWith(`.${nous}`)) return null;

  return hote;
}

function sansWww(hote: string): string {
  return hote.startsWith("www.") ? hote.slice(4) : hote;
}

/**
 * La cle sous laquelle un domaine est compte, decoupee par jour UTC.
 *
 * Le decoupage par jour n'est pas qu'un confort de lecture : lire-puis-ecrire
 * n'est pas atomique dans Blobs, donc deux visites simultanees peuvent se
 * marcher dessus. Une cle par jour borne la casse a la journee en cours et
 * laisse l'historique intact.
 */
export function cleDuJour(hote: string, quand: Date): string {
  return `${quand.toISOString().slice(0, 10)}/${hote}`;
}
