/**
 * LE MIROIR FUMANT : les deux faces du monde (13/09, dernier chantier).
 *
 * Le site est ne dans la nuit (le voile, le foyer, l'obsidienne). L'autre
 * face n'est pas un « mode jour » d'interface : c'est le reflet, le monde
 * vu dans le tezcatl, le miroir de Tezcatlipoca que le Codex decrit deja au
 * Nord (« il ne reflete pas, il revele ou il ment »). Le couple noir / blanc
 * est cardinal dans les sources : le Tezcatlipoca noir tient le Nord, le
 * blanc, qui est Quetzalcoatl, tient l'Ouest (Historia de los mexicanos por
 * sus pinturas ; docs/da/miroir-fumant.md). Rien de sacre n'est copie : un
 * disque d'obsidienne, de la fumee.
 *
 * Ce module est la partie PURE : le nom des deux faces, la memoire du
 * choix, et l'enveloppe temporelle de la fumee, testee. La partie qui
 * touche au document vit dans components/theme-store.ts ; la fumee
 * elle-meme dans components/miroir-fumant.tsx.
 *
 * Etat de l'art retenu (2026) : la preference se persiste, se pose AVANT
 * le premier paint (script inline, pas d'eclair), `color-scheme` et
 * `theme-color` suivent, le mouvement reduit coupe la ceremonie.
 * Choix assume, documente : la nuit reste la face par defaut, quelle que
 * soit la preference systeme ; le site est une nuit, le miroir se
 * retourne a la main.
 */
export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "nahual-theme";
/** Evenement fenetre a chaque changement de face : `detail.theme`. */
export const THEME_EVENT = "nahual:theme";
/** Evenement fenetre au depart de la ceremonie : `detail.to`. Le son y
 *  repond (un souffle). */
export const MIROIR_EVENT = "nahual:miroir";

export const THEME_COLOR: Record<Theme, string> = { dark: "#0a0710", light: "#f3ece0" };

/** Le tempo de la ceremonie, en secondes. La fumee monte du disque,
 *  couvre, tient un instant (le monde change derriere), se retire. */
export const MIROIR_TIMING = {
  /** LE TRACE (13/09, Sylvain : « toute la scene 3d devrait se dessiner
   * comme si elle etait dessinee rapidement par les auteurs du codex »).
   * Avant toute fumee, le monde se reduit a son dessin : un trait d'encre
   * sur le papier, pose depuis le disque vers les bords. Rapide : la main
   * du tlacuilo ne cherche pas. */
  trace: 0.8,
  smokeIn: 0.55,
  hold: 0.25,
  smokeOut: 1,
  /** Mouvement reduit : un fondu court, sans fumee (RGAA 13.6). */
  reducedFade: 0.25,
} as const;

export type MiroirTiming = typeof MIROIR_TIMING;

export function parseStoredTheme(raw: string | null | undefined): Theme | null {
  return raw === "light" || raw === "dark" ? raw : null;
}

export function nextTheme(theme: Theme): Theme {
  return theme === "dark" ? "light" : "dark";
}

export function miroirDuration(timing: MiroirTiming = MIROIR_TIMING): number {
  return timing.trace + timing.smokeIn + timing.hold + timing.smokeOut;
}

