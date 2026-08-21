"use client";

import Image from 'next/image';
import Link from "next/link";
import { usePathname } from "next/navigation";
import ObfuscatedEmail from "./obfuscated-email";
import type { Dictionary, Locale } from "../../dictionaries";
import { getPageKeyFromSlug, getPath } from "../../lib/routes";

const locales: Locale[] = ["fr", "en", "es"];
const langNames: Record<Locale, string> = {
  fr: "Français",
  en: "English",
  es: "Español",
};

export default function Header({ locale, dict }: { locale: Locale; dict: Dictionary["common"] }) {
  const pathname = usePathname() || `/${locale}`;
  // Retrouve la page courante (pas juste le slug brut) pour que le switcher
  // de langue pointe vers l'équivalent traduit, pas vers un slug qui n'existe
  // pas dans l'autre langue (/es/servicios -> /en/services, pas /en/servicios).
  const currentSlug = pathname.split("/")[2];
  const currentKey = currentSlug ? getPageKeyFromSlug(locale, currentSlug) : undefined;

  const hrefFor = (target: Locale) => (currentKey ? getPath(target, currentKey) : `/${target}`);

  return (
    <header className='header'>
      <div className='header_up'>
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
      <div className='header_bottom'>
        <Link href={`/${locale}`} className="logoLink">
          <Image src="/img/mini-logo.svg" alt="" width={32} height={32} />
          <span className="logoText">Nahual</span>
        </Link>
        <nav>
          <ul>
            <li>
              <Link href={`/${locale}`}>{dict.nav.home}</Link>
            </li>
            <li>
              <Link href={getPath(locale, "services")}>{dict.nav.services}</Link>
            </li>
            <li>
              <Link href={getPath(locale, "projets")}>{dict.nav.projects}</Link>
            </li>
            <li>
              <Link href={getPath(locale, "contact")}>{dict.nav.contact}</Link>
            </li>
            <li>
              <Link href={getPath(locale, "memoire")}>{dict.nav.memoire}</Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}
