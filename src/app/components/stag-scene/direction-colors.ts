"use client";

import type { ColorRgb } from "@/lib/reveal-arc";

/**
 * Les 5 directions du Codex Nahual (section 03, cf memory
 * project-nahual-da) — Centre/Est/Sud/Ouest/Nord. Chaque direction a
 * une teinte définie dans globals.css (paire light/dark), utilisée
 * comme couleur cible du fog, du liseré du cerf, et de l'emphase de
 * nav ("chemins révélés"). La home = jade (centre) ; les pages écho
 * passent leur direction.
 */
export type DirectionKey = "jade" | "dore" | "turquoise" | "cendre" | "obsidienne";

const CSS_VAR_BY_DIRECTION: Record<DirectionKey, string> = {
  jade: "--jade-bg",
  dore: "--dore-bg",
  turquoise: "--turquoise-bg",
  cendre: "--cendre-bg",
  obsidienne: "--obsidienne-bg",
};

/** "#00a86b" -> {r,g,b}. Suffisant pour un hex 6 chiffres (toutes les
 * variables ci-dessus sont dans ce format), pas un parseur CSS général. */
export function hexToRgb(hex: string): ColorRgb {
  const match = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) return { r: 0, g: 168, b: 107 }; // repli sur le jade connu
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}

/**
 * Palette shader saturée constante, découplée des CSS backgrounds
 * (26/08, retour Sylvain "couleur reste terne, rien qui peps") : les
 * variantes dark des CSS (--jade-bg #0e4b3b, etc.) sont dessaturées
 * pour rester lisibles en fond de surface — passées telles quelles au
 * shader, elles donnent un screen blend quasi invisible sur un cerf
 * bas-poly PBR chaud. Le shader/le fog/le rim utilisent cette palette
 * vive constante ; les CSS surfaces continuent d'utiliser leurs
 * variantes theme-dependent via --jade-bg et co.
 */
const DIRECTION_COLOR_VIVID: Record<DirectionKey, string> = {
  jade: "#00c078",       // #00a86b boosté saturation
  dore: "#f5a623",       // orange-or franc, plus punchy que #7a5218 dark
  turquoise: "#22b3c6",  // conservé, déjà vif
  cendre: "#c8b8c0",     // cendre plus lumineuse, teinte perceptible
  obsidienne: "#8b7bc9", // violet-mauve saturé, plus lisible que #2b2340
};

/**
 * Retourne la couleur shader saturée pour la direction (26/08).
 * Ancien comportement (lecture de la CSS var themée) : abandonné —
 * voir `DIRECTION_COLOR_VIVID` ci-dessus. Fonction garde son nom pour
 * ne pas casser les appelants (SceneStage la lit une fois au mount).
 */
export function readDirectionColor(direction: DirectionKey): string {
  return DIRECTION_COLOR_VIVID[direction];
}

/**
 * Teinte du fog dérivée de la couleur pleine : ~45% de saturation.
 * Historique : 15% (jade seul) → 30% (25/08 première passe couleurs
 * par direction, "trop terne") → 22% (25/08 deuxième retour Sylvain
 * "je trouve la teinte très grossière") → 45% (26/08 audit Playwright
 * 15 captures : la teinte n'atteignait quasi que le corps du cerf, le
 * fond restait noir neutre — retour Sylvain "couleur pas assez
 * marquée"). Compromis : le fog porte maintenant clairement la
 * direction cardinale à p=1 sans devenir un aplat plaqué (la
 * courbe `getFogColor × getRevealFloor` amène cette valeur
 * progressivement, jamais d'un coup).
 */
export function deriveFogTint(directionColorHex: string): ColorRgb {
  const rgb = hexToRgb(directionColorHex);
  return {
    r: Math.round(rgb.r * 0.75),
    g: Math.round(rgb.g * 0.75),
    b: Math.round(rgb.b * 0.75),
  };
}
