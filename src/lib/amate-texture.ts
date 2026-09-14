/**
 * Le papier amate (04/09, Sylvain : "sans mettre de glyphe, je veux que
 * ca ressemble davantage a ce que c'est cense representer, ici on dirait
 * un vulgaire papier blanc").
 *
 * L'amatl est un papier d'ECORCE battue (ficus, morus), pas une feuille
 * lisse : une pate de fibres martelees, a la surface irreguliere, striee
 * dans le sens des fibres, tachetee, aux bords effiloches, d'un ton
 * creme-ocre tirant vers le brun selon l'ecorce. Dans les offrandes, les
 * papiers etaient ECLABOUSSES de caoutchouc liquide (ulli), gouttes
 * noires irregulieres attestees dans les sources (Sahagun, offrandes de
 * papier "goutte de hule"). Aucun glyphe : le projet a ecarte les signes
 * inventes (voie anti-appropriation, 28/08).
 *
 * Ce module est la partie PURE : une fonction de motif (u, v, graine) ->
 * couleur + alpha, deterministe, testable sans canvas ni WebGL. Le
 * composant l'echantillonne dans une DataTexture. `u` court le long de la
 * bande (le sens des fibres), `v` en travers.
 */

export type Rgba = { r: number; g: number; b: number; a: number };

export type AmateOptions = {
  /** Nombre de gouttes de caoutchouc sur la bande (0 = papier nu). */
  spatters: number;
  /** Largeur de l'effilochage des bords, en fraction de v. */
  fray: number;
};

export const AMATE_OPTIONS: AmateOptions = { spatters: 7, fray: 0.12 };

const BASE = { r: 0.83, g: 0.74, b: 0.56 }; // creme-ocre
const BARK = { r: 0.5, g: 0.36, b: 0.22 }; // brun d'ecorce
const RUBBER = { r: 0.08, g: 0.06, b: 0.05 }; // hule, presque noir

