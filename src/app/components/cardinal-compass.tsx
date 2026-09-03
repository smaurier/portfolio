"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { pageKeys, slugs, getPath, type PageKey } from "@/lib/routes";
import { getDictionary, type Locale } from "@/dictionaries";
import { renderWithNahuatl } from "@/lib/nahuatl";
import CompassOverlay from "./compass-overlay";
import { useCurrentDirection } from "./stag-scene/use-current-direction";
import { useCardinalTransition, type CardinalDirection } from "./stag-scene/cardinal-transition-context";
import type { DirectionKey } from "./stag-scene/direction-colors";
import styles from "./cardinal-compass.module.css";

/**
 * Cardinal compass (28/08 retour Sylvain). Indicateur bas droite,
 * croix 5 points cardinaux (N haut, W-C-E centre, S bas). Direction
 * courante = highlight couleur cardinale + glow. Cliquable pour nav
 * rapide, meme flow que CardinalLink (transitions VT + burst).
 *
 * Cross layout dans grille 3x3 :
 *  [_] [N] [_]
 *  [W] [C] [E]
 *  [_] [S] [_]
 *
 * Direction → page :
 *   N = Nord/obsidienne  → memoire
 *   E = Est/dore         → services
 *   S = Sud/turquoise    → projets
 *   W = Ouest/cendre     → contact
 *   C = Centre/jade      → home (locale root)
 */

const CARDINAL_COLORS: Record<DirectionKey, string> = {
  jade: "#00c078",
  dore: "#ffb400",
  turquoise: "#0f6bb8",
  cendre: "#d76464",
  obsidienne: "#6b3fa8",
};

type Slot = {
  direction: DirectionKey;
  page: PageKey | "home";
  label: Record<Locale, string>;
  /** Nom nahuatl de la region cardinale (Codex Nahual section 03). */
  region: string;
  /** Gardien nahua de la direction. */
  guardian: string;
};

const SLOTS: Record<"N" | "E" | "S" | "W" | "C", Slot> = {
  N: {
    direction: "obsidienne",
    page: "memoire",
    label: { fr: "Nord · Mémoire", en: "North · Memory", es: "Norte · Memoria" },
    region: "Mictlampa",
    guardian: "Mictlantecuhtli",
  },
  E: {
    direction: "dore",
    page: "services",
    label: { fr: "Est · Services", en: "East · Services", es: "Este · Servicios" },
    region: "Tlahuizcalpan",
    guardian: "Tonatiuh",
  },
  S: {
    direction: "turquoise",
    page: "projets",
    label: { fr: "Sud · Projets", en: "South · Projects", es: "Sur · Proyectos" },
    region: "Huitztlampa",
    guardian: "Huitzilopochtli",
  },
  W: {
    direction: "cendre",
    page: "contact",
    label: { fr: "Ouest · Contact", en: "West · Contact", es: "Oeste · Contacto" },
    region: "Cihuatlampa",
    guardian: "Cihuateteo",
  },
  C: {
    direction: "jade",
    page: "home",
    label: { fr: "Centre · Accueil", en: "Center · Home", es: "Centro · Inicio" },
    region: "Tlalxicco",
    guardian: "Xiuhtecuhtli",
  },
};

function isLocale(v: string): v is Locale {
  return v === "fr" || v === "en" || v === "es";
}

// Sortir de CardinalCompass (react-hooks/static-components) : declarer
// les composants au module level plutot que dans le body du parent
// pour eviter la creation a chaque render.
function CompassDot({
  slot,
  active,
  locale,
  onClick,
}: {
  slot: Slot;
  active: boolean;
  locale: Locale;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      className={styles.dot}
      data-active={active ? "true" : "false"}
      data-compass-direction={slot.direction}
      style={{ ["--compass-color" as string]: CARDINAL_COLORS[slot.direction] }}
      onClick={onClick}
      aria-label={slot.label[locale]}
      aria-current={active ? "page" : undefined}
    >
      {/* Tooltip nahuatl (29/08). Revele au hover/focus le nom nahuatl
          de la region + le gardien. aria-hidden pour ne pas doubler
          l'aria-label du bouton. */}
      <span className={styles.tooltip} aria-hidden="true">
        {slot.label[locale]}
        <span className={styles.tooltipDivider}> · </span>
        {renderWithNahuatl(slot.region)}
        <span className={styles.tooltipDivider}> · </span>
        <span className={styles.tooltipGuardian}>{renderWithNahuatl(slot.guardian)}</span>
      </span>
    </button>
  );
}

export default function CardinalCompass({ locale }: { locale: string }) {
  const router = useRouter();
  const current = useCurrentDirection();
  const transition = useCardinalTransition();
  const [overlayOpen, setOverlayOpen] = useState(false);
  const dict = getDictionary(locale);

  function localeSafe(): Locale {
    return isLocale(locale) ? locale : "fr";
  }

  function spawnRipple(x: number, y: number, color: string) {
    // Ripple click cardinal (28/08 boite outil #5) : onde concentrique
    // qui traverse ecran depuis point click, couleur direction.
    // Auto-supprime apres anim CSS via animationend.
    if (typeof document === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ripple = document.createElement("div");
    ripple.className = "cardinalRipple";
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.style.setProperty("--ripple-color", color);
    document.body.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
  }

  function navigate(slot: Slot, event?: React.MouseEvent<HTMLButtonElement>) {
    const l = localeSafe();
    const href = slot.page === "home" ? `/${l}` : getPath(l, slot.page);
    const direction = slot.direction as CardinalDirection;
    // Ripple depuis le point de click (ou centre du dot si event vide)
    if (event) {
      spawnRipple(event.clientX, event.clientY, CARDINAL_COLORS[slot.direction]);
    }
    if (!transition) {
      router.push(href);
      return;
    }
    // Timeline Nepantla (03/09) : le contexte orchestre sortie du
    // contenu + nav, NepantlaFrame joue l'entree. Plus de VT API.
    transition.startTransition(direction, () => {
      router.push(href);
    });
  }

  const l = localeSafe();
  const dot = (slot: Slot) => (
    <CompassDot
      slot={slot}
      active={slot.direction === current}
      locale={l}
      onClick={(e) => navigate(slot, e)}
    />
  );

  return (
    <>
      <nav
        className={styles.compass}
        aria-label={l === "fr" ? "Boussole cardinale" : l === "en" ? "Cardinal compass" : "Brújula cardinal"}
      >
        <span className={styles.slotEmpty} aria-hidden="true" />
        {dot(SLOTS.N)}
        <span className={styles.slotEmpty} aria-hidden="true" />
        {dot(SLOTS.W)}
        {dot(SLOTS.C)}
        {dot(SLOTS.E)}
        <span className={styles.slotEmpty} aria-hidden="true" />
        {dot(SLOTS.S)}
        <span className={styles.slotEmpty} aria-hidden="true" />
        {/* Bouton expand (28/08 boite outil C) : ouvre modal detaille
            les 5 directions cardinales avec descriptions mytho. */}
        <button
          type="button"
          className={styles.expand}
          onClick={() => setOverlayOpen(true)}
          aria-label={dict.common.compass.expand}
          title={dict.common.compass.expand}
        >
          <span aria-hidden="true">i</span>
        </button>
      </nav>
      {overlayOpen && (
        <CompassOverlay
          cosmos={dict.codex.cosmos}
          closeLabel={dict.common.compass.close}
          onClose={() => setOverlayOpen(false)}
        />
      )}
    </>
  );
}
