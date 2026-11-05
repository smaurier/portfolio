import { classerReferents, type Ligne } from "./referents";

/**
 * LA PAGE DU REGISTRE : un gabarit PUR, pour qu'il se juge sans deployer.
 *
 * La fonction Netlify qui la sert ne peut pas tourner en local (le greffon
 * Next casse l'empaquetage des fonctions edge sous Windows). Si le HTML
 * vivait dans la fonction, le seul moyen de le regarder serait de le mettre
 * en ligne. Ici il se rend dans un test, s'ecrit dans un fichier, et se
 * regarde dans un navigateur comme n'importe quelle page.
 *
 * ── LA FORME, ET POURQUOI CELLE-LA ──────────────────────────────────────
 *
 * C'est un outil prive, mais il appartient a Nahual : poser un tableau de
 * bord generique sur un site qui raconte un codex serait un faux pli. Donc
 * une PAGE DE REGISTRE : papier creme, encre, les chiffres en chasse fixe
 * comme un livre de comptes, chaque referent une ligne avec une barre
 * d'encre proportionnelle. Newsreader pour la lecture, DM Mono pour les
 * nombres. Les deux faces du site, claire et sombre, comme partout ailleurs.
 *
 * ── CE QU'ELLE DOIT DIRE, MEME QUAND ELLE EST VIDE ──────────────────────
 *
 * Au 05/11/2026 la reponse honnete est « personne, pour l'instant ». Une
 * page vide qui ressemble a une panne est un defaut : l'etat vide est donc
 * ecrit, pas subi.
 */

export interface DonneesRegistre {
  readonly lignes: readonly Ligne[];
  readonly nosHotes: readonly string[];
  readonly jours: readonly string[];
  /** Totaux par pays. Optionnels : la mesure a commence apres les referents. */
  readonly pays?: readonly Ligne[];
  /** Totaux par page d'arrivee. Leur somme est le nombre de pages vues. */
  readonly pages?: readonly Ligne[];
}

/**
 * Une mesure secondaire : son titre, sa legende, ses lignes.
 *
 * ⚠️ UNE SECTION VIDE NE S'AFFICHE PAS. Les trois mesures n'ont pas commence
 * le meme jour : montrer un tableau vide laisserait croire a une panne, ou
 * pire, a un zero mesure.
 */
function sectionHtml(titre: string, note: string, lignes: readonly Ligne[], retard: number): string {
  if (!lignes.length) return "";
  const tri = [...lignes].sort((a, b) => b.venues - a.venues);
  const max = tri.reduce((m, l) => Math.max(m, l.venues), 0);
  return `  <h2>${titre}</h2>
  <p class="note">${note}</p>
  <table>
    <caption class="vu">${titre}</caption>
    <tbody>
${lignesHtml(tri, max, retard)}
    </tbody>
  </table>`;
}

