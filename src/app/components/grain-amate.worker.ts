/// <reference lib="webworker" />

import {
  bakeAmateGrainRows,
  bakeObsidianPolishRows,
  fadeToPaper,
  fadeToStone,
  rendreSansCouture,
} from "@/lib/amate-texture";

/**
 * LA MATIERE CUITE HORS DU FIL PRINCIPAL (16/09).
 *
 * Le grain de l'amate et le poli de l'obsidienne se cuisaient dans les temps
 * morts de la page. C'etait le bon endroit tant qu'il existait des temps
 * morts : une page qui rend une scene 3D n'en a AUCUN. Mesure sur Contact
 * (Pixel 7, processeur divise par quatre) : `requestIdleCallback`
 * n'annoncait jamais de repit, c'etait toujours le delai de garde qui
 * decidait, la cuisson s'etalait sur pres de sept secondes en vingt-deux
 * taches de vingt a quatre-vingt-dix millisecondes, et le profil du premier
 * defilement montrait encore le generateur en train de tourner. Meme
 * decoupee finement, une tache de quatre-vingt-dix millisecondes coute cinq
 * images.
 *
 * Ici, rien de tout ca ne touche le fil principal. Le worker cuit les
 * octets, les encode en PNG via `OffscreenCanvas.convertToBlob`, et rend
 * quatre blobs. La page n'a plus qu'a en faire des URL d'objet, ce qui
 * coute des microsecondes.
 *
 * POURQUOI PAS UNE IMAGE CUITE A LA CONSTRUCTION, qui couterait zero : les
 * quatre tuiles pesent 184 Ko en PNG sans perte, 8 Ko en WebP avec perte.
 * Le WebP est tentant, mais ces tuiles se REPETENT : un artefact de
 * compression se repete avec elles, et c'est exactement la famille de
 * defaut que Sylvain avait reperee le 15/09 (« on voit la jonction des
 * carres »). Le worker rend les memes pixels qu'avant, a l'octet pres, sans
 * un octet de plus a telecharger.
 *
 * L'ordre suit la face ouverte : un visiteur de la nuit voit sa pierre
 * arriver d'abord.
 */

export type DemandeMatiere = {
  taille: number;
  graine: number;
  partDeBlanc: number;
  partDePierre: number;
  nuit: boolean;
};

export type CleMatiere = "papier" | "papierDoux" | "pierre" | "pierreDoux";
export type ReponseMatiere = { cle: CleMatiere; image: Blob };

async function enBlob(octets: Uint8Array, taille: number): Promise<Blob> {
  const toile = new OffscreenCanvas(taille, taille);
  const ctx = toile.getContext("2d");
  if (!ctx) throw new Error("pas de contexte 2d dans le worker");
  // `new Uint8ClampedArray(octets)` recopie : ImageData exige ce type exact,
  // et la copie evite de partager le tampon avec le generateur.
  ctx.putImageData(new ImageData(new Uint8ClampedArray(octets), taille, taille), 0, 0);
  return toile.convertToBlob({ type: "image/png" });
}

const poste = (message: ReponseMatiere) => {
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(message);
};

async function cuirePapier(d: DemandeMatiere): Promise<void> {
  const brut = new Uint8Array(d.taille * d.taille * 4);
  bakeAmateGrainRows(brut, d.taille, d.graine, 0, d.taille);
  const grain = rendreSansCouture(brut, d.taille);
  poste({ cle: "papier", image: await enBlob(grain, d.taille) });
  poste({ cle: "papierDoux", image: await enBlob(fadeToPaper(grain, d.partDeBlanc), d.taille) });
}

async function cuirePierre(d: DemandeMatiere): Promise<void> {
  const brut = new Uint8Array(d.taille * d.taille * 4);
  bakeObsidianPolishRows(brut, d.taille, d.graine + 4, 0, d.taille);
  poste({ cle: "pierre", image: await enBlob(brut, d.taille) });
  poste({ cle: "pierreDoux", image: await enBlob(fadeToStone(brut, d.partDePierre), d.taille) });
}

self.onmessage = async (evenement: MessageEvent<DemandeMatiere>) => {
  const d = evenement.data;
  if (d.nuit) {
    await cuirePierre(d);
    await cuirePapier(d);
  } else {
    await cuirePapier(d);
    await cuirePierre(d);
  }
};
