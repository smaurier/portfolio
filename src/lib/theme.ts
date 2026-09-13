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
  smokeIn: 0.9,
  hold: 0.3,
  smokeOut: 1.2,
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
  return timing.smokeIn + timing.hold + timing.smokeOut;
}

/** L'instant (s) ou le monde change derriere la fumee : au milieu de la tenue. */
export function miroirPeakAt(timing: MiroirTiming = MIROIR_TIMING): number {
  return timing.smokeIn + timing.hold / 2;
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
