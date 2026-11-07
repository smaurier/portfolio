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
 * `nosHotes` liste TOUT ce qui sert ce site : l'hote de la requete en cours,
 * plus les domaines connus. Il sert a ecarter les navigations internes, qui
 * ne sont pas des venues.
 *
 * ⛔ POURQUOI UNE LISTE, ET PAS UN SEUL DOMAINE. Le 05/11/2026 le compteur
 * annoncait 122 venues en un jour depuis `sylvainmaurier.com`. Ce n'etait
 * pas un trafic : c'est un ALIAS du meme site Netlify (`domain_aliases` de
 * `nahual-studio`), donc la meme application sous un autre nom, et chaque
 * navigation interne y ressortait comme un referent exterieur. Un site a
 * autant de noms qu'on lui en donne, et ils changent sans que le code le
 * sache : l'appelant passe l'hote de la requete, qui est toujours juste.
 */
export function hoteReferent(referer: string | null, nosHotes: readonly string[]): string | null {
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

  // Le site lui-meme, ses alias, ses sous-domaines (le wiki) et ses URL de
  // deploiement sont a nous : les compter noierait les vrais referents sous
  // notre propre trafic.
  if (nosHotes.some((n) => estANous(hote, sansWww(n.toLowerCase())))) return null;

  return hote;
}

/**
 * Vrai si `hote` est le domaine `nous`, un de ses sous-domaines, ou une URL
 * unique de deploiement Netlify.
 *
 * ⚠️ LES TROIS FORMES, ET POURQUOI LA TROISIEME EXISTE. Netlify sert chaque
 * deploiement a `<identifiant>--<site>.netlify.app` : un DOUBLE TIRET, pas
 * un point. Ce n'est donc pas un sous-domaine, et la regle du point seule
 * les laissait passer (mesure du 05/11 : 7 et 5 venues fantomes).
 *
 * ⛔ Et la comparaison se fait sur une FRONTIERE, jamais sur un `includes` :
 * `nahual.fr.exemple.org` et `pas-nahual.fr` ne sont pas a nous.
 */
