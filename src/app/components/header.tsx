"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import ObfuscatedEmail from "./obfuscated-email";
import CardinalLink from "./stag-scene/cardinal-link";
import type { Dictionary, Locale } from "../../dictionaries";
import { getPageKeyFromSlug, getPath } from "../../lib/routes";

const locales: Locale[] = ["fr", "en", "es"];
const langNames: Record<Locale, string> = {
  fr: "Français",
  en: "English",
  es: "Español",
};

/**
 * Header partagé du site. Depuis le 25/08 (retour Sylvain : "on fait
 * un menu pour mobile ? car actuellement la navigation est
 * impossible"), un burger apparaît sous 768px et ouvre un panel
 * plein écran contenant toute la nav (liens de pages + langues +
 * liens externes). Desktop inchangé.
 *
 * État `open` local (useState) : le layout est un Server Component,
 * mais Header est déjà `use client` — pas de plomberie
 * supplémentaire nécessaire. Escape ferme, clic sur un lien ferme
 * (utile côté nav interne SPA : le composant reste monté après
 * navigation, il faut refermer explicitement), scroll du body
 * verrouillé tant que le panel est ouvert.
 */
export default function Header({ locale, dict }: { locale: Locale; dict: Dictionary["common"] }) {
  const pathname = usePathname() || `/${locale}`;
  // Retrouve la page courante (pas juste le slug brut) pour que le switcher
  // de langue pointe vers l'équivalent traduit, pas vers un slug qui n'existe
  // pas dans l'autre langue (/es/servicios -> /en/services, pas /en/servicios).
  const currentSlug = pathname.split("/")[2];
  const currentKey = currentSlug ? getPageKeyFromSlug(locale, currentSlug) : undefined;

  const hrefFor = (target: Locale) => (currentKey ? getPath(target, currentKey) : `/${target}`);

  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    // Verrouille le scroll du body pendant que le panel est ouvert
    // (sinon la scène 3D en fond continue de scroller au touch).
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <header className="header">
      <div className="header_up">
        <ul>
          <li>
            <Link href="https://www.linkedin.com/in/smaurier/">linkedin</Link>
          </li>
          <li>
            <Link href="https://github.com/smaurier">github</Link>
          </li>
          <li>
            <ObfuscatedEmail placeholder={dict.showEmail} />
          </li>
        </ul>
        <ul className="langSwitcher" aria-label={dict.langSwitcherLabel}>
          {locales.map((l) => (
            <li key={l}>
              <Link
                href={hrefFor(l)}
                hrefLang={l}
                lang={l}
                aria-label={langNames[l]}
                aria-current={l === locale ? "true" : undefined}
                className={l === locale ? "langActive" : undefined}
              >
                {l.toUpperCase()}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="header_bottom">
        <CardinalLink href={`/${locale}`} className="logoLink" onClick={close}>
          <Image src="/img/mini-logo.svg" alt="" width={32} height={32} />
          <span className="logoText">Nahual</span>
        </CardinalLink>
        <nav>
          <ul>
            <li>
              <CardinalLink href={`/${locale}`}>{dict.nav.home}</CardinalLink>
            </li>
            <li>
              <CardinalLink href={getPath(locale, "services")}>{dict.nav.services}</CardinalLink>
            </li>
            <li>
              <CardinalLink href={getPath(locale, "projets")}>{dict.nav.projects}</CardinalLink>
            </li>
            <li>
              <CardinalLink href={getPath(locale, "contact")}>{dict.nav.contact}</CardinalLink>
            </li>
            <li>
              <CardinalLink href={getPath(locale, "memoire")}>{dict.nav.memoire}</CardinalLink>
            </li>
          </ul>
        </nav>
        <button
          type="button"
          className="mobileMenuButton"
          aria-expanded={open}
          aria-controls="mobile-menu-panel"
          aria-label={open ? dict.closeMenu : dict.openMenu}
          onClick={() => setOpen((prev) => !prev)}
        >
          <span className={`burgerIcon ${open ? "burgerIconOpen" : ""}`} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
      </div>

      {/* Panel mobile — rendu conditionnel plutôt qu'un display:none
          permanent pour éviter que les liens soient dans l'ordre de
          tabulation quand le panel est fermé sur mobile. */}
      {open && (
        <div id="mobile-menu-panel" className="mobilePanel" role="dialog" aria-modal="true">
          <nav className="mobileNav" aria-label={dict.nav.home}>
            <ul>
              <li>
                <CardinalLink href={`/${locale}`} onClick={close}>{dict.nav.home}</CardinalLink>
              </li>
              <li>
                <CardinalLink href={getPath(locale, "services")} onClick={close}>{dict.nav.services}</CardinalLink>
              </li>
              <li>
                <CardinalLink href={getPath(locale, "projets")} onClick={close}>{dict.nav.projects}</CardinalLink>
              </li>
              <li>
                <CardinalLink href={getPath(locale, "contact")} onClick={close}>{dict.nav.contact}</CardinalLink>
              </li>
              <li>
                <CardinalLink href={getPath(locale, "memoire")} onClick={close}>{dict.nav.memoire}</CardinalLink>
              </li>
            </ul>
          </nav>

          <ul className="mobileExternal">
            <li>
              <Link href="https://www.linkedin.com/in/smaurier/" onClick={close}>linkedin</Link>
            </li>
            <li>
              <Link href="https://github.com/smaurier" onClick={close}>github</Link>
            </li>
            <li>
              <ObfuscatedEmail placeholder={dict.showEmail} />
            </li>
          </ul>

          <ul className="mobileLangSwitcher" aria-label={dict.langSwitcherLabel}>
            {locales.map((l) => (
              <li key={l}>
                <Link
                  href={hrefFor(l)}
                  hrefLang={l}
                  lang={l}
                  aria-label={langNames[l]}
                  aria-current={l === locale ? "true" : undefined}
                  onClick={close}
                >
                  {l.toUpperCase()}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
