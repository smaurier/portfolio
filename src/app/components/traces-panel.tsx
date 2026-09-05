"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./traces-panel.module.css";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { TRACE_IDS, traceCount, type TraceId, type Traces } from "@/lib/traces";
import { getTraces, hydrateTraces, subscribeTraces } from "./traces-store";
import { renderWithNahuatl } from "../../lib/nahuatl";

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
