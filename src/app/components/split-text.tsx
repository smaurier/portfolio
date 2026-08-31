import type { CSSProperties } from "react";

/**
 * Split-text helper (30/08, promu server-safe 31/08). Divise un texte en
 * `<span>` par caractere pour permettre les animations char-by-char
 * (stagger reveal, wave, chromatic aberration, etc.). Signature Awwwards
 * classique — typo cinetique.
 *
 * Aucun hook interne, aucun effet client — utilisable dans un Server
 * Component (utilise par PiedraSkeleton SSR pour la phrase nahuatl).
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
 * Structure DOM (31/08 fix "les mots sont coupes") : chaque MOT est un
 * `<span class="word">` avec `white-space: nowrap` — evite qu'un mot
 * soit coupe au milieu au retour a la ligne (les chars sont
 * inline-block pour l'animation, sans nowrap sur le parent word le
 * navigateur les traiterait comme atoms independants).
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

/** Un mot avec ses chars — les espaces sont rendus a part entre les mots. */
type Token = { kind: "word"; chars: string[] } | { kind: "space"; ch: string };

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let buffer: string[] = [];
  const flushWord = () => {
    if (buffer.length > 0) {
      tokens.push({ kind: "word", chars: buffer });
      buffer = [];
    }
  };
  for (const ch of Array.from(text)) {
    if (ch === " " || ch === " ") {
      flushWord();
      tokens.push({ kind: "space", ch });
    } else {
      buffer.push(ch);
    }
  }
  flushWord();
  return tokens;
}

export default function SplitText({ text, className, charStyle, ariaLabel }: Props) {
  const tokens = tokenize(text);
  const totalChars = Array.from(text).filter((ch) => ch !== " " && ch !== " ").length;
  let charCounter = 0;
  return (
    <span className={className} aria-label={ariaLabel ?? text}>
      {tokens.map((token, tokenIndex) => {
        if (token.kind === "space") {
          const style: CSSProperties = {
            ["--char-index" as string]: charCounter,
            ["--char-count" as string]: totalChars,
            display: "inline-block",
            whiteSpace: "pre",
          };
          return (
            <span
              key={`s-${tokenIndex}`}
              className="space"
              aria-hidden="true"
              style={style}
            >
              {token.ch}
            </span>
          );
        }
        return (
          <span
            key={`w-${tokenIndex}`}
            className="word"
            aria-hidden="true"
            style={{ display: "inline-block", whiteSpace: "nowrap" }}
          >
            {token.chars.map((ch, i) => {
              const globalIndex = charCounter++;
              const style: CSSProperties = {
                ...(charStyle?.(globalIndex, totalChars) ?? {}),
                ["--char-index" as string]: globalIndex,
                ["--char-count" as string]: totalChars,
                display: "inline-block",
              };
              return (
                <span
                  key={i}
                  className="char"
                  aria-hidden="true"
                  style={style}
                >
                  {ch}
                </span>
              );
            })}
          </span>
        );
      })}
    </span>
  );
}
