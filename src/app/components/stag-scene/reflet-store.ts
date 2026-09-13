/**
 * La part de reflet de la scene (13/09, le miroir fumant, lot 2) : 0 la
 * nuit, 1 dans le miroir, lissee une fois par image par RevealLighting (le
 * rig qui possede l'atmosphere) et lue par les autres machineries (grade,
 * Voie lactee). Meme pattern que frostStore : un objet mute, pas d'etat
 * React a 60 fps.
 */
export const refletStore: { k: number } = { k: 0 };
