"use client";

import { useEffect } from "react";
import { VEILLE_ATTR, VEILLE_DELAI_MS, VEILLE_EVENT, VEILLE_PARAM, veilleDue } from "@/lib/veille";
import { veilleStore } from "./stag-scene/veille-store";

/**
 * LE COMPTE DE LA VEILLE (13/09, lib/veille). Vingt secondes sans souris,
 * molette, clavier ni toucher : le monde entre en veille. `data-veille`
 * sur <html> fait s'effacer les textes, le bandeau et les controles
 * (globals.css) ; le store fait deriver la camera et adoucir le flou ; le
 * son ecoute l'evenement pour entrer sa musique. Tout geste rend le monde.
 *
 * Elle ne s'ouvre pas : avant la fin de l'arrivee, en mode recit, pendant
 * la fumee du miroir, avec une boite de dialogue ouverte, ni quand l'onglet
 * est cache (rien a contempler). Sous mouvement reduit, les textes
 * s'effacent quand meme (un fondu), la camera ne derive pas (orbit-camera).
 */
export default function Veille() {
  useEffect(() => {
    const root = document.documentElement;
    let delai = VEILLE_DELAI_MS;
    try {
      // `?veille=<ms>` raccourcit le delai (suite e2e, demonstration) ;
      // `?veille=off` l'eteint, pour les mesures qui restent longtemps
      // immobiles sur une page (vitals, captures) et n'ont rien demande
      // a la contemplation.
      const brut = new URLSearchParams(window.location.search).get(VEILLE_PARAM);
      if (brut === "off") return;
      const v = Number(brut);
      if (Number.isFinite(v) && v >= 500) delai = v;
    } catch {
      // pas d'URL lisible : le delai par defaut
    }
    let dernierGeste = performance.now();
    let minuterie = 0;

    const peutVeiller = () =>
      root.getAttribute("data-foyer") === "done" &&
      !document.body.classList.contains("reading-mode") &&
      !document.querySelector('[data-miroir="en-cours"]') &&
      !document.querySelector('[role="dialog"]') &&
      document.visibilityState === "visible";

    const armer = () => {
      window.clearTimeout(minuterie);
      const reste = Math.max(0, delai - (performance.now() - dernierGeste));
      minuterie = window.setTimeout(() => {
        if (veilleDue(performance.now(), dernierGeste, delai)) entrer();
        else armer();
      }, reste + 10);
    };
    const entrer = () => {
      if (veilleStore.active) return;
      if (!peutVeiller()) {
        // Pas maintenant : on regarde de nouveau dans un instant.
        dernierGeste = performance.now() - delai + 1500;
        armer();
        return;
      }
      veilleStore.active = true;
      veilleStore.depuis = performance.now();
      root.setAttribute(VEILLE_ATTR, "en-cours");
      window.dispatchEvent(new CustomEvent(VEILLE_EVENT, { detail: { etat: "en-cours" } }));
    };
    const sortir = () => {
      if (!veilleStore.active) return;
      veilleStore.active = false;
      root.removeAttribute(VEILLE_ATTR);
      window.dispatchEvent(new CustomEvent(VEILLE_EVENT, { detail: { etat: "reveil" } }));
    };
    const geste = () => {
      dernierGeste = performance.now();
      sortir();
      armer();
    };
    const onVisibilite = () => {
      if (document.visibilityState !== "visible") sortir();
      geste();
    };
    const evenements = ["pointermove", "pointerdown", "wheel", "keydown", "touchstart", "scroll"] as const;
    for (const e of evenements) window.addEventListener(e, geste, { passive: true });
    document.addEventListener("visibilitychange", onVisibilite);
    armer();
    return () => {
      window.clearTimeout(minuterie);
      for (const e of evenements) window.removeEventListener(e, geste);
      document.removeEventListener("visibilitychange", onVisibilite);
      sortir();
    };
  }, []);
  return null;
}
