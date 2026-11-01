/**
 * Calcul de contraste WCAG 2 (luminance relative + ratio), utilisé par les
 * oracles e2e là où axe ne peut pas conclure : sur les panneaux mobile,
 * bouton d'appel et cartes de projet, axe rend `incomplete` (messageKey
 * `bgImage`, impact serious) parce qu'un bloc de scène ailleurs sur la page
 * porte un background-image — même quand le panneau lui-même a un fond
 * quasi-opaque et parfaitement lisible par `getComputedStyle` (cf
 * tests/e2e/accessibilite-axe.spec.ts, 01/11). Les couleurs viennent du
 * navigateur, jamais d'une teinte choisie à l'œil.
 */

export type Rgb = readonly [number, number, number];
export type Rgba = readonly [number, number, number, number];

/** Parse "rgb(r, g, b)" / "rgba(r, g, b, a)" tel que rendu par getComputedStyle. */
export function parseCouleurCss(css: string): Rgba {
  const m = css.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/);
  if (!m) throw new Error(`couleur illisible : ${css}`);
  return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] !== undefined ? Number(m[4]) : 1];
}

/** Compose une couleur avec alpha sur un fond opaque connu (alpha blending standard). */
export function composer([r, g, b, a]: Rgba, fond: Rgb): Rgb {
  return [r * a + fond[0] * (1 - a), g * a + fond[1] * (1 - a), b * a + fond[2] * (1 - a)];
}

function canalLineaire(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** Luminance relative WCAG (formule officielle, canaux 0-255). */
export function luminanceRelative([r, g, b]: Rgb): number {
  return 0.2126 * canalLineaire(r) + 0.7152 * canalLineaire(g) + 0.0722 * canalLineaire(b);
}

/** Ratio de contraste WCAG entre deux couleurs opaques (1:1 à 21:1). */
export function ratioDeContraste(a: Rgb, b: Rgb): number {
  const [clair, sombre] = [luminanceRelative(a), luminanceRelative(b)].sort((x, y) => y - x);
  return (clair + 0.05) / (sombre + 0.05);
}
