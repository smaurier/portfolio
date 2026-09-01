"use client";

import type { ColorRgb } from "@/lib/reveal-arc";

/**
 * Les 5 directions du Codex Nahual (section 03, cf memory
 * project-nahual-da) : Centre/Est/Sud/Ouest/Nord. Chaque direction a
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
 * pour rester lisibles en fond de surface : passées telles quelles au
 * shader, elles donnent un screen blend quasi invisible sur un cerf
 * bas-poly PBR chaud. Le shader/le fog/le rim utilisent cette palette
 * vive constante ; les CSS surfaces continuent d'utiliser leurs
 * variantes theme-dependent via --jade-bg et co.
 *
 * 31/08 : les memes valeurs sont exposees en CSS vars non-themees
 * dans globals.css (--cardinal-jade, --cardinal-dore, etc.) pour tous
 * les contextes CSS qui ont besoin de la palette vive constante
 * (voile de chargement, tout usage "signal"). Single source of truth
 * partagee entre ce fichier JS et ces CSS vars : synchroniser
 * manuellement lors d'un changement de teinte.
 */
export const DIRECTION_COLOR_VIVID: Record<DirectionKey, string> = {
  // Palette tranchee 28/08 (retour Sylvain "couleurs trop proches
  // entre rubriques"). 5 teintes bien separees du cercle chromatique
  // (vert / jaune-or / bleu / rose corail / violet fonce), aucune
  // ne trahit son ancrage mytho : juste plus saturees / tranchees.
  jade: "#00c078",       // Centre Xiuhtecuhtli : jade sacre nahua
  dore: "#ffb400",       // Est Tonatiuh : or franc soleil zenith
  turquoise: "#0f6bb8",  // Sud Huitzilopochtli : bleu chalchihuitl profond
  cendre: "#d76464",     // Ouest Cihuateteo : rose corail crepuscule
  obsidienne: "#6b3fa8", // Nord Mictlantecuhtli : violet profond mysterieux
};

/**
 * Retourne la couleur shader saturée pour la direction (26/08).
 * Ancien comportement (lecture de la CSS var themée) : abandonné :
 * voir `DIRECTION_COLOR_VIVID` ci-dessus. Fonction garde son nom pour
 * ne pas casser les appelants (SceneStage la lit une fois au mount).
 */
export function readDirectionColor(direction: DirectionKey): string {
  return DIRECTION_COLOR_VIVID[direction];
}

/**
 * Palette accent complémentaire par direction (Phase 4 du plan
 * couleurs post-audit, 27/08). Chaque direction porte une couleur
 * dominante (cardinale, cf DIRECTION_COLOR_VIVID) ET un accent
 * chromatique complémentaire, appliqué par un sous-ensemble de
 * pétales (~15%) : rompt le monochrome, crée un dialogue de teintes
 * au lieu d'un aplat cardinal.
 *
 * Choix des complémentaires (roue chromatique) + intention mytho :
 *  - jade (vert)       → orange chaud (#f97316), contraste net
 *  - doré (jaune-or)   → bleu profond (#4c6ef5), fraîcheur contre chaleur
 *  - turquoise (cyan)  → orange chaud (#f97316), même famille que jade↔orange
 *  - cendre (rose)     → vert doux (#86efac), végétal contre minéral
 *  - obsidienne (violet) → doré cempasúchil (#f5a623) : signature
 *    Día de los Muertos : la fleur qui guide les âmes garde sa vraie
 *    couleur contre le violet nord/mort, symbolisme direct.
 *
 * 28/08 : accents realignes sur palette tranchee. Cendre passe rose
 * corail (main), accent vert doux (complementaire). Turquoise passe
 * bleu profond (main), accent or franc (complementaire chaud).
 */
export const DIRECTION_ACCENT_COMPLEMENTARY: Record<DirectionKey, string> = {
  jade: "#f97316",
  dore: "#4c6ef5",
  turquoise: "#ffb400",
  cendre: "#4ade80",
  obsidienne: "#ffb400",
};

export function readDirectionAccentColor(direction: DirectionKey): string {
  return DIRECTION_ACCENT_COMPLEMENTARY[direction];
}

/**
 * Teinte du fog dérivée de la couleur pleine : ~45% de saturation.
 * Historique : 15% (jade seul) → 30% (25/08 première passe couleurs
 * par direction, "trop terne") → 22% (25/08 deuxième retour Sylvain
 * "je trouve la teinte très grossière") → 45% (26/08 audit Playwright
 * 15 captures : la teinte n'atteignait quasi que le corps du cerf, le
 * fond restait noir neutre : retour Sylvain "couleur pas assez
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
