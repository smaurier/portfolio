/* eslint-disable react-hooks/immutability -- pattern gamedev r3f useFrame : mutation d'uniforms et du store partage a 60 fps (meme precedent que xolotl-companion). */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import { Quaternion, Vector3, type Group, type Material, type Mesh, type MeshStandardMaterial } from "three";
import { persistentLights } from "./persistent-lights";
import { initialWander, stepWander, wanderTangent, XIUHCOATL_WANDER, type WanderState } from "@/lib/xiuhcoatl-wander";
import { aztecYear, YEAR_BEARERS } from "aztec-year";
import { getMictlanSky } from "./mictlan-sky";
import { createEmberFireMaterial, createTurquoiseMaterial, createXiuhcoatlUniforms, softenFog, type XiuhcoatlUniforms } from "./xiuhcoatl-materials";
import { getRevealFloor } from "@/lib/reveal-arc";
import { pushHeat, xiuhcoatlStore } from "./xiuhcoatl-store";
import { isBot } from "@/lib/is-bot";
import { advanceStrike } from "@/lib/strike-sequence";
import { strikePathAt, STRIKE_PATH } from "@/lib/strike-path";
import { useReadingMode } from "@/lib/reading-mode-context";
import { tezcatlStore } from "./tezcatl-store";
import { useCurrentDirection } from "./use-current-direction";
import { useSceneRefs } from "./scene-refs-context";

/**
 * XiuhcoatlCompanion (04/09, Sud). Le serpent de feu, arme de
 * Huitzilopochtli a Coatepec, l'un des deux xiuhcoatl qui portent le soleil
 * autour de la Piedra del Sol. Etre de turquoise et de feu (pas d'eau :
 * « xiuh » = turquoise, annee, feu).
 *
 * Presence (04/09, Sylvain : « il pourrait etre la pendant toute la scene a
 * voler de maniere aleatoire dans le ciel », « apparition aleatoire, 1/3 ») :
 * tirage une fois par visite (sessionStorage), et quand il est la, il vit
 * dans le ciel du Sud en continu, sur le vol errant de lib/xiuhcoatl-wander,
 * borne a la bande de ciel entre la crete des montagnes et le bandeau.
 * Ondulation laterale (action Slither du GLB), lueur portee, braises.
 *
 * Modele : public/models/xiuhcoatl.glb, construit par script Blender
 * (tools/blender/xiuhcoatl.py), 16 os, actions Slither et Idle.
 * Sud seulement, rien en reduced-motion ni en mode recit.
 * Forcer la presence pour verifier : ?xiuhcoatl=1 dans l'URL.
 */

const MODEL_PATH = "/models/xiuhcoatl.glb";
const PRESENCE_PROBABILITY = 1 / 3;
const SESSION_KEY = "nahual-xiuhcoatl-present";
const FADE_IN_MS = 1_800;
// 2.4 (04/09, retour Sylvain : « il devrait faire le double »).
const SCALE = 2.4;
/** Longueur du modele (Blender) : les braises naissent le long du corps. */
const BODY_LENGTH = 5.2;
const EMBER_BURST_EVERY = 11; // une salve de braises toutes les N unites de budget
const EMBERS_PER_SECOND = 22;
const LIGHT_INTENSITY = 6;
/** La nuit, la lueur portee est ce qui integre le serpent au decor :
 * intensite x (1 + boost), portee plus courte et chute rapide pour que le
 * halo suive le corps sans eclairer toute la prairie. */
const NIGHT_LIGHT_BOOST = 7;
const STRIKE_LIGHT_BOOST = 6;
const LIGHT_DISTANCE_DAY = 16;
const LIGHT_DISTANCE_NIGHT = 13;
const BANK_GAIN = 0.45;
const BANK_MAX = 0.35;
/** LA CHARGE (05/09) : duree du pique sur la Piedra, point d'impact (bord
 * de l'anneau), et hauteur de reprise. */
/**
 * La trajectoire vit dans lib/strike-path depuis le 09/09 : plongee,
 * rasement au sol qui touche l'anneau, remontee. Les trois points et les
 * trois durees y sont, avec leurs tests. Ce qui restait ici -- une Bezier
 * quadratique parcourue uniformement -- ne pouvait pas porter le geste :
 * son seul moment interessant tombait a sa vitesse maximale.
 */
/**
 * Ce que le raidissement retire d'ondulation, au plus fort (09/09, retour
 * Sylvain « encore trop rigide »). A 1, le serpent se petrifiait en barre
 * droite exactement au moment qu'on regarde : l'image le montrait comme un
 * tube peint. A 0,65 il se TEND -- l'ondulation garde un tiers de son
 * poids -- ce qui se lit comme un muscle et non comme un os.
 */
