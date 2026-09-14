"use client";

import { useEffect, useRef, useState } from "react";
import { useReadingMode } from "@/lib/reading-mode-context";

/**
 * LA PAGE ACCESSIBILITE DEMONTRE AU LIEU DE DECLARER (14/09, O2 du
 * registre des mecaniques).
 *
 * Le constat du registre : l'accessibilite est l'axe ou ce site est le
 * meilleur et le moins montre. Une declaration de conformite dit ce qu'on
 * a fait ; elle ne le PROUVE a personne, et surtout pas a un jury ou a un
 * client qui, lui, veut voir.
 *
 * Ce bloc ne raconte donc rien : il donne trois choses a essayer, ici, sur
 * cette page, et affiche en direct ce que la machine repond.
 *
 *  1. Le clavier : la barre lit, a chaque deplacement du focus, le NOM
 *     ACCESSIBLE de l'element atteint, exactement ce qu'un lecteur d'ecran
 *     annoncerait. Un nom manquant se verrait ici tout de suite. Elle est
 *     muette pour les technologies d'assistance : elles annoncent deja
 *     l'element, cette ligne ne ferait que repeter.
 *  2. Le mouvement reduit : l'etat reel du systeme du visiteur, et ce que
 *     le site en fait.
 *  3. Le mode recit : le meme bouton que dans la colonne, a portee de
 *     main, avec son etat.
 *
 * Rien n'est simule : le nom accessible est calcule sur l'element vraiment
 * focalise, dans l'ordre que suit une technologie d'assistance.
 */
export type DemoLabels = {
  title: string;
  intro: string;
  clavierTitle: string;
  clavierAide: string;
  clavierVide: string;
  mouvementTitle: string;
  mouvementReduit: string;
  mouvementNormal: string;
  recitTitle: string;
  recitAide: string;
  recitActiver: string;
  recitDesactiver: string;
};

/** Le nom accessible, dans l'ordre ou une technologie d'assistance le
 * cherche : aria-labelledby, puis aria-label, puis l'etiquette, puis le
 * contenu, puis title. Approximation honnete, suffisante pour montrer
 * qu'un nom existe ou qu'il manque. */
function nomAccessible(el: Element): string {
  const parId = el.getAttribute("aria-labelledby");
  if (parId) {
    const textes = parId
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent?.trim() ?? "")
      .filter(Boolean);
    if (textes.length > 0) return textes.join(" ");
  }
  const label = el.getAttribute("aria-label");
  if (label?.trim()) return label.trim();
  if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
    const etiquette = el.labels?.[0]?.textContent?.trim();
    if (etiquette) return etiquette;
  }
  const texte = el.textContent?.replace(/\s+/g, " ").trim();
  if (texte) return texte.slice(0, 80);
  const title = el.getAttribute("title");
  return title?.trim() ?? "";
}

function role(el: Element): string {
  const explicite = el.getAttribute("role");
  if (explicite) return explicite;
  const t = el.tagName.toLowerCase();
  if (t === "a") return el.hasAttribute("href") ? "lien" : "a";
  if (t === "button") return "bouton";
  if (t === "input") return (el as HTMLInputElement).type;
  return t;
}

export default function AccessibiliteDemo({ labels }: { labels: DemoLabels }) {
  const [focus, setFocus] = useState<{ nom: string; role: string } | null>(null);
  const [reduit, setReduit] = useState<boolean | null>(null);
  const recit = useReadingMode();
  const zoneRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const surFocus = (e: FocusEvent) => {
      const el = e.target;
      if (!(el instanceof Element) || zoneRef.current?.contains(el)) return;
      setFocus({ nom: nomAccessible(el), role: role(el) });
    };
    document.addEventListener("focusin", surFocus);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const surMq = () => setReduit(mq.matches);
    surMq();
    mq.addEventListener("change", surMq);
    return () => {
      document.removeEventListener("focusin", surFocus);
      mq.removeEventListener("change", surMq);
    };
  }, []);

  return (
    <section className="codexSection demoA11y">
      <h2>{labels.title}</h2>
      <p>{labels.intro}</p>

      <h3>{labels.clavierTitle}</h3>
      <p>{labels.clavierAide}</p>
      {/* Volontairement MUETTE pour les technologies d'assistance
          (`aria-hidden`). Une region live qui se met a jour a chaque
          deplacement du focus ferait repeter, juste apres l'element, ce que
          le lecteur d'ecran vient deja d'annoncer : deux voix pour une
          seule information. Cette ligne est une demonstration A L'OEIL, pour
          qui n'entend pas le lecteur d'ecran. */}
      <p ref={zoneRef} className="demoA11yEcho" aria-hidden="true">
        {focus ? `${focus.role} · ${focus.nom || "—"}` : labels.clavierVide}
      </p>

      <h3>{labels.mouvementTitle}</h3>
      <p>{reduit === null ? "…" : reduit ? labels.mouvementReduit : labels.mouvementNormal}</p>

      <h3>{labels.recitTitle}</h3>
      <p>{labels.recitAide}</p>
      <button type="button" className="ctaButton" onClick={recit.toggle} aria-pressed={recit.active}>
        {recit.active ? labels.recitDesactiver : labels.recitActiver}
      </button>
    </section>
  );
}
