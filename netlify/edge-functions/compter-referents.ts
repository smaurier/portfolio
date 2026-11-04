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

const HOTE_DU_SITE = "nahual.fr";

export default async function compterReferents(requete: Request, contexte: Context) {
  try {
    const hote = hoteReferent(requete.headers.get("referer"), HOTE_DU_SITE);
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
