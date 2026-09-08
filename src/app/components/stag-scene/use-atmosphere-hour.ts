"use client";

import { useEffect, useRef, useState } from "react";
import { journeyHour } from "@/lib/nepantla";
import type { DirectionKey } from "./direction-colors";
import { useCardinalTransition } from "./cardinal-transition-context";
import { useCurrentDirection } from "./use-current-direction";

/**
 * L'heure atmospherique du monde (03/09, etage 3 Nepantla). Au repos,
 * c'est la direction de la route. Pendant un passage cardinal, c'est
 * l'heure TRAVERSEE du voyage du soleil (journeyHour, lib/nepantla) :
 * Est → Nord passe par le zenith puis le crepuscule ; le soleil ne
 * recule jamais ; le Centre est hors du temps.
 *
 * A consommer UNIQUEMENT par l'atmosphere : palette (PersistentScene),
 * fog + rig lumiere (RevealLighting), grade (PostFX), ambiances
 * cardinales. Les gates d'identite (eau du Nord, lames, Xolotl,
 * milpa...) restent sur useCurrentDirection : monter/demonter ces
 * machineries a chaque heure intermediaire serait absurde et couteux.
 *
 * setState ne change que 1 a 3 fois par voyage (React bail-out si
 * valeur identique) : pas de re-render 60fps. Les consommateurs
 * gardent leur lissage ~800ms : la traversee = balayage de teintes.
 * Reduced motion : pas d'heures intermediaires, l'heure = la cible
 * (les consommateurs snappent deja, un flicker par heure serait pire).
 *
 * 08/09 : l'etat ne sert plus qu'a la TRAVERSEE. Au repos, l'heure EST la
 * route, on la retourne directement au lieu de la recopier dans un etat
 * depuis un effet. Rien a synchroniser, donc rien a desynchroniser : ca
 * retire deux setState d'effet (react-hooks/set-state-in-effect) et une
 * source de rendu en cascade, sans changer un pixel.
 */
export function useAtmosphereHour(): DirectionKey {
  const route = useCurrentDirection();
  const transition = useCardinalTransition();
  const targetDirection = transition?.transitionDirection ?? null;
  // L'heure du VOYAGE seulement : hors passage, elle ne sert a rien.
  const [travelHour, setTravelHour] = useState<DirectionKey>(route);

  // Route courante en ref : le voyage capture son heure de DEPART au
  // moment ou la transition demarre (la route est encore l'ancienne,
  // la nav n'a lieu qu'au coeur du mouvement).
  const routeRef = useRef(route);
  useEffect(() => {
    routeRef.current = route;
  }, [route]);

  useEffect(() => {
    if (!targetDirection || !transition) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = routeRef.current;
    let raf = 0;
    // Le setState vit dans le callback rAF, jamais dans le corps de
    // l'effet : sous mouvement reduit on pose la cible en une image puis
    // on s'arrete, au lieu de traverser les heures.
    const tick = () => {
      setTravelHour(
        reduced
          ? targetDirection
          : journeyHour(from, targetDirection, transition.transitionProgressRef.current),
      );
      if (!reduced) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [targetDirection, transition]);

  // Au repos, l'heure est la route ; en voyage, celle de la traversee.
  return targetDirection ? travelHour : route;
}
