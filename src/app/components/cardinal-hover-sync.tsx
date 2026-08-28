"use client";

import { useEffect } from "react";

/**
 * Cardinal hover sync (28/08 retour Sylvain). Ecoute pointerover/out
 * global sur elements [data-cardinal-direction] (nav items) et
 * [data-compass-direction] (compass dots), pose body[data-cardinal-
 * hover=X] pour que CSS puisse pulse le point equivalent dans les
 * autres widgets. Bidirectionnel.
 *
 * Nav item hover → compass dot pulse. Compass dot hover → nav item
 * peut aussi glow via meme selecteur CSS.
 */

export default function CardinalHoverSync() {
  useEffect(() => {
    if (typeof document === "undefined") return;

    function readDirection(el: HTMLElement | null | undefined): string | null {
      if (!el) return null;
      const nav = el.closest?.("[data-cardinal-direction]") as HTMLElement | null;
      if (nav) return nav.getAttribute("data-cardinal-direction");
      const cmp = el.closest?.("[data-compass-direction]") as HTMLElement | null;
      if (cmp) return cmp.getAttribute("data-compass-direction");
      return null;
    }

    function onOver(e: PointerEvent) {
      const dir = readDirection(e.target as HTMLElement | null);
      if (dir) document.body.setAttribute("data-cardinal-hover", dir);
    }
    function onOut(e: PointerEvent) {
      const from = readDirection(e.target as HTMLElement | null);
      if (!from) return;
      const to = readDirection(e.relatedTarget as HTMLElement | null);
      if (to === from) return;
      document.body.removeAttribute("data-cardinal-hover");
    }

    document.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("pointerout", onOut, { passive: true });
    return () => {
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);
      document.body.removeAttribute("data-cardinal-hover");
    };
  }, []);

  return null;
}