function hash(x: number, y: number, seed: number): number {
  const v = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return v - Math.floor(v);
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Bruit de valeur 2D lisse, dans [0, 1]. */
function noise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = smooth(x - x0);
  const fy = smooth(y - y0);
  const a = hash(x0, y0, seed);
  const b = hash(x0 + 1, y0, seed);
  const c = hash(x0, y0 + 1, seed);
  const d = hash(x0 + 1, y0 + 1, seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Couleur et alpha du papier au point (u, v) de la bande. */
export function amatePattern(u: number, v: number, seed: number, options: AmateOptions = AMATE_OPTIONS): Rgba {
  // Fibres : stries longues dans le sens de u, fines en v. Le bruit est
  // tres etire le long de u (une fibre court sur toute la bande).
  const fibre = noise(u * 3, v * 42, seed) * 0.6 + noise(u * 9, v * 120, seed + 1) * 0.4;
  // Pate irreguliere : taches larges, plus sombres la ou l'ecorce domine.
  const mottle = noise(u * 4 + 7, v * 3 + 3, seed + 2);
  const bark = clamp01(0.25 + 0.55 * mottle + 0.35 * (fibre - 0.5));
  let r = BASE.r + (BARK.r - BASE.r) * bark * 0.75;
  let g = BASE.g + (BARK.g - BASE.g) * bark * 0.75;
  let b = BASE.b + (BARK.b - BASE.b) * bark * 0.75;
  // Martelage : grain fin qui casse toute surface lisse. Lui aussi etire
  // dans le sens des fibres (cellules longues en u, courtes en v) : une
  // ecorce battue reste striee jusque dans son grain.
  const grain = (hash(Math.floor(u * 70), Math.floor(v * 220), seed + 3) - 0.5) * 0.08;
  r += grain;
  g += grain;
  b += grain;

  // Gouttes de hule : disques irreguliers, bords baveux.
  for (let i = 0; i < options.spatters; i++) {
    const cx = hash(i, 1, seed + 5);
    const cy = 0.15 + 0.7 * hash(i, 2, seed + 5);
    const radius = 0.012 + 0.03 * hash(i, 3, seed + 5);
    const dx = (u - cx) * 1; // meme echelle en u et v : la bande est 1:1 dans la texture
    const dy = (v - cy) * 0.35; // la bande est plus longue que large
    const wobble = 1 + 0.35 * (noise(u * 60 + i * 9, v * 60, seed + 6) - 0.5);
    const d = Math.hypot(dx, dy) / (radius * wobble);
    if (d < 1) {
      const k = clamp01((1 - d) * 4);
      r += (RUBBER.r - r) * k;
      g += (RUBBER.g - g) * k;
      b += (RUBBER.b - b) * k;
    }
  }

  // Bords effiloches : alpha qui se dechire pres de v = 0 et v = 1, et
  // au bout libre de la bande (u = 1), avec un contour dentele.
  const edgeNoise = noise(u * 40, v * 6, seed + 4);
  const fray = options.fray * (0.6 + 0.8 * edgeNoise);
  const edgeDist = Math.min(v, 1 - v);
  let a = clamp01(edgeDist / Math.max(1e-6, fray));
  const tipNoise = noise(u * 12, v * 30, seed + 7);
  const tipFray = 0.06 * (0.5 + tipNoise);
  a *= clamp01((1 - u) / tipFray);
  return { r: clamp01(r), g: clamp01(g), b: clamp01(b), a };
}

/** Echantillonne la bande dans un tampon RGBA 8 bits, `width` colonnes le
 *  long des fibres, `height` lignes en travers. Rangees du bas vers le
 *  haut (convention des textures WebGL). */
export function bakeAmate(width: number, height: number, seed: number, options: AmateOptions = AMATE_OPTIONS): Uint8Array {
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const v = (y + 0.5) / height;
    for (let x = 0; x < width; x++) {
      const u = (x + 0.5) / width;
      const px = amatePattern(u, v, seed, options);
      const o = (y * width + x) * 4;
      data[o] = Math.round(px.r * 255);
      data[o + 1] = Math.round(px.g * 255);
      data[o + 2] = Math.round(px.b * 255);
      data[o + 3] = Math.round(px.a * 255);
    }
  }
  return data;
}

/**
 * LE GRAIN DE LA FACE CLAIRE (13/09, idee de Sylvain : « si le papier
 * etait important, on pourrait mettre un grain a l'image claire et donner
 * la meme texture que celle du codex »).
 *
 * C'est le MEME papier que les bandes d'amate de la scene, moins ses
 * bords : `amatePattern` effiloche la bande sur `v` et sur la pointe `u`,
 * ce qui laisserait deux coutures transparentes dans une tuile repetee.
 * Ici l'alpha est plein partout, et la couleur seule fait le grain. Sans
 * eclaboussures de caoutchouc non plus : une goutte noire repetee tous les
 * 192 pixels se verrait comme un motif, alors qu'elle est une offrande.
 */
export const AMATE_GRAIN_OPTIONS: AmateOptions = { spatters: 0, fray: 0 };

/**
 * UNE TRANCHE DE LIGNES du papier, ecrite dans `data` (14/09).
 *
 * Meme calcul, au pixel pres, que la cuisson d'un bloc : chaque pixel ne
 * depend que de ses propres coordonnees. C'est ce qui permet de rendre la
 * main au navigateur entre deux tranches, sur un telephone ou la tuile
 * entiere coute 349 ms d'un seul tenant (Pixel 7, processeur divise par
 * quatre). Le decoupage ne change RIEN au resultat, et un test le verifie
 * octet par octet, tranches inegales comprises.
 */
export function bakeAmateGrainRows(data: Uint8Array, size: number, seed: number, y0: number, y1: number): void {
  const debut = Math.max(0, Math.min(size, Math.floor(y0)));
  const fin = Math.max(debut, Math.min(size, Math.ceil(y1)));
  for (let y = debut; y < fin; y++) {
    const v = (y + 0.5) / size;
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const px = amatePattern(u, v, seed, AMATE_GRAIN_OPTIONS);
      const o = (y * size + x) * 4;
      data[o] = Math.round(px.r * 255);
      data[o + 1] = Math.round(px.g * 255);
      data[o + 2] = Math.round(px.b * 255);
      data[o + 3] = 255;
    }
  }
}

export function bakeAmateGrain(size: number, seed: number): Uint8Array {
  const data = new Uint8Array(size * size * 4);
  bakeAmateGrainRows(data, size, seed, 0, size);
  return data;
}

/**
 * LE PAPIER SANS COUTURE (13/09). Le motif d'amate n'est pas periodique :
 * repete en tuile, il laisse une couture nette tous les 192 pixels, visible
 * a la capture. Methode classique, en deux temps :
 *
 *  1. on DECALE la tuile d'une demi-tuile : les bords deviennent continus,
 *     parce que la colonne 0 et la derniere colonne viennent desormais du
 *     milieu du motif, ou elles etaient voisines ;
 *  2. la discontinuite s'est deplacee au centre, en croix : on l'efface en
 *     fondant, dans une bande etroite autour de cette croix, l'image avec
 *     elle-meme redecalee. Le fondu ne touche jamais les bords (la bande
 *     est bien plus courte que la demi-tuile), donc l'etape 1 tient.
 *
 * Le resultat est un peu adouci le long de la croix, ce qui ne se voit pas
 * a l'opacite du grain, alors qu'une couture franche, elle, se voyait.
 */
export function bakeAmateGrainSeamless(size: number, seed: number, band = Math.max(2, Math.round(size / 8))): Uint8Array {
  return rendreSansCouture(bakeAmateGrain(size, seed), size, band);
}

/** La partie reutilisable de la methode ci-dessus : elle ne sait rien du
 * papier, elle rend periodique n'importe quelle tuile opaque. */
