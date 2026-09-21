/**
 * LES CINQ DIRECTIONS (deplace ici le 21/09, tranche A du harnais).
 *
 * Ce type vivait dans `components/stag-scene/direction-colors.ts`, un
 * second, identique, dans `cardinal-transition-context.tsx`, et un
 * troisieme dans `lib/nepantla.ts` (trouve a la relecture). Vingt et un
 * fichiers de lib/ les importaient : lib/ dependait des composants, a
 * l'envers de la loi 1 (docs/harnais.md). Les deux noms sont gardes, les
 * composants re-exportent, rien ne casse.
 *
 *   jade        le Centre, Tlalxicco
 *   dore        l'Est, Tlahuizcalpan
 *   turquoise   le Sud, Huitztlampa
 *   cendre      l'Ouest, Cihuatlampa
 *   obsidienne  le Nord, Mictlampa
 */
export type DirectionKey = "jade" | "dore" | "turquoise" | "cendre" | "obsidienne";

/** Nom historique du meme type, celui du contexte de transition cardinale. */
export type CardinalDirection = DirectionKey;
