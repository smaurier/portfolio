"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useGLTF, useProgress } from "@react-three/drei";
import { assetsForDirection } from "@/lib/direction-assets";
import type { DirectionKey } from "./direction-colors";
import { useCurrentDirection } from "./use-current-direction";
import { SHADERS_WARM_EVENT, WARMUP_FALLBACK_MS, getWarmDirection } from "./shader-warmup";
import { NEXT_DIRECTION, addIntent, hasIntent, requestMountSlot, useIntentVersion } from "./direction-intent";
import { whenRevealed } from "@/lib/apres-le-voile";

/**
 * MountForDirection (08/09) : ne monte ses enfants que sur les directions
 * qui les concernent, et les GARDE montes un moment apres qu'on a quitte la
 * page, le temps que leur fondu interne se termine.
 *
 * Pourquoi : les composants de direction appellent `useGLTF(path)` dans leur
 * corps, donc leur modele etait telecharge sur TOUTES les pages (mesure du
 * 08/09 : 5,7 Mo de GLB sur l'accueil, cf docs/da/etat-de-l-art.md). Les
 * gater ici evite le telechargement, et evite aussi de faire tourner leur
 * boucle d'animation pour rien.
 *
 * Le delai de sortie compte : chacun de ces composants fonde son opacite au
 * fil des images (blendRef lerp 0,06). Les demonter net ferait un a-coup a
 * la navigation ; on attend donc que le fondu ait eu le temps de finir.
 *
 * L'ARRIVEE CHAUFFEE (11/09) : a l'arrivee sur une direction, le sous-arbre
 * est monte mais INVISIBLE tant que la chauffe des shaders (shader-warmup)
 * n'a pas compile ses programmes, avec un secours de quatre secondes. Sans
 * cela, three compilait tout a la premiere image visible, sur le fil
 * principal : 1,8 s de gel vers Memoire, 2,6 s de Projets vers Services
 * (mesure du 11/09, production, bureau). `compileAsync` parcourt aussi les
 * objets invisibles, donc cacher ne l'empeche pas de chauffer.
 */

const DEFAULT_LINGER_MS = 2500;

/** Le sous-arbre est-il visible ? Faux tant que la chauffe n'a pas fini, ou
 *  quand la direction n'est qu'intentionnee. Les simulateurs (eau, nappes)
 *  le lisent pour ne pas faire un pas, donc compiler, en cachette. Vrai
 *  hors de tout MountForDirection. */
const MountVisibleContext = createContext(true);
export function useMountVisible(): boolean {
  return useContext(MountVisibleContext);
}