export function rendreSansCouture(brut: Uint8Array, size: number, band = Math.max(2, Math.round(size / 8))): Uint8Array {
  const demi = size >> 1;
  const decale = new Uint8Array(brut.length);
  for (let y = 0; y < size; y++) {
    const sy = (y + demi) % size;
    for (let x = 0; x < size; x++) {
      const sx = (x + demi) % size;
      const src = (sy * size + sx) * 4;
      const dst = (y * size + x) * 4;
      decale[dst] = brut[src];
      decale[dst + 1] = brut[src + 1];
      decale[dst + 2] = brut[src + 2];
      decale[dst + 3] = 255;
    }
  }
  const out = new Uint8Array(brut.length);
  const rampe = (d: number) => 1 - clamp01(d / band);
  for (let y = 0; y < size; y++) {
    const wy = rampe(Math.abs(y - demi));
    const sy = (y + demi) % size;
    for (let x = 0; x < size; x++) {
      const wx = rampe(Math.abs(x - demi));
      const w = 0.5 * Math.max(wx, wy);
      const sx = (x + demi) % size;
      const a = (y * size + x) * 4;
      const b = (sy * size + sx) * 4;
      for (let c = 0; c < 3; c++) out[a + c] = Math.round(decale[a + c] * (1 - w) + decale[b + c] * w);
      out[a + 3] = 255;
    }
  }
  return out;
}

/**
 * LA FEUILLE POSEE SUR LA FEUILLE (13/09, Sylvain : « la texture doit aussi
 * etre presente sur les elements de menu [...] quelque chose qui montrerait
 * que l'on a une feuille de papier posee sur une autre »).
 *
 * Un panneau est une seconde feuille : meme papier, mais plus clair, parce
 * qu'il est pose PAR-DESSUS et recoit la lumiere en premier. `k` est la
 * part de blanc : 0 rend le papier tel quel, 1 une feuille blanche. La
 * variation du grain diminue avec la meme part, jamais son signe : c'est
 * la meme fibre, vue de plus loin.
 */
export function fadeToPaper(data: Uint8Array, k: number): Uint8Array {
  const t = clamp01(k);
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i += 4) {
    out[i] = Math.round(data[i] + (255 - data[i]) * t);
    out[i + 1] = Math.round(data[i + 1] + (255 - data[i + 1]) * t);
    out[i + 2] = Math.round(data[i + 2] + (255 - data[i + 2]) * t);
    out[i + 3] = data[i + 3];
  }
  return out;
}

/**
 * L'OBSIDIENNE POLIE (13/09, Sylvain : « est-ce que l'on peut travailler le
 * cote obsidienne du darkmode : le brillant, les lames polies, l'obsidienne
 * doit se refleter dans la 2d et la 3d »).
 *
 * L'exact pendant du grain d'amate, pour la nuit. Une obsidienne taillee ne
 * fait pas de fibres : elle casse en ecailles, et la lumiere y glisse en
 * longues courbes (la fracture conchoidale, celle des eclats de verre
 * volcanique). La tuile est donc presque noire, traversee de nappes
 * courbes tres douces, faites du meme bruit de valeur mais lu en
 * coordonnees CINTREES : c'est ce cintrage qui donne l'ecaille plutot que
 * la fibre. Posee en `screen` a faible opacite, elle n'eclaircit rien :
 * elle fait glisser une lumiere.
 */
/** Une tranche de lignes du poli, meme raison et meme garantie que
 *  `bakeAmateGrainRows` : le decoupage ne change pas un octet. */
export function bakeObsidianPolishRows(data: Uint8Array, size: number, seed: number, y0: number, y1: number): void {
  const debut = Math.max(0, Math.min(size, Math.floor(y0)));
  const fin = Math.max(debut, Math.min(size, Math.ceil(y1)));
  for (let y = debut; y < fin; y++) {
    const v = (y + 0.5) / size;
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      // Cintrage : la coordonnee le long de la nappe se courbe avec la
      // hauteur, donc les nappes s'incurvent au lieu de filer droit.
      const cintre = u + 0.35 * Math.sin((v + seed * 0.11) * Math.PI * 1.6);
      const nappe = noise(cintre * 3.1, v * 1.7, seed);
      const eclat = noise(cintre * 7.3 + 11.2, v * 4.1, seed + 3);
      // Presque rien : 0,04 a 0,26 de gris. L'ecart fait tout le poli.
      const n = clamp01(0.04 + 0.16 * nappe + 0.08 * eclat * eclat);
      const o = (y * size + x) * 4;
      // Legerement violette, comme l'obsidienne du site.
      data[o] = Math.round(n * 232);
      data[o + 1] = Math.round(n * 226);
      data[o + 2] = Math.round(n * 255);
      data[o + 3] = 255;
    }
  }
}

export function bakeObsidianPolish(size: number, seed: number): Uint8Array {
  const data = new Uint8Array(size * size * 4);
  bakeObsidianPolishRows(data, size, seed, 0, size);
  return data;
}

export function bakeObsidianPolishSeamless(size: number, seed: number): Uint8Array {
  return rendreSansCouture(bakeObsidianPolish(size, seed), size);
}
