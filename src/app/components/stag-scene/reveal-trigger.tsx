"use client";

import { useEffect, useRef } from "react";
import { useProgress } from "@react-three/drei";
import { decideCeremony } from "./foyer-decision";
import { SHADERS_WARM_EVENT, getWarmDirection } from "./shader-warmup";

/**
 * RevealTrigger / VeilOrchestrator (31/08 refonte event-driven).
 * Orchestre toute la sequence du voile en reagissant aux VRAIS
 * evenements DOM plutot qu'a des timers arbitraires :
 *
 *  1. animationend du dernier char de la traduction → pose
 *     `data-reveal-done="true"` sur le skeleton. Le CSS demarre alors
 *     la sequence post-reveal (dots + cercle + logo).
 *  2. animationend du dernier char du logo → sequence complete.
 *  3. useProgress atteint 100 (assets 3D charges) ET sequence complete
 *     → attend HOLD_MS puis pose `data-loaded="true"` sur <html>.
 *     Le voile fade out via CSS.
 *
 * Le voile ne peut plus fade out AVANT la fin de la sequence visible.
 * Retour Sylvain 31/08 : "faut pas mettre un delay mais plutot triger
 * l'affichage en fonction de l'affichage de la phrase". Meme principe
 * pour le fade out final : attendre le vrai signal de fin, pas un
 * minuteur.
 *
 * Fallbacks : chaque etape a un timer de secours pour ne pas bloquer
 * le voile indefiniment si un event manque (traduction vide, CSS
 * modifie, etc.).
 */

/** Duree de respiration entre la fin du logo et le fade out du voile. */
const HOLD_AFTER_SEQUENCE_MS = 1000;

/** La chauffe des shaders (11/09) : le voile l'attend, mais jamais plus que
 *  ceci apres le chargement complet. Un pilote lent ou un evenement perdu
 *  ne doivent pas tenir le visiteur devant le voile. */
const WARMUP_FALLBACK_MS = 4000;

/** Foyer deja allume (visiteur qui revient dans la journee, cf lib/foyer) :
 *  aucune ceremonie, donc rien a attendre. Le voile reste le temps du vrai
 *  chargement et s'ouvre des que la scene est la. */
const HOLD_WHEN_HEARTH_LIT_MS = 120;

/** Fallback : si aucun animationend "translationCharReveal" ne remonte
 * dans ce delai, on marque quand meme la sequence pour ne pas bloquer. */
const REVEAL_FALLBACK_MS = 6000;

/** Fallback : si aucun animationend "logoCharReveal" ne remonte dans
 * ce delai APRES data-reveal-done, on marque quand meme la sequence. */
const SEQUENCE_FALLBACK_MS = 6000;

