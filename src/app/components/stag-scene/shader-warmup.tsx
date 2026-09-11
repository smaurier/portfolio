"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useProgress } from "@react-three/drei";
import { MATERIAL_SWEEP_EVERY } from "./shader-patch";
import { useCurrentDirection } from "./use-current-direction";
import type { DirectionKey } from "./direction-colors";
import { WebGLRenderTarget, type Material, type Object3D } from "three";
import { useSceneRefs } from "./scene-refs-context";

/**
 * LA CHAUFFE DES SHADERS (11/09), au voile ET a chaque arrivee.
 *
 * three compile le programme d'un materiau la premiere fois qu'un objet
 * VISIBLE le rend, de facon synchrone : le fil principal attend l'edition
 * de liens du pilote. Mesure du 11/09 sur la production, bureau, agent
 * Chrome reel : au clic sur un lien cardinal, 1,8 s de gel vers Memoire,
 * 1,05 s vers le Centre, 2,6 s puis 1,6 s puis 1,4 s de Projets vers
 * Services ; au profil, `getProgramInfoLog` a 3,3 s. Trente-six programmes
 * nouveaux a l'arrivee sur Memoire.
 *
 * `compileAsync` de three r185 parcourt la scene en `traverse`, pas en
 * `traverseVisible` (verifie a la source) : il compile aussi ce qui est
 * cache, en parallele quand le pilote le permet. On l'appelle :
 *
 *  - au premier chargement, quand tout est charge (useProgress), et le
 *    voile (reveal-trigger) attend l'evenement avant de se lever ;
 *  - a CHAQUE changement de direction, quand les modeles de la nouvelle
 *    direction sont charges. Pendant ce temps, MountForDirection garde le
 *    sous-arbre de la direction invisible, et le cadre nepantla retient
 *    l'entree du contenu (cardinal-transition-context) : rien ne rend un
 *    programme froid.
 *
 * L'evenement porte la direction chauffee ; `getWarmDirection` la donne
 * a qui arrive apres coup.
 *
 * Ce qu'il ne peut pas faire : les variantes d'un AUTRE etat de rendu,
 * comme le reflet du Nord dans sa cible ; celles-la ont leur propre point
 * de chauffe (tezcatlStore.warmReflection).
 */
// Plus que la cadence des balayages de materiaux : chaque materiau a ete vu
// par le fondu de profondeur et la revelation au curseur avant qu'on
// compile, sinon on compilerait des variantes d'avant modification.
const FRAMES_AFTER_LOAD = MATERIAL_SWEEP_EVERY + 4;

/** Le voile et le cadre nepantla attendent cet evenement (detail.direction). */
export const SHADERS_WARM_EVENT = "nahual:shaders-warm";

/** Secours partage par ceux qui attendent la chauffe : jamais tenir le
 *  visiteur devant une porte fermee si un pilote refuse la compilation
 *  parallele ou si un modele n'arrive jamais. */
export const WARMUP_FALLBACK_MS = 4000;

let warmDirection: DirectionKey | null = null;

/** LES CHAUFFES ANNEXES : les simulateurs (ondes de l'eau, fluide des
 *  nappes) rendent dans leurs propres scenes, invisibles a `compile`. Ils
 *  s'enregistrent ici avec la liste de leurs pas de chauffe, un programme
 *  par pas ; la chauffe les joue en tranches apres les objets de la scene.
 *  Mesure du 11/09 : douze programmes annexes compilaient d'un bloc, 611 ms,
 *  a l'arrivee sur Memoire. */
type WarmSteps = () => Array<() => void>;
const warmers = new Set<WarmSteps>();

export function registerWarmer(steps: WarmSteps): () => void {
  warmers.add(steps);
  return () => {
    warmers.delete(steps);
  };
}

/** La derniere direction dont les programmes ont ete chauffes. */
export function getWarmDirection(): DirectionKey | null {
  return warmDirection;
}

type WithMaterial = Object3D & { material?: Material | Material[] };

/** La somme des versions des materiaux d'un objet : elle bouge quand un
 *  modificateur est pose ou qu'un `needsUpdate` est demande. */
function versionDe(o: WithMaterial): number {
  const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
  let v = 0;
  for (const m of mats) v += m.version;
  return v;
}

/** La couche ou l'on range un objet le temps de le compiler : aucune camera
 *  du site ne la regarde (la principale voit la couche 0, le miroir de
 *  l'eau la couche 3). */
const COLD_LAYER = 31;

