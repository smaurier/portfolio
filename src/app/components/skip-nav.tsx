import styles from "./skip-nav.module.css";

/**
 * Skip nav a11y (28/08 task #49). Premier élément focusable du
 * document, saute vers #main (le container principal des pages).
 * Sr-only par défaut, révélé au focus.
 *
 * Localisé fr/en/es via prop label.
 */
export default function SkipNav({ label }: { label: string }) {
  return (
    <a href="#main" className={styles.skipNav}>
      {label}
    </a>
  );
}
