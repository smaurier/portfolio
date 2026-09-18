import { Color } from "three";

/**
 * LE LOOK DU CIEL TRAVERSE, IL NE SE REMPLACE PAS (18/09).
 *
 * `sud-sky` porte un look par direction (teinte de la photo, son dosage,
 * l'azimut du soleil, la couleur du crepuscule, celle de l'avant-jour). Le
 * 17/09, l'arc du ciel a ete mis au depot (`lireArcJour`) et la marche
 * Sud vers Ouest est tombee de 0,59 a 0,092 ; mais le LOOK, lui, se lisait
 * toujours `SKY_LOOK[direction]`, donc il se remplacait d'un bloc au commit.
 * L'anneau complet mesure le 18/09 le montre : les trois passages qui
 * depassaient encore etaient tous des arrivees a l'Est, et le diff de Sud
 * vers Est n'avait plus qu'un acteur, `uZenith` de 150e12 a 1e3069,
 * `uZenithSpread` de 0,85 a 0,30, `uDuskColor` de 000000 a 8a2a24 -- en une
 * image, sur toute la voute.
 *
 * Ce module melange deux looks au meme melange que l'arc, la lumiere, la
 * brume et la teinte (`fonduStore`). Un seul cote peut manquer : le Centre
 * et le Nord n'ont pas de photo. Le look restant est alors garde tel quel,
 * et c'est l'opacite du dome (qui fond deja) qui fait le reste.
 */
export type SkyLook = { tint: Color; tintMix: number; sunAzimuthDeg: number; dusk: Color; night?: Color };

export type SkyLookCroise = {
  tint: Color;
  tintMix: number;
  sunAzimuthDeg: number;
  dusk: Color;
  /** La couleur d'avant-jour, s'il y en a une d'un cote ou de l'autre. */
  night: Color | null;
  /** A quel point l'avant-jour est present (0..1) : 1 si les deux looks en
   *  ont une, fondu si un seul, 0 si aucun. Sert a doser l'etalement du
   *  zenith et a tirer la couleur depuis l'horizon plutot que de l'allumer. */
  poidsNuit: number;
};

/** Le plus court chemin entre deux azimuts, en degres, pour que 350 vers 10
 *  passe par 0 et non par 180. */
export function melangerAzimut(a: number, b: number, t: number): number {
  let d = ((b - a + 540) % 360) - 180;
  if (d === -180) d = 180;
  return (((a + d * t) % 360) + 360) % 360;
}

/**
 * `melange` : 0 = encore entierement le look sortant, 1 = entierement celui
 * de la route (meme convention que `arc-fondu`). `cible` est reutilisee
 * d'une image a l'autre pour ne rien allouer dans la boucle.
 */
export function croiserLooks(
  sortant: SkyLook | undefined,
  entrant: SkyLook | undefined,
  melange: number,
  cible: SkyLookCroise,
): SkyLookCroise | undefined {
  const t = melange < 0 ? 0 : melange > 1 ? 1 : melange;
  if (!sortant && !entrant) return undefined;
  if (!sortant || !entrant) {
    const seul = (entrant ?? sortant) as SkyLook;
    cible.tint.copy(seul.tint);
    cible.tintMix = seul.tintMix;
    cible.sunAzimuthDeg = seul.sunAzimuthDeg;
    cible.dusk.copy(seul.dusk);
    if (seul.night) {
      cible.night = (cible.night ?? new Color()).copy(seul.night);
      // Un seul cote a un avant-jour : il vient ou s'en va avec ce cote.
      cible.poidsNuit = seul === entrant ? t : 1 - t;
    } else {
      cible.night = null;
      cible.poidsNuit = 0;
    }
    return cible;
  }
  cible.tint.copy(sortant.tint).lerp(entrant.tint, t);
  cible.tintMix = sortant.tintMix + (entrant.tintMix - sortant.tintMix) * t;
  cible.sunAzimuthDeg = melangerAzimut(sortant.sunAzimuthDeg, entrant.sunAzimuthDeg, t);
  cible.dusk.copy(sortant.dusk).lerp(entrant.dusk, t);
  if (sortant.night && entrant.night) {
    cible.night = (cible.night ?? new Color()).copy(sortant.night).lerp(entrant.night, t);
    cible.poidsNuit = 1;
  } else if (entrant.night) {
    cible.night = (cible.night ?? new Color()).copy(entrant.night);
    cible.poidsNuit = t;
  } else if (sortant.night) {
    cible.night = (cible.night ?? new Color()).copy(sortant.night);
    cible.poidsNuit = 1 - t;
  } else {
    cible.night = null;
    cible.poidsNuit = 0;
  }
  return cible;
}

export function lookCroiseVide(): SkyLookCroise {
  return { tint: new Color(), tintMix: 0, sunAzimuthDeg: 0, dusk: new Color(), night: null, poidsNuit: 0 };
}