const SLITHER_CUT = 0.65;
/** Cadence des points de chaleur (trainee qui deforme l'air). */
const HEAT_EVERY_MS = 85;

// Pas de preload au niveau module (08/09, 0,8 Mo sur l'accueil) : monte au
// Sud seulement, precharge au survol du lien cardinal.

function setOpacity(root: Group, opacity: number, uniforms: XiuhcoatlUniforms) {
  uniforms.uOpacity.value = opacity;
  root.traverse((child) => {
    const mesh = child as Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      const mat = m as Material & { opacity: number; isShaderMaterial?: boolean };
      if (mat.isShaderMaterial) continue; // uOpacity
      // Toujours transparent (11/09) : basculer `transparent` change la cle
      // du programme, et le serpent recompilait ses trois materiaux a la fin
      // de son fondu d'entree.
      if (!mat.transparent) mat.transparent = true;
      mat.opacity = opacity;
    }
  });
}

/** Les matieres (04/09) : ecailles = turquoise polie en mosaique avec le
 * feu dans les joints, flammes = braise du reflet de Xolotl, gueule =
 * faible lueur, os/griffes/perles = tels quels. Eclaire comme la scene
 * (retour Sylvain), fog compris. */
function dressMaterials(root: Group, uniforms: XiuhcoatlUniforms) {
  // IDEMPOTENT : la scene useGLTF est mise en cache, un retour sur la page
  // rehabille des meshes deja habilles. Sans ce garde, le ShaderMaterial
  // des flammes tombait dans la branche « autres » et recevait fog = true
  // sans uniform de fog : « uniforms.fogColor is undefined » a chaque
  // frame, plus rien ne s'affichait (retour Sylvain 04/09).
  if (root.userData.xiuhDressed) return;
  root.userData.xiuhDressed = true;
  const sky = getMictlanSky();
  root.traverse((child) => {
    const mesh = child as Mesh;
    if (!mesh.isMesh) return;
    mesh.frustumCulled = false;
    const mat = mesh.material as MeshStandardMaterial;
    if (Array.isArray(mesh.material) || !mat) return;
    if (mat.name.includes("scale")) {
      const stone = createTurquoiseMaterial(mat.color.clone(), sky, uniforms);
      stone.name = "xiuh_scale_turquoise";
      stone.userData.xiuhStone = true;
      mesh.material = stone;
    } else if (mat.name.includes("fire")) {
      const ember = createEmberFireMaterial(uniforms);
      ember.name = "xiuh_fire_ember";
      mesh.material = ember;
    } else if (mat.name.includes("mouth")) {
      mat.emissiveIntensity = 0.35;
      mat.fog = true;
      softenFog(mat, uniforms, "xiuhcoatl-mouth");
    } else {
      mat.emissiveIntensity = 0;
      mat.fog = true;
      softenFog(mat, uniforms, `xiuhcoatl-${mat.name}`);
    }
  });
}

/** La DATE sous le signe de l'annee (04/09, go Sylvain) : le GLB embarque
 * les quatre porteurs d'annee (YearBearer_<porteur>) et 13 points
 * (YearDot00..12) ; on ne montre que le porteur et les points de l'annee
 * mexica en cours, calculee chez le visiteur (lib/aztec-year) : rien a
 * faire en production d'une annee sur l'autre. */
function applyYear(root: Group) {
  const year = aztecYear();
  for (const bearer of YEAR_BEARERS) {
    const node = root.getObjectByName(`YearBearer_${bearer}`);
    if (node) node.visible = bearer === year.bearer;
  }
  for (let i = 0; i < 13; i++) {
    const node = root.getObjectByName(`YearDot${String(i).padStart(2, "0")}`);
    if (node) node.visible = i < year.number;
  }
}

/** Presence tiree une fois par visite ; ?xiuhcoatl=1 force la presence. */
function decidePresence(): boolean {
  if (window.location.search.includes("xiuhcoatl=1")) return true;
  try {
    const cached = sessionStorage.getItem(SESSION_KEY);
    if (cached !== null) return cached === "1";
    const present = Math.random() < PRESENCE_PROBABILITY;
    sessionStorage.setItem(SESSION_KEY, present ? "1" : "0");
    return present;
  } catch {
    return Math.random() < PRESENCE_PROBABILITY;
  }
}