function estANous(hote: string, nous: string): boolean {
  return hote === nous || hote.endsWith(`.${nous}`) || hote.endsWith(`--${nous}`);
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

/** Un site referent et le nombre de venues qu'on lui doit. */
export interface Ligne {
  readonly hote: string;
  readonly venues: number;
}

/**
 * Separe ce qui vient d'ailleurs de ce qui vient de nous.
 *
 * ⚠️ POURQUOI LE SECOND GROUPE EXISTE AU LIEU D'ETRE JETE. Le compteur a
 * tourne du 04 au 05/11 sans connaitre les alias du site : 136 venues
 * comptees, 136 a nous. Les cles etant par jour, ce passe n'est pas
 * reecrit. Le ranger a part le rend lisible sans mentir ; le cacher
 * laisserait un total faux pour toujours en tete de page.
 *
 * Les deux listes sortent du plus envoyeur au moins.
 */
export function classerReferents(
  lignes: readonly Ligne[],
  nosHotes: readonly string[],
): { exterieurs: Ligne[]; notres: Ligne[] } {
  const aNous = (hote: string) =>
    nosHotes.some((n) => estANous(sansWww(hote.toLowerCase()), sansWww(n.toLowerCase())));
  const parVenues = (a: Ligne, b: Ligne) => b.venues - a.venues;

  return {
    exterieurs: lignes.filter((l) => !aNous(l.hote)).sort(parVenues),
    notres: lignes.filter((l) => aNous(l.hote)).sort(parVenues),
  };
}

/** Un an : la duree annoncee par la page vie privee. */
export const JOURS_GARDES = 365;

/**
 * Les cles a effacer, parce qu'elles ont depasse la duree annoncee.
 *
 * ⛔ UNE DUREE ECRITE ET JAMAIS APPLIQUEE EST PIRE QUE PAS DE DUREE : elle
 * est verifiable, et fausse. La page vie privee dit « les totaux quotidiens
 * sont effaces au bout d'un an » depuis le 05/11/2026 ; cette fonction est
 * ce qui rend la phrase vraie.
 *
 * ⚠️ UNE CLE QU'ON NE SAIT PAS DATER N'EST PAS EFFACEE. Supprimer sur un
 * doute, c'est perdre une donnee pour une erreur de format : on prefere
 * garder une ligne illisible qu'en jeter une bonne.
 */
export function clesPerimees(
  cles: readonly string[],
  aujourdHui: Date,
  joursGardes: number = JOURS_GARDES,
): string[] {
  const limite = Date.UTC(aujourdHui.getUTCFullYear(), aujourdHui.getUTCMonth(), aujourdHui.getUTCDate()) - joursGardes * 864e5;

  return cles.filter((cle) => {
    const jour = cle.split("/")[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(jour)) return false;
    const quand = Date.parse(`${jour}T00:00:00Z`);
    return Number.isFinite(quand) && quand < limite;
  });
}

/** Longueur au-dela de laquelle un chemin n'apprend plus rien. */
const CHEMIN_MAX = 120;

/**
 * La page d'arrivee, reduite a ce qui s'agrege.
 *
 * ⛔ NI REQUETE NI FRAGMENT. Un `?token=` ou un `#ancre` transformerait un
 * compteur de pages en journal de parametres, donc en donnee sur quelqu'un.
 * La page vie privee promet le contraire : on garde le chemin, rien d'autre.
 */
export function cheminCompte(pathname: string): string {
  const nu = (pathname.split("?")[0].split("#")[0] || "").toLowerCase().replace(/^\/+/, "").replace(/\/+$/, "");
  return nu === "" ? "(accueil)" : nu.slice(0, CHEMIN_MAX);
}

/**
 * Le code pays, en majuscules, ou `(inconnu)`.
 *
 * ⚠️ ON NE DEVINE PAS UN PAYS ABSENT. Une ligne « inconnu » est un fait ;
 * un pays suppose est un faux qui se lit comme une mesure.
 *
 * ⛔ Et c'est TOUT ce qu'on prend de la geolocalisation. Netlify offre
 * aussi la ville, le code postal et les coordonnees : les compter ferait
 * basculer un total anonyme dans un autre registre.
 */
export function paysCompte(code: string | undefined | null): string {
  return code && /^[a-z]{2}$/i.test(code) ? code.toUpperCase() : "(inconnu)";
}

/**
 * Vrai si la requete a reellement abouti sur une PAGE du site.
 *
 * ⛔ NE DE QUATRE JOURS DE MESURE EN PRODUCTION (07/11/2026). Sur 497 pages
 * distinctes comptees, 381 etaient des SONDES DE ROBOTS cherchant des
 * secrets exposes : `wp-admin/install.php`, `.env`, `.git/config`,
 * `.env.production`... Elles recoivent toutes un 404, mais elles etaient
 * comptees, et le total de 1104 « pages vues » ne mesurait donc pas des
 * lecteurs. Pire, le magasin gagnait une cle par URL sondee et par jour,
 * sans fin.
 *
 * ⭐ LE TYPE PLUTOT QU'UNE LISTE D'EXTENSIONS. Verifier le seul code 200
 * laisserait passer `manifest.webmanifest` et `apple-icon`, servis avec
 * succes et comptes a 17 et 5 venues. Une page, c'est du HTML : ce critere
 * ecarte les sondes ET les ressources, et il n'y a aucune liste a tenir a
 * jour quand une ressource nouvelle apparait.
 *
 * ⚠️ Et il refuse quand le type manque, plutot que de supposer.
 */
export function estUnePageServie(statut: number, typeContenu: string | null): boolean {
  return statut === 200 && (typeContenu ?? "").toLowerCase().includes("text/html");
}
