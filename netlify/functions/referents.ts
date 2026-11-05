import { getStore } from "@netlify/blobs";
import { identifiantsValides } from "../../src/lib/acces-prive.ts";
import { pageReferents } from "../../src/lib/page-referents.ts";

/**
 * La lecture des chiffres du compteur de referents. Reservee a Sylvain.
 *
 * LA PORTE EST COTE SERVEUR, et c'est la seule facon qui vaille : un mot de
 * passe verifie en JavaScript dans la page laisserait les chiffres lisibles
 * dans la source. Meme principe que le site de revision RGAA.
 *
 * Les identifiants vivent dans les variables d'environnement Netlify
 * (`REFERENTS_UTILISATEUR`, `REFERENTS_MOT_DE_PASSE`), jamais dans le depot.
 * Si l'une des deux manque, `identifiantsValides` refuse tout : une
 * configuration oubliee ferme la porte au lieu de l'ouvrir.
 */

export default async function lireReferents(requete: Request) {
  const attendu = {
    utilisateur: process.env.REFERENTS_UTILISATEUR ?? "",
    motDePasse: process.env.REFERENTS_MOT_DE_PASSE ?? "",
  };

  if (!identifiantsValides(requete.headers.get("authorization"), attendu)) {
    return new Response("Acces reserve.\n", {
      status: 401,
      headers: {
        // Le navigateur affiche sa propre invite : rien a construire.
        "WWW-Authenticate": 'Basic realm="referents", charset="UTF-8"',
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

  /** Lit un magasin entier et le rend agrege par valeur, plus le detail par jour. */
  async function lire(magasin: string) {
    const store = getStore(magasin);
    const { blobs } = await store.list();
    const parJour = await Promise.all(
      blobs.map(async ({ key }) => {
        const [jour, ...reste] = key.split("/");
        const valeur = await store.get(key, { consistency: "strong" });
        return { jour, hote: reste.join("/"), venues: Number(valeur ?? 0) };
      }),
    );
    const total = new Map<string, number>();
    for (const { hote, venues } of parJour) total.set(hote, (total.get(hote) ?? 0) + venues);
    return { parJour, lignes: [...total.entries()].map(([hote, venues]) => ({ hote, venues })) };
  }

  const [ref, pays, pages] = await Promise.all([
    lire("referents"),
    lire("referents-pays"),
    lire("referents-pages"),
  ]);

  const parJour = ref.parJour;
  const lignes = ref.lignes;
  // Les trois mesures n'ont pas commence le meme jour : la periode affichee
  // est celle de TOUT ce qui est releve, pas celle des seuls referents.
  const jours = [...new Set([...ref.parJour, ...pays.parJour, ...pages.parJour].map((l) => l.jour))].sort();

  // LES MEMES NOMS QUE LA FONCTION EDGE, plus l'hote de la requete : la page
  // doit ranger a part ce que le compteur, avant le 05/11, prenait encore
  // pour des referents exterieurs.
  const nosHotes = [new URL(requete.url).hostname, "nahual.fr", "sylvainmaurier.com", "nahual-studio.netlify.app"];

  const entetes = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };

  // `?json` reste disponible : la page est pour l'oeil, les donnees pour
  // tout le reste (un script, un relevé, une reprise ailleurs).
  if (new URL(requete.url).searchParams.has("json")) {
    return Response.json(
      { lignes: lignes.sort((a, b) => b.venues - a.venues), pays: pays.lignes, pages: pages.lignes, parJour, jours },
      { headers: entetes },
    );
  }

  return new Response(pageReferents({ lignes, nosHotes, jours, pays: pays.lignes, pages: pages.lignes }), {
    headers: { ...entetes, "Content-Type": "text/html; charset=utf-8" },
  });
}

export const config = { path: "/referents" };
