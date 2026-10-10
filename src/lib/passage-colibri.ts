/**
 * LE PASSAGE DU COLIBRI (10/10/2026, le Sud). Brainstorm du 21/09 : les
 * colibris sont « la chose a avoir vue en quittant Projets », et quatre
 * leviers (proximite, geste lisible, isolement, son) a sequencer, pas a
 * sacrifier. Mesure : la camera du Sud est a ~11 u du cerf, la boite des
 * oiseaux s'arrete a 8 u devant elle ; a l'echelle 0,06 (choix de Sylvain,
 * realiste) un colibri fait trois pixels et le geste du mythe (une etoile
 * tombe parce qu'un colibri l'a prise) se joue sans que personne le voie.
 *
 * Le passage reunit trois leviers en un moment : UN oiseau (isolement)
 * vient a 1,3 u de l'objectif (proximite : c'est la distance qui le rend
 * lisible, jamais l'echelle), tient, puis file sur une etoile qui tombe
 * (geste lisible : l'oeil est pose dessus). Une fois par arrivee au Sud.
 *
 * Cette lib decide QUAND, QUI et OU, et fait avancer l'etat du passage a
 * partir de ce que fait l'oiseau. Pure. La mecanique de vol (l'ancre
 * imposee, la vibration reduite) est dans huitzilin.ts ; le branchement
 * dans huitzilin-birds.tsx.
 */
import type { Vec3 } from "./huitzilin";

export const PASSAGE = {
  /** Secondes apres l'arrivee (la meme horloge que les etoiles jetees). */
  delai: 4,
  /** Au-dela, le visiteur a file : la bataille disperse les etoiles, rien a chasser. */
  pMax: 0.5,
  /** Distance devant l'objectif (u). */
  distance: 1.3,
  /** Decalage dans le repere camera : a droite (+x) et en haut (+y), en u.
   * Le cerf est au centre (telephone) ou aux deux tiers (bureau, colonne de
   * texte a gauche) : en haut a droite on ne le couvre jamais. */
  droite: 0.35,
  haut: 0.15,
  /** Duree du stationnaire devant l'objectif (s). */
  tenue: 2.5,
  /** Facteur de la vibration en visite (0,12 u a 1,3 u serait un saut). */
  vibration: 0.4,
  /** Intensite de l'eclat emissif pendant la visite ; dosage a la capture. */
  eclat: 0.4,
} as const;

export type EtatPassage = "attente" | "approche" | "stationnaire" | "chasse" | "fini";

export type Passage = { etat: EtatPassage; oiseau: number | null };

export type Quat = { x: number; y: number; z: number; w: number };

export function passageInitial(): Passage {
  return { etat: "attente", oiseau: null };
}

/** Une fois, au delai, tant que la nuit dure. `sinceArrival` < 0 = pas arrive. */
export function doitDeclencher(passage: Passage, sinceArrival: number, p: number): boolean {
  return passage.etat === "attente" && sinceArrival >= PASSAGE.delai && p < PASSAGE.pMax;
}

/** L'indice de l'oiseau le plus proche de la camera ; -1 sans oiseau. */
export function oiseauLePlusProche(oiseaux: readonly Vec3[], camera: Vec3): number {
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < oiseaux.length; i++) {
    const o = oiseaux[i];
    const d = (o.x - camera.x) ** 2 + (o.y - camera.y) ** 2 + (o.z - camera.z) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/** Le point devant la camera : (droite, haut, -distance) dans le repere
 * camera (three regarde vers -z), tourne par le quaternion de la camera,
 * ajoute a sa position. Rotation d'un vecteur par un quaternion unitaire :
 * v' = v + 2 q.xyz x (q.xyz x v + q.w v). */
export function pointDevantLaCamera(position: Vec3, q: Quat, spec: typeof PASSAGE = PASSAGE): Vec3 {
  const vx = spec.droite, vy = spec.haut, vz = -spec.distance;
  // t = q.xyz x v + q.w v
  const tx = q.y * vz - q.z * vy + q.w * vx;
  const ty = q.z * vx - q.x * vz + q.w * vy;
  const tz = q.x * vy - q.y * vx + q.w * vz;
  // v' = v + 2 (q.xyz x t)
  return {
    x: position.x + vx + 2 * (q.y * tz - q.z * ty),
    y: position.y + vy + 2 * (q.z * tx - q.x * tz),
    z: position.z + vz + 2 * (q.x * ty - q.y * tx),
  };
}

/** Ce que l'on observe de l'oiseau du passage, une image. `declenche` =
 * l'indice choisi a l'image du declenchement (sinon absent). */
export type Observation = {
  declenche?: number;
  mode: "hover" | "dart";
  visite: Vec3 | null;
  justKilled: number | null;
};

/** La sequence : attente -> approche (declenchement) -> stationnaire (pose
 * sur le point) -> chasse (la visite est rendue, la fleche est partie) ->
 * fini (la fleche est arrivee, etoile prise ou non). Rend le MEME objet
 * quand rien ne change (le composant compare par identite). */
export function avancerPassage(passage: Passage, o: Observation): Passage {
  switch (passage.etat) {
    case "attente":
      return o.declenche !== undefined ? { etat: "approche", oiseau: o.declenche } : passage;
    case "approche":
      return o.mode === "hover" && o.visite !== null ? { etat: "stationnaire", oiseau: passage.oiseau } : passage;
    case "stationnaire":
      return o.visite === null ? { etat: "chasse", oiseau: passage.oiseau } : passage;
    case "chasse":
      return o.mode === "hover" ? { etat: "fini", oiseau: passage.oiseau } : passage;
    case "fini":
      return passage;
  }
}

/** L'eclat emissif vise : le guerrier du soleil brille en venant et en
 * tenant ; il s'eteint en partant chasser. Le composant lisse. */
export function cibleEclat(etat: EtatPassage): number {
  return etat === "approche" || etat === "stationnaire" ? PASSAGE.eclat : 0;
}