export default function RevealTrigger() {
  const { progress } = useProgress();
  const progressRef = useRef(progress);
  // Ecrit dans un effet et non pendant le rendu (react-hooks/refs) : le ref
  // n'est lu que dans des callbacks (timers, animationend) qui s'executent
  // apres la peinture, donc un tour de retard n'a aucun effet observable.
  // Declare AVANT l'effet principal pour que celui-ci voie deja la valeur.
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);
  const sequenceDoneRef = useRef(false);
  const warmRef = useRef(false);
  const warmFallbackRef = useRef<number | null>(null);

  useEffect(() => {
    const skeleton = document.querySelector<HTMLElement>(
      '[data-testid="piedra-skeleton"]',
    );
    if (!skeleton) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    let done = false;

    // Le feu du foyer ne s'eteint jamais (08/09) : celui qui repasse dans
    // la journee trouve la maison deja allumee. Le voile est alors NU (la
    // Piedra tourne, le reste est masque en CSS par html[data-hearth]),
    // donc aucun animationend ne remontera jamais : on ne peut pas
    // attendre la sequence, il faut la declarer finie tout de suite.
    // La MEME decision que FoyerArrival, memorisee par chargement (12/09) :
    // lire l'attribut ici dependait de l'ordre de montage, et un foyer
    // declare allume APRES ce montage laissait attendre un animationend
    // qui ne viendrait jamais (voile ouvert par le secours de 6 s).
    const hearthLit = !decideCeremony();
    const holdMs = hearthLit ? HOLD_WHEN_HEARTH_LIT_MS : HOLD_AFTER_SEQUENCE_MS;

    const tryPoseLoaded = () => {
      if (process.env.NODE_ENV !== "production") {
        (window as unknown as { __nahualVoile?: unknown }).__nahualVoile = { progress: progressRef.current, sequenceDone: sequenceDoneRef.current, warm: warmRef.current, done };
      }
      if (done) return;
      if (progressRef.current >= 100 && sequenceDoneRef.current && warmRef.current) {
        done = true;
        timers.push(
          setTimeout(() => {
            document.documentElement.setAttribute("data-loaded", "true");
          }, holdMs),
        );
      }
    };

    const markSequenceDone = () => {
      if (sequenceDoneRef.current) return;
      sequenceDoneRef.current = true;
      tryPoseLoaded();
    };

    const markRevealDone = () => {
      if (skeleton.getAttribute("data-reveal-done") === "true") return;
      skeleton.setAttribute("data-reveal-done", "true");
      // A partir d'ici, la sequence post-reveal (dots + cercle + logo)
      // demarre en CSS. Le prochain animationend "logoCharReveal" du
      // dernier char du logo signalera la fin.
      const seqFallback = setTimeout(markSequenceDone, SEQUENCE_FALLBACK_MS);
      timers.push(seqFallback);
    };

    const onAnimEnd = (event: Event) => {
      const e = event as AnimationEvent;
      const el = e.target as HTMLElement | null;
      if (!el) return;
      const idx = parseInt(el.style.getPropertyValue("--char-index") || "-1", 10);
      const total = parseInt(el.style.getPropertyValue("--char-count") || "0", 10);
      const isLastChar = total > 0 && idx === total - 1;
      if (!isLastChar) return;
      if (e.animationName.includes("translationCharReveal")) {
        markRevealDone();
      } else if (e.animationName.includes("logoCharReveal")) {
        markSequenceDone();
      }
    };

    if (hearthLit) {
      skeleton.setAttribute("data-reveal-done", "true");
      markSequenceDone();
    }

    // La chauffe des shaders : l'evenement, ou le delai de secours compte
    // depuis le chargement complet (voir l'effet sur progress plus bas).
    const onWarm = () => {
      if (warmRef.current) return;
      warmRef.current = true;
      tryPoseLoaded();
    };
    window.addEventListener(SHADERS_WARM_EVENT, onWarm);
    // La chauffe a pu finir AVANT que cet ecouteur n'existe (mesure du
    // 11/09, Contact sous CPU x4 : deux courses sur trois, voile leve mais
    // page jamais « chargee ») : on lit son etat de facon synchrone.
    if (getWarmDirection() !== null) warmRef.current = true;
    // Et une reverification periodique, idempotente : aucun drapeau ne
    // peut plus rester vrai sans que la pose ne suive.
    const veille = window.setInterval(tryPoseLoaded, 500);

    skeleton.addEventListener("animationend", onAnimEnd);
    // Fallback global : si la sequence texte ne signale jamais sa
    // fin (traduction vide, CSS change), on marque tout comme
    // fini pour ne pas bloquer le voile.
    const revealFallback = setTimeout(() => {
      markRevealDone();
      markSequenceDone();
    }, REVEAL_FALLBACK_MS);
    timers.push(revealFallback);
    // Idempotent, et necessaire au REMONTAGE de l'effet (rechargement a
    // chaud en dev) : les trois drapeaux peuvent deja etre vrais alors que le
    // minuteur de pose a ete efface par le nettoyage precedent ; sans cet
    // appel, rien ne repose jamais data-loaded (mesure du 11/09 : voile
    // leve, page jamais « chargee », sondes qui expirent).
    tryPoseLoaded();

    return () => {
      window.removeEventListener(SHADERS_WARM_EVENT, onWarm);
      skeleton.removeEventListener("animationend", onAnimEnd);
      timers.forEach(clearTimeout);
      window.clearInterval(veille);
      if (warmFallbackRef.current) window.clearTimeout(warmFallbackRef.current);
    };
  }, []);

  // Le delai de secours de la chauffe part du chargement complet.
  // Le secours de la chauffe : arme UNE fois quand la progression atteint
  // 100, et jamais efface par un changement de progression ulterieur (un
  // chargement tardif le remettait a zero a chaque fois ; efface au
  // demontage seulement).
  useEffect(() => {
    if (progress < 100 || warmRef.current || warmFallbackRef.current !== null) return;
    warmFallbackRef.current = window.setTimeout(() => {
      if (warmRef.current) return;
      warmRef.current = true;
      // Meme chemin que l'evenement : on retente la pose de data-loaded.
      window.dispatchEvent(new Event(SHADERS_WARM_EVENT));
    }, WARMUP_FALLBACK_MS);
  }, [progress]);

  // Reagit au changement de progress : quand les assets 3D finissent
  // de charger, on tente de poser data-loaded (si la sequence est
  // aussi finie).
  useEffect(() => {
    if (progress < 100) return;
    if (!sequenceDoneRef.current || !warmRef.current) return;
    // Re-appel via un tick pour rester dans le flow des effets.
    const hold =
      document.documentElement.getAttribute("data-hearth") === "lit"
        ? HOLD_WHEN_HEARTH_LIT_MS
        : HOLD_AFTER_SEQUENCE_MS;
    const timer = setTimeout(() => {
      if (document.documentElement.getAttribute("data-loaded") === "true") return;
      document.documentElement.setAttribute("data-loaded", "true");
    }, hold);
    return () => clearTimeout(timer);
  }, [progress]);

  return null;
}