export default function XiuhcoatlCompanion() {
  const groupRef = useRef<Group>(null);
  // La cible du projecteur : le sol sous le serpent (objet de la scene,
  // mis a jour chaque frame).
  const direction = useCurrentDirection();
  const sceneRefs = useSceneRefs();
  const readingMode = useReadingMode();
  const { scene, animations } = useGLTF(MODEL_PATH);
  const { actions } = useAnimations(animations, groupRef);
  const [present, setPresent] = useState(false);
  const wanderRef = useRef<WanderState | null>(null);
  const bornAtRef = useRef(0);
  const bankRef = useRef(0);
  const emberAccRef = useRef(0);
  const heatAtRef = useRef(0);
  /** Pour quelle frappe on a deja charge : -1 = aucune. */
  const chargedForRef = useRef(-1);
  const strikeRef = useRef<{ at: number; t: number; from: { x: number; y: number; z: number }; hitDone: boolean } | null>(null);
  // Les uniforms vivent avec la scene (cache useGLTF) : un remontage du
  // composant retrouve ceux que les matieres portent deja.
  const uniforms = useMemo<XiuhcoatlUniforms>(() => {
    const data = scene.userData as { xiuhUniforms?: XiuhcoatlUniforms };
    if (!data.xiuhUniforms) data.xiuhUniforms = createXiuhcoatlUniforms();
    return data.xiuhUniforms;
  }, [scene]);
  const scratch = useMemo(
    () => ({ q: new Quaternion(), qy: new Quaternion(), qz: new Quaternion(), qx: new Quaternion(), axisY: new Vector3(0, 1, 0), axisZ: new Vector3(0, 0, 1), axisX: new Vector3(1, 0, 0) }),
    []
  );

  useEffect(() => {
    dressMaterials(scene as Group, uniforms);
    applyYear(scene as Group);
  }, [scene, uniforms]);

  // Presence : Sud seulement, jamais pour un bot, en mode recit ou en
  // reduced-motion ; tirage 1/3 par visite.
  useEffect(() => {
    const south = direction === "turquoise";
    if (!south || isBot() || readingMode.active || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- presence pilotee par la route
      setPresent(false);
      wanderRef.current = null;
      return;
    }
    const here = decidePresence();
    if (here) {
      wanderRef.current = initialWander(Math.floor(Math.random() * 1e6), XIUHCOATL_WANDER);
      bornAtRef.current = performance.now();
      bankRef.current = 0;
    }
    setPresent(here);
  }, [direction, readingMode.active]);

  useEffect(() => {
    if (!present) return;
    const slither = actions["Slither"];
    slither?.reset().play();
    return () => {
      slither?.stop();
    };
  }, [present, actions]);

  useEffect(
    () => () => {
      if (persistentLights.serpent) persistentLights.serpent.intensity = 0;
      persistentLights.serpentShadowWanted = false;
    },
    [],
  );

  useFrame((_state, delta) => {
    const reduced = sceneRefs?.reducedMotionRef.current ?? false;
    // LE GESTE DU MYTHE A LIEU A CHAQUE VISITE : si le serpent n'etait pas
    // la (tirage 1/3 du vol errant), il surgit du lointain pour la charge et
    // reste ensuite. Sans lui, pas d'impact, donc pas de feu ni de chaleur.
    //
    // Ce test passe AVANT TOUTE AUTRE GARDE, et c'est tout le correctif du
    // 09/09. Mesure : trois visites normales, la frappe armee par le ciel, et
    // aucun serpent, aucun feu. La branche existait depuis le 05/09 mais elle
    // etait enfermee derriere TROIS gardes qui sont toutes vraies exactement
    // quand elle doit s'appliquer :
    //  1. `if (!present) return null` a la fin du composant : quand le
    //     serpent est absent, rien n'est rendu, donc `groupRef.current` est
    //     nul ;
    //  2. `if (!g) return` en tete de cette boucle : sortie immediate ;
    //  3. `if (!w) return` : la trajectoire de vol est nulle, justement parce
    //     que le tirage a dit non.
    // La lecon : une branche de RATTRAPAGE ne doit jamais vivre sous les
    // gardes du cas normal.
    //
    // La fenetre de 0,5 s de temps reel a aussi disparu de la condition : une
    // saccade au declenchement (l'anneau s'embrase, son shader se compile,
    // l'horloge de la scene saute de 3,9 s, mesure du 09/09) la faisait
    // manquer entierement. `strikeAt` reste pose jusqu'au depart du Sud et
    // `present` passe a vrai tout de suite : la condition se referme
    // d'elle-meme sans dependre d'un delai.
    if (!present && !reduced && direction === "turquoise" && xiuhcoatlStore.strikeAt >= 0 && !isBot() && !readingMode.active) {
      wanderRef.current = initialWander(Math.floor(Math.random() * 1e6), XIUHCOATL_WANDER);
      bornAtRef.current = performance.now();
      bankRef.current = 0;
      setPresent(true);
      return;
    }
    const g = groupRef.current;
    const w = wanderRef.current;
    if (!g || !w) return;
    if (!present || reduced) {
      g.visible = false;
      xiuhcoatlStore.presence = 0;
      if (persistentLights.serpent) persistentLights.serpent.intensity = 0;
      persistentLights.serpentShadowWanted = false;
      return;
    }
    // dt borne et jamais nul : a dt = 0 (premiere frame, onglet
    // reactive) dh / dt donnait NaN -> quaternion NaN -> squelette NaN
    // (« computeBoundingSphere(): Computed radius is NaN » a chaque frame).
    const dt = Math.max(1e-3, Math.min(delta, 1 / 30));
    const prevHeading = w.heading;
    let s = stepWander(w, dt, XIUHCOATL_WANDER);
    // La charge : declenchee par le store (climax), une courbe de Bezier du
    // point courant au bord de l'anneau puis vers le ciel ; a mi-course il
    // touche l'anneau (strikeHit) et l'anneau flambe. Pendant la charge, le
    // vol errant est mis de cote et reprend au point de sortie.
    const clockNow = _state.clock.elapsedTime;
    // Une charge par frappe, sans fenetre de temps reel (09/09) : la
    // condition « moins de 0,5 s apres l'ordre » sautait des que l'horloge
    // sautait, et c'est exactement au declenchement qu'elle saute. On retient
    // donc POUR QUELLE frappe on a deja charge, ce qui est exact quoi qu'il
    // arrive a l'horloge.
    if (xiuhcoatlStore.strikeAt >= 0 && !strikeRef.current && chargedForRef.current !== xiuhcoatlStore.strikeAt) {
      chargedForRef.current = xiuhcoatlStore.strikeAt;
      strikeRef.current = { at: clockNow, t: 0, from: { x: s.x, y: s.y, z: s.z }, hitDone: false };
    }
    const strike = strikeRef.current;
    if (strike) {
      // La charge avance d'un pas BORNE (le meme `dt` que le vol errant),
      // et non sur `clockNow - strike.at` (09/09). Sur une saccade au
      // declenchement, l'horloge de la scene a saute de 3,9 s en une image :
      // le serpent franchissait toute sa courbe d'un coup, posait `strikeHit`
      // immediatement, et le geste n'existait plus. Un ralenti se regarde,
      // une image sautee ne se voit pas.
      strike.t = advanceStrike(strike.t, dt);
      const e = strikePathAt(strike.t, strike.from);
      const tl = Math.hypot(e.tan.x, e.tan.y, e.tan.z) || 1;
      const heading = Math.atan2(e.tan.z / tl, e.tan.x / tl);
      const pitch = Math.asin(Math.max(-1, Math.min(1, e.tan.y / tl)));
      s = { ...s, x: e.pos.x, y: e.pos.y, z: e.pos.z, heading, pitch };
      // L'impact est desormais un INSTANT de la sequence et non une moitie
      // de parametre : la meme valeur pilote le feu, la raideur, la
      // secousse et la position.
      if (!strike.hitDone && strike.t >= STRIKE_PATH.hitAt) {
        strike.hitDone = true;
        xiuhcoatlStore.strikeHit = clockNow;
      }
      if (strike.t >= STRIKE_PATH.total) strikeRef.current = null;
    }
    wanderRef.current = s;

    // La frappe : le serpent se RAIDIT en trait (le xiuhcoatl comme rayon,
    // lecture de Seler) : l'ondulation Slither perd son poids, le mixer
    // revient vers la pose de repos (droite), et la braise monte.
    const stiffen = xiuhcoatlStore.strike.stiffen;
    const slither = actions["Slither"];
    if (slither) slither.setEffectiveWeight(1 - SLITHER_CUT * stiffen);
    // LA NUIT (05/09, retour Sylvain « trop voyant lorsque c'est la nuit,
    // les scenes devaient etre tres sombres ») : un feu dans la nuit, c'est
    // surtout ce qu'il eclaire. En tete de page ses braises et ses flammes
    // sont a un tiers, son vernis presque eteint, son brouillard au niveau
    // du decor (il s'y enfonce au lieu de s'en detacher) ; tout monte avec
    // l'arc, et la frappe emporte tout. En echange sa lumiere portee est
    // forte la nuit : l'herbe, les nopals, le cerf prennent sa lueur.
    const day = getRevealFloor(sceneRefs?.progressRef.current ?? 0);
    const night = 1 - day;
    uniforms.uEmber.value = (0.33 + 0.67 * day) * (1 + 2.5 * stiffen) + 1.5 * xiuhcoatlStore.strike.fire;
    uniforms.uFogScale.value = 0.3 + 0.7 * night;
    const gloss = 0.15 + 0.95 * day;
    scene.traverse((o) => {
      const m = (o as Mesh).material as (Material & { envMapIntensity?: number; userData: Record<string, unknown> }) | undefined;
      if (m && m.userData && m.userData.xiuhStone && m.envMapIntensity !== undefined) m.envMapIntensity = gloss;
    });

    const now = performance.now();
    const fade = Math.min(1, (now - bornAtRef.current) / FADE_IN_MS);
    g.visible = true;
    setOpacity(scene as Group, fade, uniforms);
    uniforms.uTime.value = _state.clock.elapsedTime;
    xiuhcoatlStore.presence = fade;

    // Corps oriente le long de la tangente (le modele avance selon +X),
    // inclinaison dans les virages (le cap qui tourne penche le corps).
    const d = wanderTangent(s);
    g.position.set(s.x, s.y, s.z);
    const yaw = Math.atan2(-d.z, d.x);
    const pitch = Math.asin(Math.max(-1, Math.min(1, d.y)));
    let dh = s.heading - prevHeading;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    const bankRaw = -(dh / dt) * BANK_GAIN;
    const bankTarget = Number.isFinite(bankRaw) ? Math.max(-BANK_MAX, Math.min(BANK_MAX, bankRaw)) : 0;
    bankRef.current += (bankTarget - bankRef.current) * Math.min(1, dt * 3);
    const { q, qy, qz, qx, axisY, axisZ, axisX } = scratch;
    q.copy(qy.setFromAxisAngle(axisY, yaw)).multiply(qz.setFromAxisAngle(axisZ, pitch)).multiply(qx.setFromAxisAngle(axisX, bankRef.current));
    g.quaternion.copy(q);
    g.scale.setScalar(SCALE);

    // Le projecteur est une lumiere PERSISTANTE (11/09, voir
    // persistent-lights) : on le pilote, on ne le possede pas. Il suit le
    // serpent et vise le sol sous lui ; son ombre (retour Sylvain « un
    // travail leger sur les ombres ») ne coute qu'une passe de profondeur
    // en 512, et seulement la nuit, quand elle se voit : RevealLighting lit
    // ce souhait et gele ou degele la passe.
    const l = persistentLights.serpent;
    const lt = persistentLights.serpentTarget;
    if (l && lt) {
      l.intensity = LIGHT_INTENSITY * fade * (1 + NIGHT_LIGHT_BOOST * night + STRIKE_LIGHT_BOOST * xiuhcoatlStore.strike.fire);
      l.distance = LIGHT_DISTANCE_DAY + (LIGHT_DISTANCE_NIGHT - LIGHT_DISTANCE_DAY) * night;
      l.position.set(s.x, s.y + 0.2 * SCALE, s.z);
      lt.position.set(s.x, 0, s.z);
      lt.updateMatrixWorld();
      if (l.target !== lt) l.target = lt;
      persistentLights.serpentShadowWanted = night > 0.15 && (sceneRefs?.perfProfile.shadows ?? true);
    }

    // Trainee chaude : un point de chaleur derriere lui a cadence fixe,
    // le long de la moitie arriere du corps (post-fx xiuhcoatl-heat).
    if (now - heatAtRef.current >= HEAT_EVERY_MS) {
      heatAtRef.current = now;
      const back = (0.3 + Math.random() * 0.6) * BODY_LENGTH * SCALE * 0.5;
      pushHeat(s.x - d.x * back, s.y - d.y * back, s.z - d.z * back, now);
    }

    // Etincelles le long de la moitie arriere du corps (famille « chaude »
    // du moteur des fleches : pas de fumee, que des eclats vifs).
    emberAccRef.current += EMBERS_PER_SECOND * dt;
    while (emberAccRef.current >= EMBER_BURST_EVERY) {
      emberAccRef.current -= EMBER_BURST_EVERY;
      const back = (0.15 + Math.random() * 0.75) * BODY_LENGTH * SCALE * 0.5;
      tezcatlStore.vapors.push({
        x: s.x - d.x * back,
        y: s.y - d.y * back,
        z: s.z - d.z * back,
        dx: -d.x,
        dy: -d.y,
        dz: -d.z,
        length: 0.9,
        heat: 1,
      });
    }
  });

  if (!present) return null;
  return (
    <group ref={groupRef} visible={false}>
      <primitive object={scene} />
    </group>
  );
}
