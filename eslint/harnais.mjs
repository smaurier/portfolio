/**
 * LE HARNAIS, PILIER 2 : LES REGLES QUI SE LINTENT.
 *
 * Reference : docs/harnais.md. Chaque regle y a sa preuve. Ce fichier ne
 * contient que des regles du coeur d'ESLint : aucun plugin a installer,
 * rien qui puisse casser a la prochaine version de eslint-config-next.
 */
import { cliquetBoucle, cliquetLignes, motifFichier } from "./cliquets.mjs";

/** Tout le code sous src/, tests unitaires de lib/ compris ; ni tests/, ni .scratch/, ni scripts/. */
const SRC = ["src/**/*.{ts,tsx}"];

/**
 * Les lectures synchrones du GPU (MDN, WebGL best practices) : chacune vide
 * le pipeline et bloque le fil principal jusqu'a ce que le GPU rattrape.
 * La liste est DUPLIQUEE dans tests/harnais/lints.test.ts a dessein : le
 * test est l'oracle independant, il ne prouve pas ce que ce module dit.
 */
export const LECTURES_GPU = ["getError", "readPixels", "getParameter", "getProgramParameter", "checkFramebufferStatus", "getBufferSubData"];

/** Ce qui ne se cree pas a chaque image : les objets three qui allouent. */
const OBJETS_THREE = "Vector2|Vector3|Vector4|Quaternion|Matrix3|Matrix4|Color|Euler|Box3|Sphere|Plane|Ray|Raycaster|Object3D";

/**
 * Selecteurs AST (esquery) : ce qui est DANS un rappel useFrame.
 * [arguments.length=1] : un setter React prend un argument ; les aides
 * setXxx(uniforms, valeur) du depot en prennent deux ou trois (relecture
 * du 22/09 : 16 des 28 hits du premier jour). Angles morts assumes : une
 * aide a un argument nommee setFoo, un setter renomme (const [, maj] =
 * useState()), dispatch de useReducer.
 */
export const SELECTEUR_ALLOCATION = `CallExpression[callee.name='useFrame'] NewExpression[callee.name=/^(${OBJETS_THREE})$/]`;
export const SELECTEUR_SET_STATE = "CallExpression[callee.name='useFrame'] CallExpression[callee.type='Identifier'][callee.name=/^set[A-Z]/][arguments.length=1]";

/**
 * Les deux regles de la boucle d'image, partagees par la config et par le
 * generateur des cliquets (scripts/harnais-baseline.mjs), qui les force en
 * erreur partout pour compter sans les derogations.
 */
export const REGLES_BOUCLE = [
  {
    selector: SELECTEUR_ALLOCATION,
    message: "Rien d'alloue dans useFrame : cree l'objet une fois, dehors (le motif `scratch` du depot), et reutilise-le. Une allocation par image nourrit le ramasse-miettes, qui rend des images longues (docs/harnais.md, pilier 2).",
  },
  {
    selector: SELECTEUR_SET_STATE,
    message: "Pas d'etat React pilote par la boucle : useFrame ecrit dans des refs, React ne re-rend pas a 60 images par seconde (docs/harnais.md, pilier 2, loi de la frontiere).",
  },
];

/** Le plafond partage par la regle max-lines (tache 5), le generateur et le test. */
export const PLAFOND_LIGNES = 400;

/**
 * Le bloc de la boucle d'image, nomme parce que trois lecteurs l'utilisent :
 * la config (ici), le generateur des cliquets et le test des cliquets, qui
 * tous deux le forcent en erreur partout pour compter sans les derogations.
 * @type {import("eslint").Linter.Config}
 */
export const CONFIG_BOUCLE = {
  files: SRC,
  rules: {
    "no-restricted-syntax": ["error", ...REGLES_BOUCLE],
  },
};

/** Le nombre de violations de la boucle dans un resultat ESLint. */
export const compterBoucle = (resultat) => resultat.messages.filter((m) => m.ruleId === "no-restricted-syntax").length;

export const harnais = [
  {
    // Loi 1 : lib/ est pure et testee a l'unite ; les composants rendent.
    // Trouve le 21/09 : vingt et un fichiers de lib/ importaient un type
    // depuis un composant. Le sens est inverse ; le type descend dans lib/.
    // Le motif **/app/** couvre aussi les pages et les layouts, par alias
    // ou par chemin relatif.
    files: ["src/lib/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/**", "**/app/**"],
              message: "lib/ est pure : elle n'importe jamais un composant ni une page (docs/harnais.md, loi 1). Le type ou la constante descend dans lib/.",
            },
          ],
        },
      ],
    },
  },
  {
    // Lecture GPU synchrone : verifie le 21/09, src/ n'en contenait aucune ;
    // la chauffe lit COMPLETION_STATUS_KHR par program.isReady() de three,
    // que cette regle ne voit pas. Les tests et .scratch en ont besoin
    // pour mesurer : ils ne sont pas sous src/.
    files: SRC,
    rules: {
      "no-restricted-properties": [
        "error",
        ...LECTURES_GPU.map((property) => ({
          property,
          message: `${property}() lit le GPU de facon synchrone et bloque le pipeline (docs/harnais.md, pilier 2). En production : program.isReady() de three (COMPLETION_STATUS_KHR) pour les programmes, renderer.capabilities pour les constantes, fenceSync et un PIXEL_PACK_BUFFER pour les pixels. Mesure dans tests/ ou .scratch/, jamais dans le site.`,
        })),
      ],
    },
  },
  // La boucle d'image : rien d'alloue, pas d'etat React pilote par elle.
  // Le selecteur callee.type='Identifier' distingue un setter React nu
  // (setNiveau(1)) d'une methode three (scratch.setScalar(1)).
  CONFIG_BOUCLE,
  // Le cliquet : les fichiers qui violaient ces regles le jour ou elles sont
  // arrivees passent en avertissement, geles a leur compte
  // (scripts/lint-baseline.json). Ils ne peuvent plus en gagner
  // (tests/harnais/cliquets.test.ts) ; a zero, ils sortent. ESLint ne tient
  // qu'une severite par regle et par fichier : c'est la derogation qui fait
  // le cliquet, pas la severite.
  ...Object.keys(cliquetBoucle).map((fichier) => ({
    files: [motifFichier(fichier)],
    rules: {
      "no-restricted-syntax": ["warn", ...REGLES_BOUCLE],
    },
  })),
  {
    // Pilier 3 : un fichier qu'on ne tient pas en tete d'un coup est un
    // fichier qu'on modifie mal. Lignes brutes, comme wc -l sur un fichier
    // termine par un retour a la ligne et comme le compteur du harnais
    // (scripts/compter-lignes.mjs) : la ligne vide apres le dernier retour
    // ne compte pas.
    files: SRC,
    rules: {
      "max-lines": ["error", { max: PLAFOND_LIGNES, skipBlankLines: false, skipComments: false }],
    },
  },
  // Le cliquet des tailles : les fichiers au-dessus du plafond le jour de
  // la regle sont geles a leur taille (scripts/lines-baseline.json) ; ils
  // ne peuvent plus grossir, chaque amaigrissement s'acquiert
  // (tests/harnais/cliquets.test.ts), et sous le plafond ils sortent. Les
  // chemins passent par motifFichier : deux d'entre eux vivent sous
  // src/app/[locale]/, que minimatch lirait comme une classe de caracteres.
  ...Object.entries(cliquetLignes).map(([fichier, taille]) => ({
    files: [motifFichier(fichier)],
    rules: {
      "max-lines": ["error", { max: taille, skipBlankLines: false, skipComments: false }],
    },
  })),
];
