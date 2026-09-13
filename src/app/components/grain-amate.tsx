"use client";

import { useEffect } from "react";
import { bakeAmateGrainSeamless, fadeToPaper } from "@/lib/amate-texture";
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
      } catch {
        // Canvas refuse (contexte durci, memoire) : la face claire reste un
        // papier uni, ce qui est exactement ce qu'elle etait avant.
      }
    };

    const auRepos = (fn: () => void) => {
      const w = window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
      if (typeof w.requestIdleCallback === "function") w.requestIdleCallback(fn, { timeout: 2000 });
      else window.setTimeout(fn, 400);
    };

    const regarder = () => {
      if (getTheme() === "light") auRepos(cuire);
    };
    regarder();
    window.addEventListener(THEME_EVENT, regarder);
    return () => window.removeEventListener(THEME_EVENT, regarder);
  }, []);
  return <div className="grainAmate" aria-hidden="true" />;
}
