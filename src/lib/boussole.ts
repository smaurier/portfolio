/**
 * LA BOUSSOLE VRAIE (13/09). Tout le site repose sur les directions ;
 * jusqu'ici elles etaient celles de l'ecran. Sur telephone, la rose des
 * vents s'aligne sur le vrai nord : le Nord devient le nord.
 *
 * Ce que donnent les capteurs (MDN, DeviceOrientationEvent) :
 *  - `deviceorientationabsolute` (Chrome Android) : alpha est la rotation
 *    du telephone autour de la verticale, ANTI-horaire, 0 = le haut du
 *    telephone pointe le nord. Le cap horaire du haut du telephone est
 *    donc 360 - alpha. La rotation est ZXY (alpha puis beta puis gamma) :
 *    l'axe y du telephone projete au sol garde l'azimut -alpha tant que le
 *    telephone n'est pas retourne, l'inclinaison ne change rien.
 *  - Safari iOS : `webkitCompassHeading` sur `deviceorientation`, cap
 *    horaire depuis le nord magnetique, avec `webkitCompassAccuracy` en
 *    degres (-1 = inconnu). iOS 13+ exige `requestPermission()` dans un
 *    geste, en HTTPS.
 *  - Le nord magnetique et le vrai nord different de la declinaison, ~2
 *    degres a Lyon en 2026 : sous la precision des capteurs, ignoree.
 * Precision reelle : 5 a 10 degres, une mesure qui tremble (lissee ici),
 * qui derive pres d'un aimant et qui peut etre fausse de 20 degres sur un
 * telephone jamais calibre. Pour un site cardinal, c'est assez : ce qui
 * compte, c'est que le Nord tourne quand tu tournes.
 */
export type LectureOrientation = {
  alpha?: number | null;
  beta?: number | null;
  gamma?: number | null;
  absolute?: boolean;
  webkitCompassHeading?: number | null;
  webkitCompassAccuracy?: number | null;
};

function mod360(a: number): number {
  return ((a % 360) + 360) % 360;
}

/** Le cap horaire (0 nord, 90 est) du haut du telephone, ou null si le
 * capteur n'a pas de reference absolue. */
export function capDepuisEvenement(e: LectureOrientation): number | null {
  if (typeof e.webkitCompassHeading === "number" && Number.isFinite(e.webkitCompassHeading)) {
    return mod360(e.webkitCompassHeading);
  }
  if (e.absolute && typeof e.alpha === "number" && Number.isFinite(e.alpha)) {
    return mod360(360 - e.alpha);
  }
  return null;
}

/** Rotation a appliquer a la rose (degres, sens CSS horaire) pour que son
 * nord pointe le vrai nord : l'inverse du cap, sur le plus court chemin. */
export function rotationRose(cap: number): number {
  const r = mod360(-cap);
  return r > 180 ? r - 360 : r;
}

const SNAP_EPSILON = 0.05;
/** Lissage exponentiel d'un angle sur le plus court arc (les degres
 * bouclent : de 350 vers 10, on passe par 0). Snap sous epsilon. */
export function approachAngle(current: number, target: number, alpha: number): number {
  let delta = mod360(target - current);
  if (delta > 180) delta -= 360;
  const next = mod360(current + delta * alpha);
  const reste = Math.abs(mod360(target - next) > 180 ? mod360(target - next) - 360 : mod360(target - next));
  return reste < SNAP_EPSILON ? mod360(target) : next;
}

export type LectureCap = { cap: number; precision?: number | null };
export type EtatBoussole = "absente" | "incertaine" | "vive";

/** Au-dela de cette precision iOS (degres), la boussole est dite incertaine. */
export const PRECISION_INCERTAINE = 25;

export function etatBoussole(lecture: LectureCap | null): EtatBoussole {
  if (!lecture) return "absente";
  const p = lecture.precision;
  if (typeof p === "number" && (p < 0 || p > PRECISION_INCERTAINE)) return "incertaine";
  return "vive";
}
