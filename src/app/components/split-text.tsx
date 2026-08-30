"use client";

import type { CSSProperties } from "react";

/**
 * Split-text helper (30/08). Divise un texte en `<span>` par caractere
 * pour permettre les animations char-by-char (stagger reveal, wave,
 * chromatic aberration, etc.). Signature Awwwards classique — typo
 * cinetique.
 *
 * Deux CSS custom properties exposees par char :
 *  - `--char-index` : index du caractere dans la chaine (0-based)
 *  - `--char-count` : nombre total de caracteres (permet des ratios
 *    pour delais proportionnels a la longueur)
 *
 * L'animation reelle vit dans le CSS parent (via `.split-text > span`
 * ou classe passee en prop). Ce composant fournit juste la structure
 * DOM + les vars.
 *
 * Whitespace preserve (espaces gardees comme `<span>` avec la classe
 * `.space`) pour permettre des animations differentes sur les mots vs
 * les separateurs.
 */

type Props = {
  text: string;
  className?: string;
  /** Delai (ms) entre chaque char. Applique en CSS via
   *  transition-delay ou animation-delay dans le parent. Ce composant
   *  n'anime rien lui-meme, il fournit juste l'index. */
  charStyle?: (index: number, total: number) => CSSProperties;
  /** aria-label : le texte complet est expose aux SR ; les chars
   *  individuels sont aria-hidden pour eviter les lettres epelees.
   *  Si omis, utilise le text lui-meme. */
  ariaLabel?: string;
};

export default function SplitText({ text, className, charStyle, ariaLabel }: Props) {
  const chars = Array.from(text);
  const total = chars.length;
  return (
    <span className={className} aria-label={ariaLabel ?? text}>
      {chars.map((ch, i) => {
        const isSpace = ch === " " || ch === " ";
        const style: CSSProperties = {
          ...(charStyle?.(i, total) ?? {}),
          ["--char-index" as string]: i,
          ["--char-count" as string]: total,
          display: "inline-block",
          whiteSpace: isSpace ? "pre" : undefined,
        };
        return (
          <span
            key={i}
            className={isSpace ? "space" : "char"}
            aria-hidden="true"
            style={style}
          >
            {ch}
          </span>
        );
      })}
    </span>
  );
}