/** Echappe ce qui part dans le HTML. Les hotes viennent d'un en-tete : ils ne sont pas de confiance. */
function echapper(texte: string): string {
  return texte
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** « 3 venues », « 1 venue » : le pluriel se decide, il ne se devine pas. */
function venues(n: number): string {
  return `${n} venue${n > 1 ? "s" : ""}`;
}

function lignesHtml(lignes: readonly Ligne[], max: number, retard: number): string {
  return lignes
    .map((l, i) => {
      // La barre est DECORATIVE : le nombre, lui, est lu. Une barre seule
      // ferait reposer l'information sur une longueur, que rien n'annonce
      // a qui n'y voit pas.
      const part = max > 0 ? Math.round((l.venues / max) * 100) : 0;
      return `      <tr style="--rang:${i + retard}">
        <th scope="row"><span class="hote">${echapper(l.hote)}</span></th>
        <td class="compte"><span class="nombre">${l.venues}</span><span class="vu">&nbsp;${echapper(venues(l.venues))}</span></td>
        <td class="trace"><span class="barre" style="--part:${part}%" aria-hidden="true"></span></td>
      </tr>`;
    })
    .join("\n");
}

export function pageReferents(donnees: DonneesRegistre): string {
  const { exterieurs, notres } = classerReferents(donnees.lignes, donnees.nosHotes);
  const maxExt = exterieurs.reduce((m, l) => Math.max(m, l.venues), 0);
  const maxNous = notres.reduce((m, l) => Math.max(m, l.venues), 0);
  const totalExt = exterieurs.reduce((s, l) => s + l.venues, 0);
  const jours = [...donnees.jours].sort();
  const depuis = jours[0] ?? null;

  const corpsExterieurs = exterieurs.length
    ? `  <table>
    <caption class="vu">Sites qui ont envoyé du monde, du plus envoyeur au moins</caption>
    <tbody>
${lignesHtml(exterieurs, maxExt, 0)}
    </tbody>
  </table>
  <p class="somme"><strong>${totalExt}</strong> venue${totalExt > 1 ? "s" : ""} depuis ${exterieurs.length} site${exterieurs.length > 1 ? "s" : ""}.</p>`
    : `  <p class="vide"><span class="vide-mot">Personne, pour l'instant.</span>
    Aucun site extérieur n'a encore envoyé quelqu'un ici. C'est un fait, pas une panne :
    le registre compte depuis${depuis ? ` le ${echapper(depuis)}` : " peu"}, et il ne retient
    que les arrivées qui déclarent d'où elles viennent.</p>`;

  const corpsNotres = notres.length
    ? `  <details>
    <summary>Notre propre trafic <span class="pastille">${notres.length}</span></summary>
    <p class="note">Les autres noms de ce même site : son alias <code>sylvainmaurier.com</code>,
      son adresse Netlify, et une URL par déploiement. Naviguer dedans n'est pas une venue.
      Ces lignes sont l'<strong>historique des 4 et 5 novembre</strong>, avant que le compteur
      connaisse ces noms&nbsp;; elles n'augmentent plus.</p>
    <table>
      <caption class="vu">Nos propres domaines, relevé historique</caption>
      <tbody>
${lignesHtml(notres, maxNous, exterieurs.length)}
      </tbody>
    </table>
  </details>`
    : "";

  const pays = donnees.pays ?? [];
  const pages = donnees.pages ?? [];
  const vues = pages.reduce((s, l) => s + l.venues, 0);

  const corpsPays = sectionHtml(
    "Pays",
    "D&eacute;duit au serveur, sans rien demander ni rien poser. Le pays seul&nbsp;: ni ville, ni code postal, ni coordonn&eacute;es.",
    pays,
    exterieurs.length,
  );

  const corpsPages = sectionHtml(
    "Pages d'arriv&eacute;e",
    `La page sur laquelle on atterrit. Leur somme, <strong>${vues}</strong>, est le nombre de pages vues&nbsp;: c'est la r&eacute;ponse &agrave; &laquo;&nbsp;combien de monde&nbsp;&raquo;, que le seul compteur de r&eacute;f&eacute;rents ne donnait pas.`,
    pages,
    exterieurs.length + pays.length,
  );

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Registre des venues — Nahual</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,500;1,6..72,300&family=DM+Mono:wght@300;500&display=swap">
<style>
  /* Les deux faces du site, memes valeurs que globals.css. La face claire
     est le defaut ; la sombre suit la preference du systeme. */
  :root {
    --papier: #f3ece0;
    --papier-creux: #ece3d4;
    --encre: #1d1626;
    --encre-pale: rgba(29, 22, 38, 0.62);
    --trait: rgba(29, 22, 38, 0.14);
    --jade: #1a8a63;
    --grain: rgba(29, 22, 38, 0.035);
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --papier: #0d0b11;
      --papier-creux: #141019;
      --encre: #f2ece1;
      --encre-pale: rgba(242, 236, 225, 0.58);
      --trait: rgba(242, 236, 225, 0.16);
      --jade: #00c078;
      --grain: rgba(242, 236, 225, 0.03);
    }
  }

  * { box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; }
  body {
    margin: 0;
    background: var(--papier);
    color: var(--encre);
    font: 300 1.0625rem/1.65 Newsreader, Georgia, "Times New Roman", serif;
    /* Le grain du papier : deux trames fines, jamais une image. */
    background-image:
      radial-gradient(circle at 15% 12%, var(--grain) 0 1px, transparent 1px),
      radial-gradient(circle at 68% 76%, var(--grain) 0 1px, transparent 1px);
    background-size: 23px 23px, 31px 31px;
  }

  main { max-width: 46rem; margin: 0 auto; padding: clamp(2.5rem, 7vw, 5rem) clamp(1.25rem, 5vw, 2.5rem) 5rem; }

  .cartouche { display: flex; align-items: baseline; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.35rem; }
  .cartouche span {
    font: 500 0.6875rem/1 "DM Mono", ui-monospace, monospace;
    letter-spacing: 0.22em; text-transform: uppercase; color: var(--jade);
  }
  .cartouche hr { flex: 1; height: 0; border: 0; border-top: 1px solid var(--trait); margin: 0; }

  h1 { font-size: clamp(2rem, 6vw, 3rem); font-weight: 300; line-height: 1.08; margin: 0 0 0.6rem; letter-spacing: -0.015em; }
  h1 em { font-style: italic; }
  .chapeau { color: var(--encre-pale); margin: 0 0 3rem; max-width: 34rem; }

  h2 { font-size: 1.0625rem; font-weight: 500; margin: 3.25rem 0 0.9rem; letter-spacing: 0.01em; }

  table { width: 100%; border-collapse: collapse; }
  tr { border-top: 1px solid var(--trait); }
  tr:last-child { border-bottom: 1px solid var(--trait); }
  th, td { text-align: left; font-weight: inherit; padding: 0.8rem 0; vertical-align: baseline; }
  .hote { font-size: 1.0625rem; word-break: break-word; }
  .compte { width: 5.5rem; text-align: right; white-space: nowrap; }
  .nombre { font: 500 1.0625rem/1 "DM Mono", ui-monospace, monospace; font-variant-numeric: tabular-nums; }
  .trace { width: 38%; padding-left: 1.25rem; }
  .barre { display: block; height: 3px; min-width: 10px; width: var(--part); background: var(--jade); border-radius: 2px; }

  .somme { margin: 1.1rem 0 0; color: var(--encre-pale); font-size: 0.9375rem; }
  .somme strong { font: 500 1rem/1 "DM Mono", ui-monospace, monospace; color: var(--encre); }

  .vide { margin: 0; padding: 2rem 1.75rem; background: var(--papier-creux); border-left: 2px solid var(--jade); color: var(--encre-pale); }
  .vide-mot { display: block; font-size: 1.5rem; color: var(--encre); margin-bottom: 0.5rem; }

  details { margin-top: 2.5rem; border-top: 1px solid var(--trait); }
  details[open] { padding-bottom: 1.5rem; }
  summary { cursor: pointer; padding: 0.9rem 0; font-size: 0.9375rem; color: var(--encre-pale); display: flex; align-items: center; gap: 0.6rem; }
  summary::marker { color: var(--jade); }
  summary:hover, summary:focus-visible { color: var(--encre); }
  .pastille { font: 500 0.75rem/1 "DM Mono", ui-monospace, monospace; padding: 0.2rem 0.45rem; border: 1px solid var(--trait); border-radius: 999px; }
  .note { font-size: 0.9375rem; color: var(--encre-pale); margin: 0 0 1.25rem; }
  code { font: 300 0.875em/1 "DM Mono", ui-monospace, monospace; }

  footer { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--trait); color: var(--encre-pale); font-size: 0.875rem; }
  footer p { margin: 0 0 0.6rem; }
  footer strong { font-weight: 500; color: var(--encre); }

  /* Lu par les lecteurs d'ecran, invisible a l'oeil. */
  .vu { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }

  a, summary:focus-visible, :focus-visible { outline-offset: 3px; outline-color: var(--jade); }

  /* UNE SEULE ORCHESTRATION, A L'OUVERTURE : les lignes du registre
     s'inscrivent l'une apres l'autre, comme une main qui ecrit. */
  @media (prefers-reduced-motion: no-preference) {
    tr { animation: inscrire 0.5s cubic-bezier(0.2, 0.7, 0.3, 1) backwards; animation-delay: calc(var(--rang, 0) * 70ms + 120ms); }
    .barre { animation: tracer 0.7s cubic-bezier(0.2, 0.7, 0.3, 1) backwards; animation-delay: calc(var(--rang, 0) * 70ms + 300ms); }
    h1, .chapeau, .vide { animation: inscrire 0.6s ease-out backwards; }
    .chapeau { animation-delay: 80ms; }
    .vide { animation-delay: 160ms; }
  }
  @keyframes inscrire { from { opacity: 0; transform: translateY(0.4rem); } }
  @keyframes tracer { from { width: 0; } }
