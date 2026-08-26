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
 * Lit la valeur courante de la variable CSS de la direction. Résolue
 * par le navigateur selon le thème actif (@media prefers-color-scheme
 * dans globals.css) — donc renvoie la teinte light ou dark
 * automatiquement. Une seule lecture au mount côté appelant : si
 * l'utilisateur change de thème sans reload, la teinte 3D restera
 * celle du thème initial (compromis, cf memory 25/08).
 */
export function readDirectionColor(direction: DirectionKey): string {
  if (typeof window === "undefined") return "#00a86b";
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(CSS_VAR_BY_DIRECTION[direction])
    .trim();
  return value || "#00a86b";
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
