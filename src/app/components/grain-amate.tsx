"use client";

import { useEffect } from "react";
import { bakeAmateGrainRows, bakeObsidianPolishRows, fadeToPaper, rendreSansCouture } from "@/lib/amate-texture";
import { THEME_EVENT } from "@/lib/theme";
import { SONDE } from "@/lib/sonde";

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

    /**
     * Un temps mort du navigateur, avec une PATIENCE bornee.
     *
     * `requestIdleCallback` attend que le navigateur n'ait rien a faire. Une
     * page qui charge une scene 3D n'est jamais au repos : avec le delai de
     * garde d'origine (deux secondes) et huit etapes, la matiere mettait
     * huit secondes a se poser, et le visiteur voyait le papier arriver
     * sous ses yeux (mesure du 14/09). On garde donc le temps mort, qui
     * reste le bon endroit, mais on ne l'attend pas indefiniment : deux
     * secondes pour la premiere etape, un quart de seconde ensuite.
     */
    const auRepos = (fn: () => void, patience = 250) => {
      const w = window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
      if (typeof w.requestIdleCallback === "function") w.requestIdleCallback(fn, { timeout: patience });
      else window.setTimeout(fn, Math.min(patience, 120));
    };

    /**
     * ON CUIT AUSSI POUR LE TELEPHONE (14/09 au soir), EN TROIS TEMPS
     * MORTS PLUTOT QU'EN UN.
     *
     * La cuisson y avait ete coupee le matin meme, en meme temps que les
     * deux nappes : la feuille de style les cachait, il aurait ete absurde
     * de cuire pour jeter. Les nappes sont revenues (remesure : leur cout
     * n'est pas mesurable, voir globals.css), donc la cuisson revient.
     *
     * Les 27 % de processeur mesures ce matin-la n'etaient PAS celle-ci :
     * c'etait la cuisson des bandelettes d'amate de la SCENE, refaite a
     * chaque montage, corrigee en gardant la texture au niveau du module
     * (amate-strips). Celle-ci est une tuile de 192 par 192, cuite une
     * seule fois.
     *
     * Elle coute tout de meme 385 millisecondes sur un Pixel 7 au
     * processeur divise par quatre, et un temps mort du navigateur n'est
     * pas un autre fil : une tache de 385 ms reste une tache de 385 ms. On
     * ne touche donc PAS a la matiere (meme tuile, meme graine, meme rendu
     * au pixel pres) : on rend la main entre chaque matiere. Trois taches
     * d'environ 130 ms au lieu d'une de 385. Duree reelle lisible dans
     * `window.__nahualMatiere` en dev.
     */
    let canvas: HTMLCanvasElement | null = null;
    let ctx: CanvasRenderingContext2D | null = null;
    let grain: Uint8Array | null = null;

    const poser = (variable: string, octets: Uint8Array) => {
      if (!ctx || !canvas) return;
      const image = ctx.createImageData(TAILLE, TAILLE);
      image.data.set(octets);
      ctx.putImageData(image, 0, 0);
      root.style.setProperty(variable, `url(${canvas.toDataURL("image/png")})`);
    };

    // LE PAPIER PAR BANDES. Le grain d'amate coute a lui seul 349 ms sur un
    // Pixel 7 au processeur divise par quatre, quatre fois le poli de
    // l'obsidienne : c'est son generateur (fibres, nuages, battage) qui est
    // plus riche. Chaque pixel ne dependant que de ses coordonnees, on le
    // cuit par tranches de lignes, et un test verifie que le decoupage rend
    // exactement la meme matiere, octet par octet.
    const BANDES = 4;
    const brut = new Uint8Array(TAILLE * TAILLE * 4);
    const brutPoli = new Uint8Array(TAILLE * TAILLE * 4);
    // LE PAPIER, en bandes, puis sa couture et sa seconde feuille.
    const papier: Array<() => void> = [
      ...Array.from({ length: BANDES }, (_, b) => () => {
        bakeAmateGrainRows(brut, TAILLE, GRAINE, (b * TAILLE) / BANDES, ((b + 1) * TAILLE) / BANDES);
      }),
      () => {
        // La couture se ferme sur la tuile entiere : c'est un brassage de
        // tableau, pas le generateur, et il ne pese presque rien.
        grain = rendreSansCouture(brut, TAILLE);
        poser(VARIABLE, grain);
      },
      // La seconde feuille : celle des panneaux et du bandeau, plus claire.
      () => poser(VARIABLE_DOUX, fadeToPaper(grain as Uint8Array, PART_DE_BLANC)),
    ];
    // LA PIERRE, de meme. Cuite meme depuis la face claire : on passe d'une
    // face a l'autre, et on ne veut pas d'attente au retour.
    const pierre: Array<() => void> = [
      ...Array.from({ length: BANDES }, (_, b) => () => {
        bakeObsidianPolishRows(brutPoli, TAILLE, GRAINE + 4, (b * TAILLE) / BANDES, ((b + 1) * TAILLE) / BANDES);
      }),
      () => poser(VARIABLE_POLI, rendreSansCouture(brutPoli, TAILLE)),
    ];

    // LA MATIERE QU'ON REGARDE D'ABORD. Les deux sont cuites, mais celle de
    // la face ouverte passe devant : sinon, un visiteur de la nuit voyait sa
    // pierre arriver quatre secondes apres la page (mesure du 14/09).
    // L'attribut est pose par le script du layout AVANT la premiere image,
    // donc il est juste des ici.
    const nuit = root.dataset.theme !== "light";
    const etapes: Array<() => void> = [
      () => {
        canvas = document.createElement("canvas");
        canvas.width = TAILLE;
        canvas.height = TAILLE;
        ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("pas de contexte 2d");
      },
      ...(nuit ? [...pierre, ...papier] : [...papier, ...pierre]),
    ];

    const cuire = () => {
      // Les deux matieres sont le temoin : l'ordre des etapes depend de la
      // face, donc aucune des deux n'est « la derniere » a coup sur.
      if (fait || (root.style.getPropertyValue(VARIABLE) && root.style.getPropertyValue(VARIABLE_POLI))) return;
      fait = true;
      const t0 = performance.now();
      // La duree de CHAQUE etape, pas seulement le total : le total inclut
      // l'attente entre deux temps morts, et ce n'est pas elle qui gene le
      // visiteur. Ce qui gene, c'est la plus longue tache.
      const durees: number[] = [];
      const suivante = (i: number) => {
        if (i >= etapes.length) {
          if (SONDE) {
            (window as unknown as { __nahualMatiere?: { ms: number; pire: number; durees: number[]; taille: number } }).__nahualMatiere = {
              ms: Math.round(performance.now() - t0),
              pire: Math.round(Math.max(...durees)),
              durees: durees.map((d) => Math.round(d)),
              taille: TAILLE,
            };
          }
          canvas = null;
          ctx = null;
          grain = null;
          return;
        }
        const te = performance.now();
        try {
          etapes[i]();
          durees.push(performance.now() - te);
        } catch {
          // Canvas refuse (contexte durci, memoire) : la face claire reste
          // un papier uni, ce qui est exactement ce qu'elle etait avant.
          return;
        }
        auRepos(() => suivante(i + 1));
      };
      suivante(0);
    };

    const regarder = () => auRepos(cuire, 2000);
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