</style>
</head>
<body>
<main>
  <p class="cartouche"><span>Registre</span><hr></p>
  <h1>Qui t'envoie <em>du monde</em></h1>
  <p class="chapeau">Trois totaux quotidiens${depuis ? `, depuis le ${echapper(depuis)}` : ""}&nbsp;: d'où l'on vient quand on a suivi un lien,
    de quel pays, et sur quelle page on arrive. Comptés au serveur&nbsp;: ni script, ni cookie, ni adresse,
    et aucune distinction entre deux personnes.</p>

${corpsExterieurs}

${corpsPays}

${corpsPages}

${corpsNotres}

  <footer>
    <p>⚠️ <strong>Les deux premières listes ne couvrent pas tout le monde.</strong> Un site référent n'apparaît
      que si le navigateur annonce d'où il vient&nbsp;: une arrivée directe, un favori, une adresse tapée à la main
      n'y figurent pas, et les robots d'indexation ni les assistants non plus, pour la même raison.
      Les pages d'arrivée, elles, comptent chaque passage.</p>
    <p>Et nulle part un visiteur n'est distingué d'un autre&nbsp;: ce sont des pages vues, jamais des personnes.
      Les totaux sont effacés au bout d'un an.</p>
    <p>${jours.length ? `${jours.length} jour${jours.length > 1 ? "s" : ""} relevé${jours.length > 1 ? "s" : ""}, du ${echapper(jours[0])} au ${echapper(jours[jours.length - 1])}.` : "Aucun jour relevé."}</p>
  </footer>
</main>
</body>
</html>`;
}