export default function ShaderWarmup() {
  const { gl, scene, camera } = useThree();
  const { progress, active } = useProgress();
  const direction = useCurrentDirection();
  const sceneRefs = useSceneRefs();
  // LA BONNE VARIANTE (11/09). Avec le post-traitement, la scene est rendue
  // dans une cible du compositeur, et three derive pour chaque programme la
  // variante en espace lineaire (`outputColorSpace` est dans la cle). Une
  // chauffe a l'ecran compile alors la variante ecran, jamais rendue :
  // mesure au bureau, neuf programmes lourds d'un coup, 1,9 s, a la premiere
  // image visible de chaque arrivee, malgre la chauffe. On compile donc sous
  // une cible de 1x1 quand le post-traitement est actif (mobile : a l'ecran).
  const cibleRef = useRef<WebGLRenderTarget | null>(null);
  useEffect(() => () => {
    cibleRef.current?.dispose();
    cibleRef.current = null;
  }, []);
  const framesRef = useRef(0);
  const scanRef = useRef(0);
  const readyRef = useRef(false);
  // Les objets deja vus (compiles ou en file), et la version de leurs
  // materiaux au moment de la compilation.
  const connusRef = useRef(new WeakSet<Object3D>());
  const versionsRef = useRef(new WeakMap<Object3D, number>());
  // La file : les objets froids, ranges sur la couche froide en attendant
  // leur programme, avec leur masque de couches d'origine.
  const fileRef = useRef(new Map<WithMaterial, number>());
  const warmingRef = useRef(false);
  const annexRef = useRef<Array<() => void>>([]);
  // Une chauffe est due des qu'on arrive quelque part : au chargement, a
  // chaque changement de direction, a chaque cycle de chargement fini.
  const dueRef = useRef(true);
  const wasActiveRef = useRef(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __nahualChargement?: unknown }).__nahualChargement = { progress, active };
    }
    if (active && !wasActiveRef.current) dueRef.current = true;
    wasActiveRef.current = active;
    readyRef.current = progress >= 100 && !active;
    if (!readyRef.current) framesRef.current = 0;
  }, [progress, active]);

  useEffect(() => {
    framesRef.current = 0;
    dueRef.current = true;
  }, [direction]);

  useFrame(() => {
    // CHAQUE IMAGE, sans attendre : les objets nouveaux (un modele arrive
    // par Suspense se rend dans l'image meme de son montage, sinon), y
    // compris pendant un chargement ; toutes les MATERIAL_SWEEP_EVERY
    // images, ceux dont un materiau a change de version. Seule la
    // COMPILATION attend la fin des chargements et les balayages.
    const connus = connusRef.current;
    const versions = versionsRef.current;
    const file = fileRef.current;
    const scanVersions = scanRef.current++ % MATERIAL_SWEEP_EVERY === 0;
    scene.traverse((o) => {
      const m = o as WithMaterial;
      if (!m.material) return;
      if (connus.has(o)) {
        if (!scanVersions || file.has(m) || versions.get(o) === versionDe(m)) return;
      }
      connus.add(o);
      // Soustrait au rendu le temps de sa compilation : aucune camera ne
      // regarde la couche froide, et `compile` ignore les couches.
      file.set(m, o.layers.mask);
      o.layers.set(COLD_LAYER);
    });

    if (!readyRef.current) return;
    framesRef.current += 1;
    // Plus que la cadence des balayages de materiaux : le fondu de
    // profondeur et la revelation au curseur ont pose leurs modificateurs.
    if (framesRef.current < FRAMES_AFTER_LOAD) return;

    if (!warmingRef.current) {
      if (file.size === 0 && !dueRef.current) return;
      dueRef.current = false;
      warmingRef.current = true;
      warmDirection = null;
      annexRef.current = [...warmers].flatMap((w) => w());
    }

    // EN TRANCHES : un programme NOUVEAU par image, pas tout d'un bloc.
    // Mesure du 11/09 : compileAsync sur toute la scene figeait le fil
    // principal 2,1 s pour 22 programmes, la file du processus GPU etant
    // serialisee derriere la premiere interrogation. Les objets deja
    // compiles ne coutent qu'une recherche de cache.
    const avant = gl.info.programs?.length ?? 0;
    const viaCible = sceneRefs?.perfProfile.postFx ?? false;
    if (viaCible && !cibleRef.current) cibleRef.current = new WebGLRenderTarget(1, 1);
    for (const [o, masque] of file) {
      const prev = gl.getRenderTarget();
      if (viaCible) gl.setRenderTarget(cibleRef.current);
      gl.compile(o, camera, scene);
      gl.setRenderTarget(prev);
      versions.set(o, versionDe(o));
      o.layers.mask = masque;
      file.delete(o);
      if ((gl.info.programs?.length ?? 0) !== avant) return;
    }
    const annex = annexRef.current;
    while (annex.length > 0) {
      (annex.shift() as () => void)();
      if ((gl.info.programs?.length ?? 0) !== avant) return;
    }
    warmingRef.current = false;
    warmDirection = direction;
    window.dispatchEvent(new CustomEvent(SHADERS_WARM_EVENT, { detail: { direction } }));
  });

  return null;
}
