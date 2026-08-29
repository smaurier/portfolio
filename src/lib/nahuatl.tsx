import type { ReactNode } from "react";

/**
 * Termes nahuatl / mesoamericains apparaissant dans les textes du
 * site. Wrapping en <span lang="nah"> permet aux lecteurs d'ecran
 * de basculer sur une prononciation adaptee (proche de l'espagnol
 * pour la majorite des SR — mieux que le francais par defaut qui
 * ecorche les diphtongues et diacritiques nahuatl).
 *
 * Convention : formes canoniques avec macrons/accents quand
 * pertinent, doublets ASCII pour compat texte non-diacrite. Ordre
 * pas important : le regex trie par longueur decroissante avant
 * compilation pour eviter que "Mazatl" masque "Mazātl".
 *
 * Note : "Nahua" / "nahual" sont techniquement des mots passes en
 * francais/anglais, mais SR les prononce mieux en espagnol
 * (compromis pragmatique).
 */
const NAHUATL_TERMS = [
  "Mazātl",
  "Mazatl",
  "Tonatiuh",
  "Xiuhtecuhtli",
  "Xiuhcoatl",
  "Huitzilopochtli",
  "Huitztlampa",
  "Mictlantecuhtli",
  "Mictlampa",
  "Mictlán",
  "Cihuateteo",
  "Cihuatlampa",
  "Tlahuizcalpan",
  "Tlalxicco",
  "Xochitl",
  "Teyolía",
  "Teyolia",
  "Ollin",
  "Iztli",
  "Itztli",
  "tlamatinimeh",
  "Ehecatl",
  "Nahua",
  "nahua",
  "Nahuas",
  "nahuas",
  "nahual",
  "Nahual",
];

const ESCAPED = NAHUATL_TERMS.map((t) =>
  t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
);

// Trie par longueur decroissante avant compilation : garantit que
// "Mictlantecuhtli" est teste avant "Mictl" et "Mazātl" avant "Mazatl".
const SORTED = [...ESCAPED].sort((a, b) => b.length - a.length);

// Word boundaries \b ne fonctionnent pas fiablement avec les
// caracteres accentues (Unicode). Alternative : lookahead/behind
// pour non-letters. Compat Node 18+ regex Unicode.
const REGEX = new RegExp(
  `(?<![\\p{L}\\p{N}])(${SORTED.join("|")})(?![\\p{L}\\p{N}])`,
  "gu"
);

/**
 * Rend un texte en decoupant les termes nahuatl et les wrappant en
 * <span lang="nah">. Retourne un tableau de ReactNode (strings +
 * spans) directement inlinable dans du JSX.
 */
export function renderWithNahuatl(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let lastIdx = 0;
  const re = new RegExp(REGEX);
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.slice(lastIdx, match.index));
    }
    parts.push(
      <span key={`${match.index}-${match[0]}`} lang="nah">
        {match[0]}
      </span>
    );
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx));
  return parts.length > 0 ? parts : text;
}
