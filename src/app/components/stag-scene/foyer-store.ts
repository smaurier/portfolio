import { getOrbitCameraPosition, getOrbitCameraTarget } from "@/lib/camera-path";
import { initialArrival, type CameraPose } from "@/lib/foyer";

/**
 * Le foyer (08/09) : etat partage de l'ARRIVEE sur le site, entre le voile
 * (DOM, hors du canvas et hors des providers) et la scene 3D.
 *
 * Meme idiome que frostStore / xiuhcoatlStore : un objet de module, mute
 * en useFrame ou depuis une timeline GSAP, lu sans passer par React (le
 * rythme est celui de la frame, pas celui du rendu).
 *
 * `arrival` est l'horloge unique du passage : 0 a l'instant ou la fumee
 * commence a se retirer, 1 une fois le monde au repos. Tout ce qui bouge
 * pendant l'arrivee la lit (camera, braises du foyer, braseros), personne
 * n'a son propre minuteur.
 *
 * `camera` est publiee par OrbitCamera a chaque frame : le voile en a
 * besoin pour poser sa flamme EXACTEMENT sur la projection du foyer 3D
 * (raccord de medium). La publier plutot que la recalculer cote DOM evite
 * d'avoir deux verites sur le rig (mobile, blends par direction, etc.).
 */
export const foyerStore: {
  arrival: number;
  ceremony: boolean;
  camera: CameraPose;
} = {
  /** 0 = le voile s'ouvre, 1 = au repos. Part a 0 : la camera est deja
   *  posee a l'angle d'arrivee derriere le voile, donc rien ne saute au
   *  moment de l'ouverture.
   *
   *  Sauf sous mouvement reduit, ou l'on part a 1 : le canvas y tourne en
   *  frameloop "demand" et cesse de rendre apres les premieres images, donc
   *  tout ce qui lit l'arrivee doit deja etre a son etat final. Sans ca, la
   *  camera restait 1,15 u trop haute, les braseros eteints et les braises
   *  bloquees a fond pour toute la visite. */
  arrival: initialArrival(
    typeof window !== "undefined" &&
      !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  ),
  /** La ceremonie complete a-t-elle lieu ? Decide une fois au boot par
   *  FoyerArrival (le feu du foyer ne s'eteint jamais : cf lib/foyer). */
  ceremony: true,
  /** Pose courante de la camera. Valeur de depart = le repos calcule, au
   *  cas ou le voile s'ouvrirait avant la premiere frame R3F. */
  camera: {
    position: getOrbitCameraPosition(0),
    target: getOrbitCameraTarget(),
    fovDeg: 45,
    frameShift: 0,
  },
};

// Lecture externe (verifications Playwright, console), comme __nahualFrost.
if (typeof window !== "undefined") {
  (window as unknown as { __nahualFoyer?: unknown }).__nahualFoyer = foyerStore;
}