/** L'instant (s) ou le monde change derriere la fumee : au milieu de la tenue. */
export function miroirPeakAt(timing: MiroirTiming = MIROIR_TIMING): number {
  return timing.trace + timing.smokeIn + timing.hold / 2;
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export type SmokePhase = { phase: "in" | "hold" | "out" | "done"; k: number };

/**
 * Ou en est la fumee a l'instant `t` (s) : la phase, et sa progression
 * lissee 0..1 (le front qui avance depuis le disque en montant, la trouee
 * qui s'ouvre depuis le disque en se retirant).
 */
export function smokePhase(t: number, timing: MiroirTiming = MIROIR_TIMING): SmokePhase {
  // La fumee ne part qu'apres le trace : pendant que le monde se dessine,
  // rien ne le couvre, sinon on ne verrait pas le dessin.
  t = Number.isFinite(t) ? t - timing.trace : t;
  if (!Number.isFinite(t) || t < 0) return { phase: "in", k: 0 };
  if (t < timing.smokeIn) return { phase: "in", k: smoothstep(0, timing.smokeIn, t) };
  if (t < timing.smokeIn + timing.hold) return { phase: "hold", k: 1 };
  const out = t - timing.smokeIn - timing.hold;
  if (out < timing.smokeOut) return { phase: "out", k: smoothstep(0, timing.smokeOut, out) };
  return { phase: "done", k: 1 };
}

/**
 * L'opacite de la fumee en un point, a partir de la phase, de la distance
 * normalisee au disque (0 au disque, 1 au coin le plus loin) et du bruit
 * local (0..1). `band` : la largeur du front, en fraction de la distance.
 */
export function smokeAlpha(sp: SmokePhase, distance: number, noise: number, band = 0.35): number {
  const n = (noise - 0.5) * band;
  if (sp.phase === "in") {
    const front = sp.k * (1 + band);
    return smoothstep(front - band, front, distance + n) > 0 ? 1 - smoothstep(front - band, front, distance + n) : 1;
  }
  if (sp.phase === "hold") return 1;
  if (sp.phase === "out") {
    const hole = sp.k * (1 + band);
    return smoothstep(hole - band, hole, distance + n);
  }
  return 0;
}

/**
 * LE TRACE DU CODEX (13/09). Ce que la scene 3D doit faire pendant la
 * ceremonie : se reduire a son dessin, puis se recolorer.
 *
 *  - `amount` : combien le monde est « dessine » (0 rendu normal, 1 trait
 *    d'encre sur papier) ;
 *  - `front` : jusqu'ou le geste est alle, en fractions de la diagonale de
 *    l'ecran depuis le disque ;
 *  - `sign` : +1 le dessin se pose depuis le disque vers les bords,
 *    -1 la couleur revient depuis le disque vers les bords.
 *
 * Le fragment lit ces trois valeurs et rien d'autre : toute la
 * choregraphie est ici, pure et testee.
 */
export type CodexDraw = { amount: number; front: number; sign: 1 | -1 };

/** Un peu au-dela de 1 : le front doit SORTIR de l'ecran, sinon le coin le
 * plus eloigne du disque ne serait jamais atteint. */
const CODEX_FRONT_MAX = 1.3;

function easeOutCubic(x: number): number {
  const t = Math.max(0, Math.min(1, x));
  return 1 - (1 - t) ** 3;
}

function easeInOutCubic(x: number): number {
  const t = Math.max(0, Math.min(1, x));
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export function codexDraw(t: number, timing: MiroirTiming = MIROIR_TIMING): CodexDraw {
  if (!Number.isFinite(t) || t < 0) return { amount: 0, front: 0, sign: 1 };
  const finTrace = timing.trace;
  const finCouverture = finTrace + timing.smokeIn + timing.hold;
  const fin = miroirDuration(timing);
  if (t >= fin) return { amount: 0, front: CODEX_FRONT_MAX, sign: -1 };
  if (t < finTrace) {
    // La main pose le trait : vite d'abord, elle ralentit en finissant.
    return { amount: 1, front: easeOutCubic(t / timing.trace) * CODEX_FRONT_MAX, sign: 1 };
  }
  if (t < finCouverture) {
    // Le monde est entierement dessine ; la fumee passe, le monde change.
    return { amount: 1, front: CODEX_FRONT_MAX, sign: 1 };
  }
  // La couleur revient dans le dessin, depuis le disque.
  const u = (t - finCouverture) / timing.smokeOut;
  return { amount: 1, front: easeInOutCubic(u) * CODEX_FRONT_MAX, sign: -1 };
}
