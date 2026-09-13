"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./traces-panel.module.css";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { TRACE_IDS, traceCount, type TraceId, type Traces } from "@/lib/traces";
import { getTraces, hydrateTraces, subscribeTraces } from "./traces-store";
import { renderWithNahuatl } from "../../lib/nahuatl";
import { estJourDuCerf, jourDe, nomCourt } from "@/lib/tonalpohualli";
import { premiereVisite } from "./premiere-visite";

/**
 * TracesPanel (05/09) : « ce que la scene vous a montre ». Un panneau
 * modal (focus piege, Echap, fond cliquable) qui liste les six traces
 * dans l'ordre du recit : celles qui ont ete vues avec leur phrase et
 * leur date, les autres comme des lignes fermees, sans dire ce qu'elles
 * cachent. Comme les succes du folio 2025 de Bruno Simon, dans le ton du
 * Codex.
 */

export type TracesLabels = {
  title: string;
  intro: string;
  close: string;
  count: string; // « {n} traces sur {total} »
  /** « Ton jour : {jour}, {glose} » (le tonalpohualli de la premiere visite). */
  jour: string;
  /** La meme ligne, quand ce jour est celui du cerf. */
  jourCerf: string;
  hidden: string;
  lines: Record<TraceId, string>;
};

function formatDate(ms: number, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(new Date(ms));
  } catch {
    return "";
  }
}

export default function TracesPanel({ labels, locale, onClose }: { labels: TracesLabels; locale: string; onClose: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [traces, setTraces] = useState<Traces>(() => getTraces());
  useFocusTrap(rootRef, true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture du stockage a l'ouverture
    setTraces({ ...hydrateTraces() });
    return subscribeTraces((t) => setTraces({ ...t }));
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  // LE JOUR DU VISITEUR (13/09) : le jour du tonalpohualli de la premiere
  // visite. Calcule a l'ouverture du carnet, jamais au rendu serveur (il
  // depend du calendrier de la machine du visiteur).
  const [jour, setJour] = useState<{ nom: string; glose: string; cerf: boolean } | null>(null);
  useEffect(() => {
    const j = jourDe(new Date(premiereVisite()));
    const glose = locale === "en" ? j.signe.en : locale === "es" ? j.signe.es : j.signe.fr;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- depend du calendrier local, pas du serveur
    setJour({ nom: nomCourt(j), glose, cerf: estJourDuCerf(j) });
  }, [locale]);

  const n = traceCount(traces);
  const count = labels.count.replace("{n}", String(n)).replace("{total}", String(TRACE_IDS.length));

  return (
    <div
      ref={rootRef}
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={labels.title}
    >
      <div className={styles.panel}>
        <button type="button" className={styles.close} onClick={onClose} aria-label={labels.close}>
          ✕
        </button>
        <h2 className={styles.title}>{renderWithNahuatl(labels.title)}</h2>
        <p className={styles.intro}>{renderWithNahuatl(labels.intro)}</p>
        {jour && (
          <p className={styles.jour}>
            {renderWithNahuatl((jour.cerf ? labels.jourCerf : labels.jour).replace("{jour}", jour.nom).replace("{glose}", jour.glose))}
          </p>
        )}
        <p className={styles.count}>{count}</p>
        <ol className={styles.list}>
          {TRACE_IDS.map((id) => {
            const at = traces[id];
            return (
              <li key={id} className={at === undefined ? styles.hidden : styles.seen}>
                {at === undefined ? (
                  <span className={styles.hiddenText}>{labels.hidden}</span>
                ) : (
                  <>
                    <span className={styles.line}>{renderWithNahuatl(labels.lines[id])}</span>
                    <span className={styles.date}>{formatDate(at, locale)}</span>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
