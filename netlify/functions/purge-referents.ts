import { getStore } from "@netlify/blobs";
import { clesPerimees, JOURS_GARDES } from "../../src/lib/referents.ts";

/**
 * EFFACE LES TOTAUX DE PLUS D'UN AN, UNE FOIS PAR JOUR.
 *
 * ⛔ CETTE FONCTION EXISTE PARCE QU'UNE PHRASE A ETE ECRITE. Depuis le
 * 05/11/2026 la page vie privee dit, en trois langues : « les totaux
 * quotidiens sont effaces au bout d'un an ». Une duree annoncee et jamais
 * appliquee est pire que pas de duree du tout, parce qu'elle est
 * verifiable. Le texte et son execution partent ensemble, jamais l'un
 * apres l'autre.
 *
 * Elle tourne a 4 h du matin UTC, quand personne ne lit le registre. Les
 * fonctions planifiees sont incluses dans le plan gratuit de Netlify.
 *
 * ⚠️ ELLE NE DOIT JAMAIS EFFACER PAR DEFAUT. Le tri est dans
 * `clesPerimees`, teste a l'unite : une cle qu'on ne sait pas dater reste
 * en place. Perdre une donnee pour une erreur de format serait un plus
 * grand mal que garder une ligne illisible.
 */

export default async function purgerReferents() {
  // LES TROIS MAGASINS, SINON LA PROMESSE NE VAUT QUE POUR UN TIERS DES
  // DONNEES. Oublier un magasin ici serait exactement le genre de defaut
  // silencieux que la page vie privee rend verifiable.
  const magasins = ["referents", "referents-pays", "referents-pages"];
  let vues = 0;
  let effacees = 0;

  for (const nom of magasins) {
    const store = getStore(nom);
    const { blobs } = await store.list();
    vues += blobs.length;
    const aEffacer = clesPerimees(blobs.map((b) => b.key), new Date(), JOURS_GARDES);
    // En serie, pas en parallele : ce travail n'est jamais presse, et une
    // rafale de suppressions sur un stockage partage ne gagne rien.
    for (const cle of aEffacer) await store.delete(cle);
    effacees += aEffacer.length;
  }

  // La sortie est un journal, pas une page : elle n'est lue que dans les
  // journaux de fonction de Netlify.
  return new Response(
    `${effacees} cle(s) effacee(s) sur ${vues}, au-dela de ${JOURS_GARDES} jours.\n`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
}

export const config = { schedule: "0 4 * * *" };
