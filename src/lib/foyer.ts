import type { Vec3 } from "./camera-path";

/**
 * LE FOYER (08/09) : l'arrivee sur le site.
 *
 * Deux feux dans le systeme nahua, et le site les distingue :
 *  - le FEU NOUVEAU (xiuhmolpilli, Sahagun livre VII) s'eteint et se
 *    rallume tous les 52 ans. C'est un evenement, il se merite : c'est
 *    la mue d'or de fin de parcours (cf project-nahual-da, 06/09), et
 *    ce module n'y touche pas ;
 *  - le FEU DU FOYER (Xiuhtecuhtli, l'axe du monde) ne s'eteint jamais.
 *    C'est un etat. Le Codex du site le dit deja pour le Centre : « le
 *    feu qui brule sans jamais s'eteindre. Ici c'est la maison ».
 *
 * L'ecran de chargement est la nuit du rite : les feux eteints, le monde
 * noir, l'attente. Sa resolution n'est donc PAS un allumage. Le visiteur
 * n'allume rien : le voile s'ecarte parce qu'il s'est approche assez pres
 * pour voir que le foyer brulait depuis le debut.
 *
 * ARBITRAGE RENDU LE 08/09 (les deux lectures etaient attestees, elles ne
 * pouvaient pas etre vraies sur la meme page). Ce qui a tranche, c'est le
 * RITE DU NOUVEAU-NE, trouve par la passe de sources du Centre : on pose
 * l'enfant pres du feu quatre jours pour rechauffer son tonalli, et
 * pendant ces quatre jours PERSONNE NE PREND DE FEU AU FOYER, pour ne pas
 * emporter son feu interieur. Au Centre, le feu ne se prend donc pas et ne
 * s'allume pas : il se recoit. Celui qui arrive sur le site est l'enfant
 * pose pres du feu, pas le pretre au foret. Et pour un portfolio, le
 * centre est justement d'ou vient ce qu'on est. Le forage (le tlequauitl
 * sur la poitrine) garde tout son poids la ou il a sa place : la mue d'or
 * de fin de parcours.
 *
 * Consequence sur le geste : rien ne se fond, tout se range.
 *  - les quatre dots cardinaux du voile rejoignent la boussole (c'est le
 *    meme quinconce, memes couleurs, meme disposition : la carte du
 *    cosmos montree pendant l'attente devient l'instrument de nav) ;
 *  - le dot central ne bouge pas : il se dissout dans les braises 3D qui
 *    brulent deja au meme pixel (raccord de medium DOM -> WebGL cache
 *    sur un point brillant, seule facon de ne pas voir la couture) ;
 *  - le voile n'est pas essuye par une forme geometrique : c'est de la
 *    fumee de copal, et elle se retire depuis la clarte du foyer.
 *
 * Source unique du tempo et de la geometrie, comme lib/nepantla.ts l'est
 * pour le passage cardinal. Partie pure, testee.
 */

export type Viewport = { width: number; height: number };
export type ScreenPoint = { x: number; y: number };

/** Les quatre directions qui voyagent vers la boussole (le Centre reste). */
export type FlyingDirection = "dore" | "turquoise" | "cendre" | "obsidienne";

/**
 * Ordre de depart des dots : la meme onde du jour que leur arrivee dans
 * le voile (aube -> midi -> crepuscule -> mort). Ils repartent comme ils
 * sont venus ; le Centre n'est pas du voyage, il est le foyer.
 */
export const DOT_FLIGHT_ORDER: readonly FlyingDirection[] = [
  "dore",
  "turquoise",
  "cendre",
  "obsidienne",
] as const;

/**
 * Le foyer dans le repere monde : sur l'axe (le cerf est l'axe du monde),
 * juste au-dessus du sol. C'est la hauteur ou naissent les braises de
 * CenterXiuhtecuhtli (y=0, montee jusqu'a 4) : on vise le coeur du feu,
 * pas sa base, sinon le raccord tombe dans l'herbe.
 */
export const HEARTH_WORLD: Vec3 = { x: 0, y: 0.35, z: 0 };

