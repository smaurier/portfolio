/**
 * LE HARNAIS, PILIER 2 : LES REGLES QUI SE LINTENT.
 *
 * Reference : docs/harnais.md. Chaque regle y a sa preuve. Ce fichier ne
 * contient que des regles du coeur d'ESLint : aucun plugin a installer,
 * rien qui puisse casser a la prochaine version de eslint-config-next.
 */

/** Tout le code du site ; ni les tests, ni les sondes de .scratch, ni scripts/. */
const SRC = ["src/**/*.{ts,tsx}"];

/**
 * Les lectures synchrones du GPU (MDN, WebGL best practices) : chacune vide
 * le pipeline et bloque le fil principal jusqu'a ce que le GPU rattrape.
 * La liste est DUPLIQUEE dans tests/harnais/lints.test.ts a dessein : le
 * test est l'oracle independant, il ne prouve pas ce que ce module dit.
 */
export const LECTURES_GPU = ["getError", "readPixels", "getParameter", "getProgramParameter", "checkFramebufferStatus", "getBufferSubData"];

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
];
