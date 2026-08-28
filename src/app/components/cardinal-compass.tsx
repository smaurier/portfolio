"use client";

import { useRouter } from "next/navigation";
import { flushSync } from "react-dom";
import { pageKeys, slugs, getPath, type PageKey } from "@/lib/routes";
import type { Locale } from "@/dictionaries";
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
};

const SLOTS: Record<"N" | "E" | "S" | "W" | "C", Slot> = {
  N: {
    direction: "obsidienne",
    page: "memoire",
    label: { fr: "Nord · Mémoire", en: "North · Memory", es: "Norte · Memoria" },
  },
  E: {
    direction: "dore",
    page: "services",
    label: { fr: "Est · Services", en: "East · Services", es: "Este · Servicios" },
  },
  S: {
    direction: "turquoise",
    page: "projets",
    label: { fr: "Sud · Projets", en: "South · Projects", es: "Sur · Proyectos" },
  },
  W: {
    direction: "cendre",
    page: "contact",
    label: { fr: "Ouest · Contact", en: "West · Contact", es: "Oeste · Contacto" },
  },
  C: {
    direction: "jade",
    page: "home",
    label: { fr: "Centre · Accueil", en: "Center · Home", es: "Centro · Inicio" },
  },
};

function isLocale(v: string): v is Locale {
  return v === "fr" || v === "en" || v === "es";
}

export default function CardinalCompass({ locale }: { locale: string }) {
  const router = useRouter();
  const current = useCurrentDirection();
  const transition = useCardinalTransition();

  function localeSafe(): Locale {
    return isLocale(locale) ? locale : "fr";
  }

  function navigate(slot: Slot) {
    const l = localeSafe();
    const href = slot.page === "home" ? `/${l}` : getPath(l, slot.page);
    const direction = slot.direction as CardinalDirection;
    if (!transition) {
      router.push(href);
      return;
    }
    transition.startTransition(direction, () => {
      document.documentElement.setAttribute("data-cardinal-nav", direction);
      type ViewTransitionDocument = Document & {
        startViewTransition?: (cb: () => void) => { finished: Promise<void> };
      };
      const doc = document as ViewTransitionDocument;
      if (typeof doc.startViewTransition === "function") {
        const vt = doc.startViewTransition(() => {
          flushSync(() => {
            router.push(href);
          });
        });
        vt.finished.finally(() => {
          document.documentElement.removeAttribute("data-cardinal-nav");
        });
      } else {
        router.push(href);
        setTimeout(() => document.documentElement.removeAttribute("data-cardinal-nav"), 500);
      }
    });
  }

  function Dot({ slot }: { slot: Slot }) {
    const active = slot.direction === current;
    const l = localeSafe();
    return (
      <button
        type="button"
        className={styles.dot}
        data-active={active ? "true" : "false"}
        data-compass-direction={slot.direction}
        style={{ ["--compass-color" as string]: CARDINAL_COLORS[slot.direction] }}
        onClick={() => navigate(slot)}
        aria-label={slot.label[l]}
        aria-current={active ? "page" : undefined}
      />
    );
  }

  const l = localeSafe();

  return (
    <nav
      className={styles.compass}
      aria-label={l === "fr" ? "Boussole cardinale" : l === "en" ? "Cardinal compass" : "Brújula cardinal"}
    >
      <span className={styles.slotEmpty} aria-hidden="true" />
      <Dot slot={SLOTS.N} />
      <span className={styles.slotEmpty} aria-hidden="true" />
      <Dot slot={SLOTS.W} />
      <Dot slot={SLOTS.C} />
      <Dot slot={SLOTS.E} />
      <span className={styles.slotEmpty} aria-hidden="true" />
      <Dot slot={SLOTS.S} />
      <span className={styles.slotEmpty} aria-hidden="true" />
    </nav>
  );
}
