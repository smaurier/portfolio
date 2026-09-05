/**
 * L'heure de Tenochtitlan (05/09, idee de Sylvain : « au moment de la
 * contemplation, la camera tournerait seulement sur elle-meme a l'heure
 * de Mexico / Tenochtitlan »). La scene se fige a la hauteur REELLE du
 * soleil sur Mexico a l'instant present, et la camera orbite lentement.
 *
 * Position du soleil : formules NOAA simplifiees (declinaison, equation
 * du temps, angle horaire), precision de l'ordre du degre, largement
 * assez pour une hauteur de ciel. Mexico : 19.43 N, 99.13 W, fuseau
 * America/Mexico_City = UTC-6 toute l'annee (plus de changement d'heure
 * depuis 2022). Pur.
 */

export const TENOCHTITLAN = { lat: 19.4326, lon: -99.1332, utcOffsetHours: -6 } as const;

const RAD = Math.PI / 180;

/** Elevation du soleil (deg) au-dessus de l'horizon, pour une date UTC et
 * un lieu (lat nord, lon est positive). */
export function solarElevation(date: Date, lat: number, lon: number): number {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545) / 36525;
  const L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360;
  const M = (357.52911 + T * (35999.05029 - 0.0001537 * T)) % 360;
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const C = (1.914602 - T * (0.004817 + 0.000014 * T)) * Math.sin(M * RAD) + (0.019993 - 0.000101 * T) * Math.sin(2 * M * RAD) + 0.000289 * Math.sin(3 * M * RAD);
  const lambda = L0 + C;
  const eps = 23.439291 - 0.0130042 * T;
  const decl = Math.asin(Math.sin(eps * RAD) * Math.sin(lambda * RAD));
  // Equation du temps (minutes).
  const y = Math.tan((eps / 2) * RAD) ** 2;
  const eot =
    (4 / RAD) *
    (y * Math.sin(2 * L0 * RAD) - 2 * e * Math.sin(M * RAD) + 4 * e * y * Math.sin(M * RAD) * Math.cos(2 * L0 * RAD) - 0.5 * y * y * Math.sin(4 * L0 * RAD) - 1.25 * e * e * Math.sin(2 * M * RAD));
  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  const trueSolarMinutes = (((utcMinutes + eot + 4 * lon) % 1440) + 1440) % 1440;
  const hourAngle = trueSolarMinutes / 4 - 180; // deg, negatif le matin
  const latR = lat * RAD;
  const cosZenith = Math.sin(latR) * Math.sin(decl) + Math.cos(latR) * Math.cos(decl) * Math.cos(hourAngle * RAD);
  return 90 - Math.acos(Math.max(-1, Math.min(1, cosZenith))) / RAD;
}

/** L'angle horaire est-il positif (apres le midi solaire) ? */
export function isAfternoon(date: Date, lon: number): boolean {
  // Approximation suffisante : midi solaire moyen = 12 h - lon / 15 (UTC).
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60;
  const solarNoonUtc = ((12 - lon / 15) % 24 + 24) % 24;
  const d = ((utcHours - solarNoonUtc) % 24 + 24) % 24;
  return d < 12;
}

export function mexicoClock(date: Date): { hours: number; minutes: number } {
  const total = (((date.getUTCHours() + TENOCHTITLAN.utcOffsetHours) * 60 + date.getUTCMinutes()) % 1440 + 1440) % 1440;
  return { hours: Math.floor(total / 60), minutes: total % 60 };
}

/** L'inverse de l'arc de direction-light : notre soleil va de -8 deg
 * (day 0.12) a 86 deg (day 1) par un smoothstep ; on retrouve le progres
 * qui donne l'elevation demandee, par bissection. */
export function arcForElevation(elevationDeg: number): number {
  if (elevationDeg <= -8) return 0;
  if (elevationDeg >= 86) return 1;
  const target = (elevationDeg + 8) / 94; // valeur du smoothstep
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const s = mid * mid * (3 - 2 * mid);
    if (s < target) lo = mid;
    else hi = mid;
  }
  const u = (lo + hi) / 2;
  return 0.12 + 0.88 * u;
}

export type TenochtitlanNow = {
  clock: { hours: number; minutes: number };
  /** Elevation reelle du soleil (deg). */
  elevation: number;
  /** Progres de l'arc de la scene qui donne cette hauteur (0 la nuit). */
  arc: number;
  /** Apres le midi solaire : le soleil est a l'ouest (miroir dans la scene). */
  afternoon: boolean;
};

export function tenochtitlanNow(date: Date = new Date()): TenochtitlanNow {
  const elevation = solarElevation(date, TENOCHTITLAN.lat, TENOCHTITLAN.lon);
  const afternoon = elevation > -8 && isAfternoon(date, TENOCHTITLAN.lon);
  return { clock: mexicoClock(date), elevation, arc: arcForElevation(elevation), afternoon };
}
