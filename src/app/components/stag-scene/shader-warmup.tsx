/* eslint-disable react-hooks/immutability -- pattern r3f : on accroche la capture au crochet onBeforeRender de la scene three, un objet mutable par nature (meme motif que les autres composants de scene). */
"use client";

import { useCallback, useEffect, useRef } from "react";
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

/** La couche ou l'on range un objet le temps de le compiler : aucune camera
 *  du site ne la regarde (la principale voit la couche 0, le miroir de
 *  l'eau la couche 3). */
const COLD_LAYER = 31;

export default function ShaderWarmup() {
  const { gl, scene, camera } = useThree();
  const { progress, active, item, loaded, total } = useProgress();
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
  const readyRef = useRef(false);
  // Les objets deja vus (compiles ou en file), et la version de leurs
  // materiaux au moment de la compilation.
  const connusRef = useRef(new WeakSet<Object3D>());
  // Par materiau : ses objets porteurs, et sa version au dernier passage.
  const porteursRef = useRef(new Map<Material, Set<WithMaterial>>());
  const versionsMatRef = useRef(new Map<Material, number>());
  // La file : les objets froids, ranges sur la couche froide en attendant
  // leur programme, avec leur masque de couches d'origine.
  const fileRef = useRef(new Map<WithMaterial, number>());
  const warmingRef = useRef(false);
  const annexRef = useRef<Array<() => void>>([]);
  // Une chauffe est due des qu'on arrive quelque part : au chargement, a
  // chaque changement de direction, a chaque cycle de chargement fini.
  const dueRef = useRef(true);
  // L'evenement ne part qu'aux ARRIVEES (chargement, direction) et aux cycles
  // qui ont compile quelque chose : un cycle par modele charge sans rien
  // de nouveau restait muet a partir du 11/09 (T6, la chauffe bavarde).
  const arriveeRef = useRef(true);
  const creesCycleRef = useRef(0);
  const wasActiveRef = useRef(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __nahualChargement?: unknown }).__nahualChargement = { progress, active, item, loaded, total };
    }
    if (active && !wasActiveRef.current) dueRef.current = true;
    wasActiveRef.current = active;
    readyRef.current = progress >= 100 && !active;
    if (!readyRef.current) framesRef.current = 0;
  }, [progress, active, item, loaded, total]);

  useEffect(() => {
    framesRef.current = 0;
    dueRef.current = true;
    arriveeRef.current = true;
  }, [direction]);

  // LA CAPTURE : les objets nouveaux (un modele arrive par Suspense se rend
  // dans l'image meme de son montage, sinon), y compris pendant un
  // chargement ; toutes les MATERIAL_SWEEP_EVERY images, ceux dont un
  // materiau a change de version. Appelee a chaque image (useFrame) ET
  // juste avant chaque rendu (scene.onBeforeRender) : un composant monte
  // apres celui-ci a sa boucle d'image APRES la sienne, et pouvait ajouter
  // un objet entre la capture et le rendu (mesure du 11/09 : le rig du
  // serpent, un programme ne au rendu a 15 % de l'arc a Projets).
  const capturer = useCallback(() => {
    const connus = connusRef.current;
    const file = fileRef.current;
    const porteurs = porteursRef.current;
    const versionsMat = versionsMatRef.current;
    const geler = (o: WithMaterial) => {
      if (file.has(o)) return;
      // Soustrait au rendu le temps de sa compilation : aucune camera ne
      // regarde la couche froide, et `compile` ignore les couches.
      file.set(o, o.layers.mask);
      o.layers.set(COLD_LAYER);
    };
    scene.traverse((o) => {
      const m = o as WithMaterial;
      if (!m.material) return;
      if (connus.has(o)) return;
      connus.add(o);
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      for (const mat of mats) {
        let set = porteurs.get(mat);
        if (!set) {
          set = new Set();
          porteurs.set(mat, set);
          versionsMat.set(mat, mat.version);
        }
        set.add(m);
      }
      geler(m);
    });
    // Les versions, A CHAQUE IMAGE et par materiau (une comparaison par
    // materiau, pas un parcours) : les balayages (givre, fondu, revelation)
    // posent leurs modificateurs dans leur propre boucle d'image, et un
    // materiau modifie doit etre recompile AVANT le rendu qui suit, sinon
    // c'est le rendu qui le compile, en synchrone (mesure du 11/09 : un
    // programme ne au rendu a 15 % de l'arc a Projets, une fois sur deux).
    for (const [mat, set] of porteurs) {
      if (versionsMat.get(mat) === mat.version) continue;
      versionsMat.set(mat, mat.version);
      for (const o of set) if (o.parent) geler(o);
    }
  }, [scene]);
  // En dev : les programmes nes AU RENDU, nommes par leurs materiaux, pour
  // la suite e2e et les sondes (window.__nahualTardifs).
  const idsConnusRef = useRef(new Set<number>());
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const ids = idsConnusRef.current;
    for (const pr of gl.info.programs ?? []) ids.add(pr.id);
    const precedentApres = scene.onAfterRender;
    scene.onAfterRender = (...args) => {
      precedentApres.apply(scene, args);
      const nouveaux = (gl.info.programs ?? []).filter((pr) => !ids.has(pr.id));
      if (nouveaux.length === 0) return;
      for (const pr of nouveaux) ids.add(pr.id);
      const noms: string[] = [];
      scene.traverse((o) => {
        const m = o as WithMaterial;
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
        for (const mat of mats) {
          const pr = (gl.properties.get(mat) as { currentProgram?: { id: number } }).currentProgram;
          if (pr && nouveaux.some((n) => n.id === pr.id)) {
            // Les variantes connues de ce materiau : la difference de cle
            // entre l'ancienne et la nouvelle dit POURQUOI il a recompile.
            const variantes = [...(((gl.properties.get(mat) as { programs?: Map<string, unknown> }).programs ?? new Map()).keys())];
            let diff = "";
            if (variantes.length >= 2) {
              const ka = variantes[variantes.length - 2].split(",");
              const kb = variantes[variantes.length - 1].split(",");
              const d: string[] = [];
              for (let i = 0; i < Math.max(ka.length, kb.length); i++) if (ka[i] !== kb[i]) d.push(`[${i}] ${ka[i]} -> ${kb[i]}`);
              diff = " cle: " + d.slice(0, 4).join(" ; ");
            }
            noms.push(`${o.type} ${o.name || "(sans nom)"} [${mat.type}${mat.name ? " " + mat.name : ""}] v${mat.version} couche=${o.layers.mask} variantes=${variantes.length}${diff}`);
          }
        }
      });
      const w = window as unknown as { __nahualTardifs?: string[] };
      (w.__nahualTardifs ??= []).push(...(noms.length ? noms : nouveaux.map((n) => `#${n.id} (hors scene)`)));
    };
    return () => {
      scene.onAfterRender = precedentApres;
    };
  }, [gl, scene]);
  useEffect(() => {
    const precedent = scene.onBeforeRender;
    scene.onBeforeRender = (...args) => {
      capturer();
      precedent.apply(scene, args);
    };
    return () => {
      scene.onBeforeRender = precedent;
    };
  }, [scene, capturer]);

  useFrame(() => {
    // Seule la COMPILATION attend la fin des chargements et les balayages.
    const file = fileRef.current;
    capturer();

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
      creesCycleRef.current = 0;
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
    // En dev, le nombre de programmes crees PAR la chauffe : la suite e2e
    // ne compte comme tardifs que ceux nes au rendu, hors chauffe.
    const compte = () => {
      const apres = gl.info.programs?.length ?? 0;
      if (apres === avant) return false;
      creesCycleRef.current += apres - avant;
      for (const pr of gl.info.programs ?? []) idsConnusRef.current.add(pr.id);
      if (process.env.NODE_ENV !== "production") {
        const w = window as unknown as { __nahualChauffe?: { crees: number } };
        w.__nahualChauffe = { crees: (w.__nahualChauffe?.crees ?? 0) + (apres - avant) };
      }
      return true;
    };
    for (const [o, masque] of file) {
      const prev = gl.getRenderTarget();
      if (viaCible) gl.setRenderTarget(cibleRef.current);
      gl.compile(o, camera, scene);
      gl.setRenderTarget(prev);
      o.layers.mask = masque;
      file.delete(o);
      if (compte()) return;
    }
    const annex = annexRef.current;
    while (annex.length > 0) {
      (annex.shift() as () => void)();
      if (compte()) return;
    }
    warmingRef.current = false;
    warmDirection = direction;
    if (arriveeRef.current || creesCycleRef.current > 0) {
      arriveeRef.current = false;
      window.dispatchEvent(new CustomEvent(SHADERS_WARM_EVENT, { detail: { direction } }));
    }
  });

  return null;
}
