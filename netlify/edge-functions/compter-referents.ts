import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/edge-functions";
import { cleDuJour, hoteReferent } from "../../src/lib/referents.ts";

/**
 * Compte les sites referents, au bord, sans rien poser dans la page.
 *
 * CE QU'ELLE NE FAIT PAS, et c'est le point : aucun script envoye au
 * navigateur, aucun cookie, aucune adresse IP, aucun chemin, aucun identifiant
 * de visiteur. Elle lit l'en-tete `Referer` que le navigateur envoie de toute
 * facon, n'en garde que le domaine, et incremente un total par domaine et par
 * jour. La phrase de la page vie privee (« pas de cookies de tracage ni
 * d'outils d'analyse tiers ») reste vraie au mot pres.
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
    const nosHotes = [new URL(requete.url).hostname, ...NOS_DOMAINES];
    const hote = hoteReferent(requete.headers.get("referer"), nosHotes);
    if (hote) {
      const compter = incrementer(hote);
      // `waitUntil` laisse la page partir sans attendre l'ecriture. S'il
      // n'existe pas dans ce runtime, on attend : mieux vaut quelques
      // millisecondes que de perdre le compte en silence.
      if (typeof contexte.waitUntil === "function") contexte.waitUntil(compter);
      else await compter;
    }
  } catch {
    // Volontairement muet : voir l'en-tete du fichier.
  }

  return contexte.next();
}

async function incrementer(hote: string): Promise<void> {
  const store = getStore("referents");
  const cle = cleDuJour(hote, new Date());

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