export default function MountForDirection({
  is,
  linger = DEFAULT_LINGER_MS,
  children,
}: {
  /** La ou les directions concernees. */
  is: DirectionKey | DirectionKey[];
  linger?: number;
  children: ReactNode;
}) {
  const direction = useCurrentDirection();
  const wanted = Array.isArray(is) ? is.includes(direction) : is === direction;
  // L'intention (voir direction-intent) : monte invisible, pour charger et
  // compiler avant qu'on y aille.
  useIntentVersion();
  const intended = Array.isArray(is) ? is.some((d) => hasIntent(d)) : hasIntent(is);
  // Le montage a l'intention est ETALE : un creneau toutes les deux images
  // (voir direction-intent.requestMountSlot). Une navigation reelle
  // (wanted) monte tout de suite.
  const [slot, setSlot] = useState(false);
  useEffect(() => {
    if (!intended || wanted || slot) return;
    return requestMountSlot(() => setSlot(true));
  }, [intended, wanted, slot]);
  // `lingering` ne sert qu'a SURVIVRE au depart : le rendu suit `wanted`
  // directement, et l'effet ne fait qu'eteindre, jamais allumer. Ajuster
  // l'etat pendant le rendu (et non dans un effet) est le motif documente
  // par React pour un etat derive d'une prop, et ca evite le rendu en
  // cascade que signale react-hooks/set-state-in-effect.
  const [lingering, setLingering] = useState(wanted);
  if (wanted && !lingering) setLingering(true);

  const [warmDirection, setWarmDirection] = useState<DirectionKey | null>(() => getWarmDirection());
  const [lateShowFor, setLateShowFor] = useState<DirectionKey | null>(null);
  // Des modeles qui arrivent APRES la chauffe (Suspense tardif) rendraient
  // des programmes froids : tant qu'un chargement est actif, on se recache,
  // jusqu'a la chauffe suivante.
  const { active } = useProgress();
  const [cold, setCold] = useState(false);
  if (active && wanted && !cold) setCold(true);
  useEffect(() => {
    const onWarm = (event: Event) => {
      const d = (event as CustomEvent<{ direction?: DirectionKey }>).detail?.direction ?? null;
      setCold(false);
      setWarmDirection(d);
    };
    window.addEventListener(SHADERS_WARM_EVENT, onWarm);
    return () => window.removeEventListener(SHADERS_WARM_EVENT, onWarm);
  }, []);
  const warm = warmDirection === direction && !cold;
  useEffect(() => {
    if (!wanted || warm) return;
    const timer = window.setTimeout(() => setLateShowFor(direction), WARMUP_FALLBACK_MS);
    return () => window.clearTimeout(timer);
  }, [wanted, warm, direction]);
  // Au depart (lingering), on reste visible : le fondu interne finit.
  // Intentionne seulement : monte, jamais visible.
  const visible = wanted ? warm || lateShowFor === direction : lingering;

  useEffect(() => {
    if (wanted) return;
    const timer = window.setTimeout(() => setLingering(false), linger);
    return () => window.clearTimeout(timer);
  }, [wanted, linger]);

  return wanted || lingering || (intended && slot) ? (
    <MountVisibleContext.Provider value={visible}>
      <group visible={visible}>{children}</group>
    </MountVisibleContext.Provider>
  ) : null;
}

/**
 * PreloadOnIntent (08/09) : precharge les modeles d'une direction quand le
 * visiteur montre son intention d'y aller (survol ou focus d'un lien
 * cardinal). La navigation reste instantanee sans que l'accueil paie le
 * telechargement de tout le site.
 */
const NEXT_INTENT_DELAY_MS = 3000;

export function PreloadOnIntent() {
  const done = useRef(new Set<string>());
  const direction = useCurrentDirection();
  // La direction SUIVANTE, quelques secondes apres le voile : celle vers
  // laquelle la cloture de page emmene. Montee invisible et compilee pendant
  // que le visiteur lit (11/09, voir direction-intent).
  useEffect(() => {
    let timer = 0;
    const stop = whenRevealed(() => {
      timer = window.setTimeout(() => {
        const next = NEXT_DIRECTION[direction];
        if (next) {
          for (const path of assetsForDirection(next)) useGLTF.preload(path);
          addIntent(next);
        }
      }, NEXT_INTENT_DELAY_MS);
    });
    return () => {
      window.clearTimeout(timer);
      stop();
    };
  }, [direction]);
  useEffect(() => {
    function onIntent(event: Event) {
      const target = event.target as HTMLElement | null;
      const link = target?.closest?.("[data-cardinal-direction]") as HTMLElement | null;
      const key = link?.getAttribute("data-cardinal-direction") as DirectionKey | null;
      if (!key || done.current.has(key)) return;
      done.current.add(key);
      for (const path of assetsForDirection(key)) useGLTF.preload(path);
      addIntent(key);
    }
    document.addEventListener("pointerenter", onIntent, { capture: true, passive: true });
    document.addEventListener("focusin", onIntent, { passive: true });
    return () => {
      document.removeEventListener("pointerenter", onIntent, { capture: true });
      document.removeEventListener("focusin", onIntent);
    };
  }, []);
  return null;
}
