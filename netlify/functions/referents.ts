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

  const store = getStore("referents");
  const { blobs } = await store.list();

  const parJour = await Promise.all(
    blobs.map(async ({ key }) => {
      const [jour, ...reste] = key.split("/");
      const valeur = await store.get(key, { consistency: "strong" });
      return { jour, hote: reste.join("/"), venues: Number(valeur ?? 0) };
    }),
  );

  const parHote = new Map<string, number>();
  for (const { hote, venues } of parJour) parHote.set(hote, (parHote.get(hote) ?? 0) + venues);
  const lignes = [...parHote.entries()].map(([hote, venues]) => ({ hote, venues }));
  const jours = [...new Set(parJour.map((l) => l.jour))].sort();

  // LES MEMES NOMS QUE LA FONCTION EDGE, plus l'hote de la requete : la page
  // doit ranger a part ce que le compteur, avant le 05/11, prenait encore
  // pour des referents exterieurs.
  const nosHotes = [new URL(requete.url).hostname, "nahual.fr", "sylvainmaurier.com", "nahual-studio.netlify.app"];

  const entetes = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };

  // `?json` reste disponible : la page est pour l'oeil, les donnees pour
  // tout le reste (un script, un relevé, une reprise ailleurs).
  if (new URL(requete.url).searchParams.has("json")) {
    return Response.json(
      { lignes: lignes.sort((a, b) => b.venues - a.venues), parJour, jours },
      { headers: entetes },
    );
  }

  return new Response(pageReferents({ lignes, nosHotes, jours }), {
    headers: { ...entetes, "Content-Type": "text/html; charset=utf-8" },
  });
}

export const config = { path: "/referents" };
