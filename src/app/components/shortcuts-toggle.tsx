"use client";

import { useEffect, useState } from "react";
import { isShortcutsEnabled, setShortcutsEnabled, subscribeShortcuts } from "@/lib/shortcuts";
import type { Locale } from "@/dictionaries";

/**
 * Toggle pour desactiver les raccourcis clavier/manette (RGAA 12.10).
 * Rendu en tete de la page Accessibilite. Persist localStorage via
 * le module @/lib/shortcuts, ecoute les changements pour rester
 * synchronise si l'user modifie ailleurs (ex : autre onglet).
 */

const LABEL: Record<Locale, { on: string; off: string; description: string }> = {
  fr: {
    on: "Raccourcis clavier et manette activés",
    off: "Raccourcis clavier et manette désactivés",
    description:
      "Décochez pour désactiver les raccourcis WASD/ZQSD (navigation cardinale) et les boutons de manette. Les raccourcis avec modificateur (Alt+flèches) et Échap restent actifs — ils ne sont pas soumis au critère RGAA 12.10.",
  },
  en: {
    on: "Keyboard and gamepad shortcuts enabled",
    off: "Keyboard and gamepad shortcuts disabled",
    description:
      "Uncheck to disable WASD (cardinal navigation) and gamepad button shortcuts. Modifier shortcuts (Alt+arrows) and Escape remain active — they are not subject to WCAG 2.1.4 / RGAA 12.10.",
  },
  es: {
    on: "Atajos de teclado y mando activados",
    off: "Atajos de teclado y mando desactivados",
    description:
      "Desmarque para desactivar los atajos WASD (navegación cardinal) y los botones del mando. Los atajos con modificador (Alt+flechas) y Escape permanecen activos — no están sujetos al criterio RGAA 12.10.",
  },
};

export default function ShortcutsToggle({ locale }: { locale: Locale }) {
  const [enabled, setEnabled] = useState(true);
  useEffect(() => {
    setEnabled(isShortcutsEnabled());
    return subscribeShortcuts(setEnabled);
  }, []);

  const labels = LABEL[locale] ?? LABEL.fr;

  return (
    <section className="codexSection shortcutsToggle">
      <label style={{ display: "flex", alignItems: "center", gap: "0.75em", cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setShortcutsEnabled(e.target.checked)}
        />
        <strong>{enabled ? labels.on : labels.off}</strong>
      </label>
      <p style={{ marginTop: "0.5em", fontSize: "0.95em", opacity: 0.85 }}>{labels.description}</p>
    </section>
  );
}