/**
 * Tempo unique de l'arrivee (secondes / noms d'ease GSAP). Meme discipline
 * que NEPANTLA_TIMING : une seule horloge, lue par le voile, la boussole,
 * la camera et les braseros.
 *
 * Le geste tient en moins de deux secondes : c'est une arrivee, pas une
 * cinematique. La cinematique, c'est la mue d'or, et elle se merite.
 */
export const FOYER_TIMING = {
  /** La flamme centrale s'ouvre : elle ne jaillit pas, elle grandit. */
  sparkDuration: 0.45,
  /** La fumee ne se retire qu'une fois la flamme lisible. */
  openDelay: 0.12,
  openDuration: 1.1,
  /** Les dots partent quand le monde derriere est deja visible. */
  flightDelay: 0.2,
  flightDuration: 0.9,
  flightStagger: 0.05,
  /** Le halo du dot se dissout SUR PLACE une fois pose, il ne s'efface
   *  pas en vol : c'est un rangement, pas une disparition. */
  landingFadeDuration: 0.35,
  /** La flamme du foyer se leve avant que la fumee ne l'atteigne : quand
   *  la trouee arrive sur elle, elle est deja la, elle n'apparait pas. */
  hearthRiseDelay: 0.18,
  hearthRiseDuration: 0.4,
  /** Le relais : la flamme DOM s'efface pendant que les braises WebGL
   *  deviennent lisibles. Le raccord de medium se joue ici. */
  handoffDelay: 0.62,
  handoffDuration: 0.7,
  /** La camera descend l'axe : grammaire jade (implosion axiale). */
  descentDelay: 0.3,
  descentDuration: 1.4,
  /** Le contenu se pose PENDANT la descente, pas apres. */
  contentDelay: 0.4,
  contentDuration: 0.9,
  openEase: "power2.inOut",
  flightEase: "power3.inOut",
  descentEase: "power3.out",
  /** prefers-reduced-motion : fondu court, aucun deplacement (RGAA 13.6).
   *  Meme valeur que NEPANTLA_TIMING.reducedFadeDuration : un seul reflexe. */
  reducedFadeDuration: 0.2,
} as const;

/** Ecart entre deux braseros qui prennent, en fraction de l'arrivee. Les
 *  coureurs du rite : la flamme ne saisit pas les cinq d'un coup, elle
 *  fait le tour. Cinq braseros a 0.12 : le dernier part a 0.48, il lui
 *  reste plus de la moitie de l'arrivee pour monter. */
const BRAZIER_STAGGER = 0.12;
const BRAZIER_COUNT = 5;

/** Amplitudes de la descente. A regler a l'oeil, comme le reste du rig. */
const ARRIVAL_LIFT = 1.15; // unites monde : la camera part plus haut
const ARRIVAL_PULL = 0.06; // rayon : elle part legerement plus pres
const ARRIVAL_FOV = -3; // degres : focale un peu plus longue, qui s'ouvre

/**
 * QUATRE JOURS, et le chiffre n'est pas arbitraire : c'est la duree du rite
 * du nouveau-ne, pendant laquelle on ne prend pas de feu au foyer. Passe ce
 * delai, un visiteur est de nouveau un arrivant.
 *
 * Ce que ca vaut en pratique : une intro est un cadeau a la premiere visite
 * et une insulte a la cinquieme. Un jure revient, un prospect revient, et
 * souvent sur plusieurs jours. Douze heures (premier reglage, arbitraire)
 * les auraient fait repasser par la ceremonie a chaque session ; quatre
 * jours collent au rite ET au comportement reel. C'est un reglage : le
 * changer ne change rien d'autre que ce delai.
 */
export const HEARTH_TTL_MS = 4 * 24 * 60 * 60 * 1000;

/** Ou l'on note la derniere visite. Lu deux fois : par un script inline
 *  avant le premier paint (pour ne pas voir demarrer une ceremonie qu'on
 *  va couper), et par FoyerArrival qui, lui, fait foi. */
