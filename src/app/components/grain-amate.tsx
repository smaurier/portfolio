"use client";

import { useEffect } from "react";
import { bakeAmateGrainRows, bakeObsidianPolishRows, fadeToPaper, fadeToStone, rendreSansCouture } from "@/lib/amate-texture";
import { THEME_EVENT } from "@/lib/theme";
import { SONDE } from "@/lib/sonde";

/** Ce que `requestIdleCallback` annonce de repit restant. */
type Repit = { timeRemaining: () => number };

/** En dessous, on rend la main plutot que de risquer de deborder. */
const REPIT_MINIMUM_MS = 12;

/** Le delai de garde entre deux etapes de cuisson. */
const PATIENCE_ENTRE_ETAPES_MS = 90;

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
/** Les plaques de pierre : la meme nappe, plus discrete. Le commentaire de
 *  la feuille de style le disait depuis le 13/09 ; le code, lui, leur
 *  donnait la nappe a pleine force, d'ou « les textures d'obsidienne posees
 *  se voient enormement » (Sylvain, 15/09). */
const VARIABLE_POLI_DOUX = "--poli-obsidienne-doux";
/** La part retiree pour les plaques : posee en `screen`, une nappe deux
 *  fois plus sombre souleve deux fois moins le fond. */
const PART_DE_PIERRE = 0.55;

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
    const auRepos = (fn: (reste?: Repit) => void, patience = 250) => {
      const w = window as unknown as { requestIdleCallback?: (cb: (d: Repit) => void, o?: { timeout: number }) => number };
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
    // HUIT BANDES, PAS QUATRE (16/09). Ce qui gene le visiteur n'est pas la
    // duree totale de la cuisson mais la plus LONGUE tache : une tache ne
    // s'interrompt pas, donc 133 ms valent huit images perdues d'un coup.
    // Mesure sur Contact (Pixel 7, processeur divise par quatre) : les
    // quatre bandes d'amate coutaient 79, 97, 133 et 86 ms.
    const BANDES = 8;
    const brut = new Uint8Array(TAILLE * TAILLE * 4);
    const brutPoli = new Uint8Array(TAILLE * TAILLE * 4);
    // LE PAPIER, en bandes, puis sa couture et sa seconde feuille.
    const papier: Array<() => void> = [
      ...Array.from({ length: BANDES }, (_, b) => () => {
        bakeAmateGrainRows(brut, TAILLE, GRAINE, (b * TAILLE) / BANDES, ((b + 1) * TAILLE) / BANDES);
      }),
      // La couture et la pose sont DEUX etapes (16/09) : ensemble elles
      // faisaient 235 ms, la pire tache de la cuisson. Le commentaire
      // d'avant disait que la couture « ne pese presque rien » ; les separer
      // dit lequel des deux paie, et rend la main entre les deux.
      () => {
        grain = rendreSansCouture(brut, TAILLE);
      },
      () => poser(VARIABLE, grain as Uint8Array),
      // La seconde feuille : celle des panneaux et du bandeau, plus claire.
      () => poser(VARIABLE_DOUX, fadeToPaper(grain as Uint8Array, PART_DE_BLANC)),
    ];
    // LA PIERRE, de meme. Cuite meme depuis la face claire : on passe d'une
    // face a l'autre, et on ne veut pas d'attente au retour.
    const pierre: Array<() => void> = [
      ...Array.from({ length: BANDES }, (_, b) => () => {
        bakeObsidianPolishRows(brutPoli, TAILLE, GRAINE + 4, (b * TAILLE) / BANDES, ((b + 1) * TAILLE) / BANDES);
      }),
      // Aucun raccord a poser : depuis le 15/09 le poli est periodique par
      // construction (ondes a frequences entieres). Le fondu d'avant
      // laissait une croix centrale, repetee a chaque tuile, que Sylvain
      // lisait comme « la jonction des carres ».
      () => poser(VARIABLE_POLI, brutPoli),
      () => poser(VARIABLE_POLI_DOUX, fadeToStone(brutPoli, PART_DE_PIERRE)),
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
      const suivante = (i: number, repit?: Repit) => {
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
        // ON REMPLIT LE CRENEAU (16/09). Chaque etape attendait SON propre
        // temps mort : vingt-deux etapes a un quart de seconde de patience,
        // c'etait cinq secondes d'attente pure, et la matiere se posait a
        // dix-sept secondes. Tant qu'il reste du repit annonce, on enchaine
        // dans le meme creneau ; des qu'il n'y en a plus, on rend la main.
        // Resultat : rapide quand la page ne fait rien, poli quand elle
        // travaille, sans jamais allonger la plus longue tache.
        if (repit && repit.timeRemaining() > REPIT_MINIMUM_MS) {
          suivante(i + 1, repit);
          return;
        }
        // PATIENCE COURTE ENTRE LES ETAPES (16/09). Une page qui rend une
        // scene 3D n'est JAMAIS au repos : `requestIdleCallback` n'annonce
        // aucun repit, donc c'est toujours le delai de garde qui decide.
        // A un quart de seconde par etape, la matiere se posait a
        // dix-sept secondes, et le visiteur traversait tout son premier
        // defilement avec une tache de vingt a quatre-vingt-dix
        // millisecondes toutes les quelques images. Concentre, le meme
        // travail tient en deux secondes, pendant qu'il lit le haut de la
        // page. Une gene breve et tot vaut mieux qu'une gene diffuse et
        // longue : c'est le meme raisonnement qui avait fait passer la
        // premiere patience de deux secondes a un quart (14/09).
        auRepos((r) => suivante(i + 1, r), PATIENCE_ENTRE_ETAPES_MS);
      };
      suivante(0);
    };

    /**
     * D'ABORD LE WORKER (16/09), parce qu'une page qui rend une scene 3D
     * n'a AUCUN temps mort : le chemin ci-dessus restait honnete, mais il
     * etalait vingt-deux taches de vingt a quatre-vingt-dix millisecondes
     * sur le premier defilement du visiteur. Hors du fil principal, il n'y
     * a plus de tache du tout, et les pixels sont les memes a l'octet pres.
     *
     * Le chemin d'en haut reste, et c'est voulu : il sert quand le worker
     * ou `OffscreenCanvas` manquent, et quand le worker echoue en route.
     */
    let worker: Worker | null = null;
    const urls: string[] = [];
    const CLES: Record<string, string> = {
      papier: VARIABLE,
      papierDoux: VARIABLE_DOUX,
      pierre: VARIABLE_POLI,
      pierreDoux: VARIABLE_POLI_DOUX,
    };

    const parWorker = (): boolean => {
      if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined") return false;
      try {
        const t0 = performance.now();
        let recues = 0;
        worker = new Worker(new URL("./grain-amate.worker.ts", import.meta.url));
        worker.onmessage = (evenement: MessageEvent<{ cle: string; image: Blob }>) => {
          const variable = CLES[evenement.data.cle];
          if (!variable) return;
          const url = URL.createObjectURL(evenement.data.image);
          urls.push(url);
          root.style.setProperty(variable, `url(${url})`);
          recues += 1;
          if (recues < 4) return;
          fait = true;
          if (SONDE) {
            (window as unknown as { __nahualMatiere?: unknown }).__nahualMatiere = {
              ms: Math.round(performance.now() - t0),
              pire: 0,
              durees: [],
              taille: TAILLE,
              worker: true,
            };
          }
          worker?.terminate();
          worker = null;
        };
        worker.onerror = () => {
          worker?.terminate();
          worker = null;
          // Le worker a lache en route : on reprend a la main. Les etapes
          // deja posees ne seront pas refaites, la garde de `cuire` les voit.
          auRepos(cuire, 250);
        };
        worker.postMessage({
          taille: TAILLE,
          graine: GRAINE,
          partDeBlanc: PART_DE_BLANC,
          partDePierre: PART_DE_PIERRE,
          nuit: root.dataset.theme !== "light",
        });
        return true;
      } catch {
        worker = null;
        return false;
      }
    };

    const regarder = () => {
      if (fait) return;
      if (parWorker()) return;
      auRepos(cuire, 2000);
    };
    regarder();
    window.addEventListener(THEME_EVENT, regarder);
    return () => {
      window.removeEventListener(THEME_EVENT, regarder);
      worker?.terminate();
      for (const u of urls) URL.revokeObjectURL(u);
    };
  }, []);
  return (
    <>
      <div className="grainAmate" aria-hidden="true" />
      <div className="poliObsidienne" aria-hidden="true" />
    </>
  );
}
