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
/**
 * Approximation phonetique francaise lisible pour chaque terme.
 * Servie via title (tooltip hover pour utilisateurs voyants,
 * lecture par NVDA/JAWS/VoiceOver comme description
 * complementaire). Approximation FR plutot qu'IPA pur car les SR
 * n'ont pas de moteur IPA fiable et un utilisateur voyant
 * decouvre plus vite "to-na-tioutl" que /to.na.ˈtiwtɬ/.
 *
 * Convention : syllabes tiretees, "tl" = son [tɬ] specifique
 * nahuatl (imite proche d'un "tl" francais suivi d'un souffle),
 * "hw" = h aspire suivi de w ("houa"), "ts" = affricate.
 */
const PRONUNCIATION: Record<string, string> = {
  "Mazātl": "ma-satl",
  "Mazatl": "ma-satl",
  "Tonatiuh": "to-na-tioutl",
  "Xiuhtecuhtli": "chiou-te-kout-li",
  "Xiuhcoatl": "chiou-ko-atl",
  "Huitzilopochtli": "hwit-si-lo-potch-tli",
  "Huitztlampa": "hwits-tlam-pa",
  "Mictlantecuhtli": "mik-tlan-te-kout-li",
  "Mictlampa": "mik-tlam-pa",
  "Mictlán": "mik-tlan",
  "Cihuateteo": "si-oua-te-te-o",
  "Cihuatlampa": "si-oua-tlam-pa",
  "Tlahuizcalpan": "tla-ouiz-kal-pan",
  "Tlalxicco": "tlal-chik-ko",
  "Xochitl": "cho-chi-tl",
  "Teyolía": "te-yo-li-a",
  "Teyolia": "te-yo-li-a",
  "Ollin": "ol-lin",
  "Iztli": "its-tli",
  "Itztli": "its-tli",
  "tlamatinimeh": "tla-ma-ti-ni-meh",
  "Ehecatl": "e-he-katl",
  "Nahua": "na-oua",
  "nahua": "na-oua",
  "Nahuas": "na-ouas",
  "nahuas": "na-ouas",
  "nahual": "na-oualtl",
  "Nahual": "na-oualtl",
};

const NAHUATL_TERMS = Object.keys(PRONUNCIATION);

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
    const pronunciation = PRONUNCIATION[match[0]];
    parts.push(
      <span
        key={`${match.index}-${match[0]}`}
        lang="nah"
        title={pronunciation ? `Prononciation : ${pronunciation}` : undefined}
      >
        {match[0]}
      </span>
    );
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx));
  return parts.length > 0 ? parts : text;
}