export const HEARTH_STORAGE_KEY = "nahual-hearth";

function clamp01(t: number): number {
  if (Number.isNaN(t)) return 0;
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/** Lent-rapide-lent. Meme cloche que le passage cardinal (nepantla) : le
 *  changement de vitesse est la signature du site, pas la vitesse. */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Deceleration franche : on arrive vite, on se pose longuement. */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function normalize(v: Vec3): Vec3 {
  const length = Math.sqrt(dot(v, v));
  if (length === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / length, y: v.y / length, z: v.z / length };
}

export type CameraPose = {
  position: Vec3;
  target: Vec3;
  /** Champ de vision VERTICAL en degres (convention three.js). */
  fovDeg: number;
  /** Le cadre decale (10/09, lib/frame-offset) : fraction de la largeur
   *  dont le centre du cadre est glisse, 0 au Centre et sur mobile. La
   *  projection a la main ci-dessous doit le connaitre, sinon la flamme
   *  du voile se pose a cote du foyer sur toute page ou le cadre est
   *  decale. */
  frameShift?: number;
};

/**
 * Ou tombe un point du monde sur l'ecran, en pixels. Reproduit la
 * projection perspective de three.js sans importer three : la lib reste
 * pure et testable en node, comme camera-path.
 *
 * Sert au raccord de medium : le dot central du voile (DOM) doit naitre
 * EXACTEMENT sur la projection du foyer (WebGL), sinon l'oeil voit le
 * saut au moment du passage.
 *
 * Retourne null si le point est derriere la camera : il n'a pas de place
 * a l'ecran, et l'appelant doit retomber sur son placement par defaut.
 */
export function projectToScreen(
  point: Vec3,
  camera: CameraPose,
  viewport: Viewport,
): ScreenPoint | null {
  const forward = normalize(sub(camera.target, camera.position));
  const right = normalize(cross(forward, { x: 0, y: 1, z: 0 }));
  const up = cross(right, forward);

  const v = sub(point, camera.position);
  const depth = dot(v, forward);
  if (depth <= 0) return null;

  const halfHeight = Math.tan((camera.fovDeg * Math.PI) / 360);
  const aspect = viewport.height === 0 ? 1 : viewport.width / viewport.height;

  // Le cadre decale : l'origine aux deux tiers, donc tout point glisse de
  // deux fois la fraction en coordonnees normalisees (le cadre va de -1 a 1).
  const ndcX = dot(v, right) / (depth * halfHeight * aspect) + 2 * (camera.frameShift ?? 0);
  const ndcY = dot(v, up) / (depth * halfHeight);

  return {
    x: ((ndcX + 1) / 2) * viewport.width,
    y: ((1 - ndcY) / 2) * viewport.height,
  };
}

/** Distance du coin d'ecran le plus eloigne d'un point : le rayon a
 *  atteindre pour qu'il ne reste plus un pixel de voile. */
export function farthestCornerDistance(center: ScreenPoint, viewport: Viewport): number {
  const corners: ScreenPoint[] = [
    { x: 0, y: 0 },
    { x: viewport.width, y: 0 },
    { x: 0, y: viewport.height },
    { x: viewport.width, y: viewport.height },
  ];
  return corners.reduce((max, corner) => {
    const dx = corner.x - center.x;
    const dy = corner.y - center.y;
    return Math.max(max, Math.hypot(dx, dy));
  }, 0);
}

/**
 * Rayon (px) de la trouee de fumee a l'instant t (0..1). La fumee se
 * retire depuis la clarte du foyer : le centre est le point de raccord,
 * pas le centre de l'ecran.
 */
export function apertureRadius(t: number, center: ScreenPoint, viewport: Viewport): number {
  return easeInOutCubic(clamp01(t)) * farthestCornerDistance(center, viewport);
}

export type ArrivalCamera = {
  /** Multiplicateur du rayon d'orbite (1 = repos). */
  radiusScale: number;
  /** Hauteur ajoutee (unites monde, 0 = repos). */
  lift: number;
  /** Degres ajoutes au FOV de base (0 = repos). */
  fovOffset: number;
};

/**
 * La descente par l'axe. Grammaire jade : arriver au Centre n'est pas un
 * voyage lateral (cf nepantla, enterOffset("jade") = implosion sans
 * glissement) mais une descente sur l'axe du monde. Joue ici a pleine
 * amplitude, une seule fois par ceremonie.
 *
 * A t = 1, la camera est EXACTEMENT au repos : aucun residu qui viendrait
 * se battre avec le scroll, la parallaxe ou les blends directionnels
 * (meme discipline que swingAzimuth qui retombe pile sur 2pi).
 */
export function arrivalCamera(t: number): ArrivalCamera {
  const c = clamp01(t);
  if (c >= 1) return { radiusScale: 1, lift: 0, fovOffset: 0 };
  const remaining = 1 - easeOutCubic(c);
  return {
    radiusScale: 1 - ARRIVAL_PULL * remaining,
    lift: ARRIVAL_LIFT * remaining,
    fovOffset: ARRIVAL_FOV * remaining,
  };
}

/**
 * Le sursaut du foyer : pleine intensite a l'instant ou le voile s'ouvre,
 * retombee sur l'etat de repos une fois l'arrivee finie. Ce n'est pas un
 * allumage (le feu brulait deja), c'est ce qu'on voit quand on s'approche
 * d'un feu : il parait plus vif de pres.
 */
export function hearthFlare(t: number): number {
  const remaining = 1 - clamp01(t);
  return remaining * remaining;
}

/**
 * Ou en est l'arrivee a la toute premiere image.
 *
 * Sous prefers-reduced-motion, le canvas tourne en frameloop "demand"
 * (persistent-scene) : il ne rend plus apres les premieres images. Tout ce
 * qui lit l'arrivee doit donc etre DEJA a son etat final des le depart,
 * sinon il y reste fige pour toute la visite. Poser l'arrivee a 1 dit la
 * chose juste : sous mouvement reduit, il n'y a pas d'arrivee a jouer,
 * elle est deja faite.
 */
export function initialArrival(reducedMotion: boolean): number {
  return reducedMotion ? 1 : 0;
}

/** Quand part le dot d'une direction, apres le debut du vol. */
export function dotFlightDelay(direction: FlyingDirection): number {
  return DOT_FLIGHT_ORDER.indexOf(direction) * FOYER_TIMING.flightStagger;
}

/**
 * Ou en est le brasero d'indice i (0..1) pour une arrivee donnee. Exprime
 * en progression d'arrivee et non en secondes : c'est la MEME horloge que
 * la camera et la flamme (foyerStore.arrival), donc personne n'a besoin de
 * convertir ni d'entretenir son propre minuteur.
 *
 * Les cinq atteignent 1 exactement a la fin de l'arrivee : aucun brasero
 * ne finit de prendre apres que le monde s'est pose.
 */
export function brazierGlow(index: number, arrival: number): number {
  const start = index * BRAZIER_STAGGER;
  const span = 1 - (BRAZIER_COUNT - 1) * BRAZIER_STAGGER;
  return easeOutCubic(clamp01((clamp01(arrival) - start) / span));
}

/**
 * Faut-il jouer la ceremonie complete ? Une intro est un cadeau a la
 * premiere visite et une insulte a la cinquieme : un jure revient, un
 * prospect revient. Le mythe donne l'arbitrage sans qu'on ait a trancher :
 * le feu du foyer ne s'eteint jamais, donc celui qui repasse trouve la
 * maison deja allumee.
 *
 * Ne dispense PAS du voile (il couvre un vrai chargement) : il sera juste
 * court, sans la sequence ceremonielle.
 */
export function shouldPerformCeremony(lastVisit: number | null, now: number): boolean {
  if (lastVisit === null || !Number.isFinite(lastVisit)) return true;
  const elapsed = now - lastVisit;
  if (elapsed < 0) return true; // horloge incoherente : on rejoue.
  return elapsed >= HEARTH_TTL_MS;
}
