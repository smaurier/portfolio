"use client";

import { useEffect } from "react";
import { bakeAmateGrainSeamless, bakeObsidianPolishSeamless, fadeToPaper } from "@/lib/amate-texture";
import { THEME_EVENT } from "@/lib/theme";
import { getTheme } from "./theme-store";

/**
 * LE GRAIN DU PAPIER (13/09, idee de Sylvain : « si le papier etait
 * important, on pourrait mettre un grain a l'image claire et donner la
 * meme texture que celle du codex »).
 *
 * La face claire n'est pas un fond creme : c'est de l'amatl, un papier
 * d'ecorce battue. Le grain vient donc du MEME generateur que les bandes
 * d'amate de la scene (lib/amate-texture), pour que la page et le Codex
 * soient du meme papier.
 *
 * Il est cuit une seule fois, dans un temps mort du navigateur, et
 * seulement si la face claire est demandee : un visiteur qui reste dans la
 * nuit ne paie rien. La tuile fait 192 pixels, repetee ; la couture ne se
 * est rendue sans couture (bakeAmateGrainSeamless, teste).
 * Le resultat est pose en variable CSS sur <html>, et c'est la feuille de
 * style qui decide ou il s'applique.
 */
const TAILLE = 192;
const GRAINE = 11;
const VARIABLE = "--grain-amate";
/** La seconde feuille : celle des panneaux et du bandeau, posee PAR-DESSUS
 * la page, donc plus claire et d'une fibre plus discrete. */
const VARIABLE_DOUX = "--grain-amate-doux";
const PART_DE_BLANC = 0.74;
/** Le pendant de la nuit : l'obsidienne polie. */
const VARIABLE_POLI = "--poli-obsidienne";

export default function GrainAmate() {
  useEffect(() => {
    const root = document.documentElement;
    let fait = false;

    const cuire = () => {
      if (fait || root.style.getPropertyValue(VARIABLE)) return;
      fait = true;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = TAILLE;
        canvas.height = TAILLE;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const grain = bakeAmateGrainSeamless(TAILLE, GRAINE);
        const image = ctx.createImageData(TAILLE, TAILLE);
        image.data.set(grain);
        ctx.putImageData(image, 0, 0);
        root.style.setProperty(VARIABLE, `url(${canvas.toDataURL("image/png")})`);
        // La seconde feuille, cuite dans le meme temps mort.
        const doux = ctx.createImageData(TAILLE, TAILLE);
        doux.data.set(fadeToPaper(grain, PART_DE_BLANC));
        ctx.putImageData(doux, 0, 0);
        root.style.setProperty(VARIABLE_DOUX, `url(${canvas.toDataURL("image/png")})`);
        // L'obsidienne polie, pour la nuit : cuite en meme temps, parce
        // qu'on passe d'une face a l'autre et qu'on ne veut pas d'attente
        // au retour.
        const poli = ctx.createImageData(TAILLE, TAILLE);
        poli.data.set(bakeObsidianPolishSeamless(TAILLE, GRAINE + 4));
        ctx.putImageData(poli, 0, 0);
        root.style.setProperty(VARIABLE_POLI, `url(${canvas.toDataURL("image/png")})`);
      } catch {
        // Canvas refuse (contexte durci, memoire) : la face claire reste un
        // papier uni, ce qui est exactement ce qu'elle etait avant.
      }
    };

    // NE PAS CUIRE CE QUI NE SERA PAS MONTRE (14/09). Mesure au profileur,
    // Contact, telephone, processeur ralenti : 27 % du temps processeur
    // passait dans le generateur de papier (hash, noise, amatePattern) —
    // sur un telephone, ou la feuille de style cache justement ces deux
    // calques depuis le meme jour. On cuisait une texture pour la jeter.
    // Meme seuil que la regle CSS : au-dela, rien a cuire.
    if (window.matchMedia("(max-width: 900px)").matches) return;

    const auRepos = (fn: () => void) => {
      const w = window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
      if (typeof w.requestIdleCallback === "function") w.requestIdleCallback(fn, { timeout: 2000 });
      else window.setTimeout(fn, 400);
    };

    // Les deux matieres sont cuites des qu'une face est demandee : la nuit
    // veut son poli, le jour son grain, et on passe de l'une a l'autre.
    const regarder = () => auRepos(cuire);
    regarder();
    window.addEventListener(THEME_EVENT, regarder);
    return () => window.removeEventListener(THEME_EVENT, regarder);
  }, []);
  return (
    <>
      <div className="grainAmate" aria-hidden="true" />
      <div className="poliObsidienne" aria-hidden="true" />
    </>
  );
}
