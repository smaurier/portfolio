/**
 * NETTOYER ET COMPRESSER LES MODELES (10/09, lot I2, go de Sylvain sur
 * l'outil de build).
 *
 * Ce que la mesure avait trouve : xolotl.glb pesait 1,94 Mo pour 64 Ko de
 * maillage reellement reference -- 1848 accesseurs que rien n'utilisait,
 * embarques par l'export. stag.glb, deja en meshopt, perdait encore 76 %.
 * Et cihuateotl.glb, 1,46 Mo, n'etait pas compresse du tout.
 *
 * Trois passes de @gltf-transform/cli, dans cet ordre :
 *   dedup    fusionne les accesseurs, materiaux et textures identiques ;
 *   prune    retire tout ce que rien ne reference ;
 *   meshopt  compresse (EXT_meshopt_compression, decodeur deja embarque
 *            par drei via three-stdlib : aucun CDN, aucune requete de plus).
 *
 * GARDE-FOU : un modele n'est remplace que si le gain depasse 50 %. En
 * dessous, le gain vient surtout de requantifier des donnees deja
 * quantifiees, ce qui est une perte pour presque rien : on garde
 * l'original. Et l'inventaire (maillages, materiaux, animations) doit etre
 * identique avant et apres, sinon on refuse.
 *
 *   pnpm models            (tous)
 *   pnpm models stag.glb   (un seul)
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, statSync, copyFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";

const DOSSIER = "public/models";
const SEUIL = 50;
const cibles = process.argv.slice(2);
const fichiers = readdirSync(DOSSIER).filter((f) => f.endsWith(".glb") && (cibles.length === 0 || cibles.includes(f)));
const tmp = mkdtempSync(join(tmpdir(), "glb-"));

const cli = (...args) => execFileSync("npx", ["gltf-transform", ...args], { stdio: ["ignore", "pipe", "pipe"], shell: true });
const inventaire = (chemin) => {
  const texte = cli("inspect", chemin).toString().replace(/\x1b\[[0-9;]*m/g, "");
  const compte = (section) => {
    const i = texte.indexOf(" " + section);
    if (i < 0) return 0;
    const bloc = texte.slice(i, texte.indexOf("\n\n\n", i) === -1 ? undefined : texte.indexOf("\n\n\n", i));
    return (bloc.match(/^│ \d+ │/gm) ?? []).length;
  };
  return ["MESHES", "MATERIALS", "TEXTURES", "SKINS", "ANIMATIONS"].map(compte).join("/");
};

console.log("modele                       avant     apres   gain   verdict");
for (const f of fichiers) {
  const src = join(DOSSIER, f);
  const a = join(tmp, "a-" + f), b = join(tmp, "b-" + f), c = join(tmp, "c-" + f);
  cli("dedup", src, a);
  cli("prune", a, b);
  cli("meshopt", b, c);
  const avant = statSync(src).size, apres = statSync(c).size;
  const gain = Math.round(100 - (apres * 100) / avant);
  let verdict = "on garde l'original";
  if (gain >= SEUIL) {
    const iv1 = inventaire(src), iv2 = inventaire(c);
    if (iv1 !== iv2) verdict = "REFUSE : inventaire change (" + iv1 + " -> " + iv2 + ")";
    else {
      copyFileSync(c, src);
      verdict = "remplace";
    }
  }
  console.log(
    basename(f).padEnd(26) + String(Math.round(avant / 1024)).padStart(7) + "K" + String(Math.round(apres / 1024)).padStart(8) + "K" +
      String(gain).padStart(6) + "%   " + verdict,
  );
}
rmSync(tmp, { recursive: true, force: true });
