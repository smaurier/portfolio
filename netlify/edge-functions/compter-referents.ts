import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/edge-functions";
import { cheminCompte, cleDuJour, hoteReferent, paysCompte } from "../../src/lib/referents.ts";

/**
 * Compte trois totaux quotidiens, au bord, sans rien poser dans la page.
 *
 * CE QU'ELLE COMPTE, et c'est exactement ce que la page vie privee annonce
 * depuis le 05/11/2026 : le domaine d'ou vient la personne si elle a suivi
 * un lien, son pays, et la page sur laquelle elle arrive. Trois totaux par
 * jour, rien d'autre.
 *
 * CE QU'ELLE NE FAIT PAS, et c'est le point : aucun script envoye au
 * navigateur, aucun cookie, aucune adresse IP, aucun identifiant, aucun
 * parcours d'une page a l'autre, aucune distinction entre deux personnes.
 * Des pages vues, pas des visiteurs.
 *
 * ⛔ ET DE LA GEOLOCALISATION, LE PAYS SEUL. Netlify offre aussi la ville,
 * le code postal et les coordonnees (`contexte.geo`) : les compter ferait
 * basculer un total anonyme dans un autre registre, et rendrait fausse la
 * phrase qu'on vient d'ecrire.
 *
 * ELLE NE DOIT JAMAIS EMPECHER UNE PAGE DE S'AFFICHER. Tout est dans un
 * `try` : une panne de Blobs, un quota, une cle illisible, et le visiteur
 * recoit sa page comme si de rien n'etait. Un compteur n'est pas un service.
 */

/**
 * LES NOMS DE CE SITE, ET POURQUOI IL Y EN A PLUSIEURS.
 *
 * `nahual-studio` sert la meme application sous `nahual.fr`, sous ses alias
 * `sylvainmaurier.com` et `www.sylvainmaurier.com`, sous son adresse
 * Netlify, et sous une URL unique par deploiement. Une seule de ces formes
 * etait connue du compteur : le 05/11 il annoncait 122 venues en un jour
 * depuis `sylvainmaurier.com`, qui n'etaient que des navigations internes.
 *
 * ⭐ L'HOTE DE LA REQUETE EST AJOUTE A L'EXECUTION, et c'est lui qui rend la
 * regle solide : quel que soit le nom par lequel on arrive, connu ou non,
 * naviguer dedans ne compte jamais. La liste en dur ne rattrape que les
 * passages d'un de nos noms a un autre.
 */
const NOS_DOMAINES = ["nahual.fr", "sylvainmaurier.com", "nahual-studio.netlify.app"];

export default async function compterReferents(requete: Request, contexte: Context) {
  try {
    const url = new URL(requete.url);
    const hote = hoteReferent(requete.headers.get("referer"), [url.hostname, ...NOS_DOMAINES]);

    // LES TROIS MESURES ANNONCEES PAR LA PAGE VIE PRIVEE, et rien de plus.
    // Le pays et la page sont comptes a CHAQUE arrivee ; le referent
    // seulement quand il y en a un. La somme des pages est donc le nombre
    // de pages vues, ce que le seul compteur de referents ne disait pas.
    const travaux = [
      incrementer("referents-pages", cheminCompte(url.pathname)),
      incrementer("referents-pays", paysCompte(contexte.geo?.country?.code)),
    ];
    if (hote) travaux.push(incrementer("referents", hote));

    const compter = Promise.all(travaux);
    // `waitUntil` laisse la page partir sans attendre l'ecriture. S'il
    // n'existe pas dans ce runtime, on attend : mieux vaut quelques
    // millisecondes que de perdre le compte en silence.
    if (typeof contexte.waitUntil === "function") contexte.waitUntil(compter);
    else await compter;
  } catch {
    // Volontairement muet : voir l'en-tete du fichier.
  }

  return contexte.next();
}

/**
 * TROIS MAGASINS, PAS TROIS PREFIXES DANS UN SEUL. Chaque cle garde la
 * forme `jour/valeur`, donc `clesPerimees` et la lecture marchent sur les
 * trois sans rien changer, et le relevé deja ecrit n'a pas a migrer.
 */
async function incrementer(magasin: string, valeur: string): Promise<void> {
  const store = getStore(magasin);
  const cle = cleDuJour(valeur, new Date());

  // LA LECTURE DOIT ETRE EN COHERENCE FORTE. Par defaut Blobs lit en
  // coherence eventuelle, et rend `null` sur une valeur ecrite quelques
  // instants plus tot : mesure le 04/11/2026 sur un site de sonde, trois
  // appels d'affilee ont relu `null` pendant que les ecritures passaient.
  // Un compteur bati sur la lecture par defaut reste bloque a 1 pour
  // toujours, sans jamais lever d'erreur.
  const avant = Number((await store.get(cle, { consistency: "strong" })) ?? 0);
  await store.set(cle, String(avant + 1));
}

/**
 * Seulement les pages. Les ressources (modeles, images, polices, fichiers du
 * build) n'ont rien a apprendre sur la provenance et multiplieraient les
 * invocations par dix.
 */
export const config: Config = {
  path: "/*",
  excludedPath: ["/_next/*", "/models/*", "/sky/*", "/env/*", "/img/*", "/fonts/*", "/*.ico", "/*.svg", "/*.png", "/*.jpg", "/*.webp", "/*.glb", "/*.hdr", "/*.json", "/*.xml", "/*.txt"],
};
