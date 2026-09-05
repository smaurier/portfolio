import type { DirectionKey } from "@/app/components/stag-scene/direction-colors";

/**
 * Orientation cardinale des scenes (05/09, idee de Sylvain : « au sud
 * orienter la scene au sud, au nord au nord... on commencerait avec la
 * camera dans la meme position par rapport au cerf, mais la disposition
 * de tout l'environnement autour serait changee »).
 *
 * Le cerf, la camera, la lumiere et les astres ne bougent pas. Seul le
 * DECOR neutre (terrain, montagnes, vegetation, herbe, Piedra) tourne
 * autour de l'axe du cerf. Le decor a sa propre boussole : dans la
 * disposition d'origine, la camera de tete de page (en +z, regard vers
 * -z) fait face au SUD du decor : c'est ce que dit l'astronomie de la
 * page Projets (le soleil se leve a gauche, donc a l'est ; la lune se
 * couche a droite, donc a l'ouest). Le centre (accueil) garde cette
 * disposition (« si pas d'orientation specifique, on garde la
 * disposition du centre »), le Sud aussi puisque c'est deja elle.
 *
 * Angle monde = atan2(x, z). rotateY(theta) : (x, z) -> (x cos + z sin,
 * -x sin + z cos), la convention de three.js pour une rotation autour de
 * +y (Object3D.rotation.y).
 */

export type Vec2 = { x: number; z: number };

/** Boussole du decor, dans son repere d'origine (non tourne). */
export const DECOR_COMPASS = {
  south: { x: 0, z: -1 },
  north: { x: 0, z: 1 },
  east: { x: -1, z: 0 },
  west: { x: 1, z: 0 },
} as const;

/** Rotation d'un vecteur (x, z) autour de +y, convention three.js. */
export function rotateY(v: Vec2, angle: number): Vec2 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: v.x * c + v.z * s, z: -v.x * s + v.z * c };
}

/** Angle de rotation du decor (radians, autour de +y) pour que la camera
 * de tete de page regarde vers la direction cardinale de la page. */
const ANGLE: Record<DirectionKey, number> = {
  jade: 0, // le centre : disposition d'origine
  turquoise: 0, // le Sud : deja face au sud
  dore: -Math.PI / 2, // l'Est vient de la gauche vers l'avant
  cendre: Math.PI / 2, // l'Ouest vient de la droite vers l'avant
  obsidienne: Math.PI, // le Nord : demi-tour
};

export function orientationAngle(direction: DirectionKey): number {
  return ANGLE[direction];
}

/** Un point du monde exprime dans le repere du decor tourne de `angle`
 * (pour interroger la hauteur du terrain depuis l'exterieur du groupe). */
export function toDecorLocal(x: number, z: number, angle: number): Vec2 {
  return rotateY({ x, z }, -angle);
}

function wrapAngle(a: number): number {
  const w = Math.atan2(Math.sin(a), Math.cos(a));
  // atan2 rend ]-pi, pi] sauf -pi exactement pour certains arguments.
  return w <= -Math.PI ? Math.PI : w;
}

/** Un pas de lissage de `current` vers `target` par le plus court arc :
 * k dans [0, 1], k = 1 saute directement. Resultat dans ]-pi, pi]. */
export function stepAngle(current: number, target: number, k: number): number {
  const delta = wrapAngle(target - current);
  const kk = k < 0 ? 0 : k > 1 ? 1 : k;
  return wrapAngle(current + delta * kk);
}
