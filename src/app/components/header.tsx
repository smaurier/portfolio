"use client";

import Image from 'next/image';
import Link from "next/link";
import { usePathname } from "next/navigation";
import ObfuscatedEmail from "./obfuscated-email";
import type { Dictionary, Locale } from "../../dictionaries";

const locales: Locale[] = ["fr", "en", "es"];
const langNames: Record<Locale, string> = {
  fr: "Français",
  en: "English",
  es: "Español",
};

export default function Header({ locale, dict }: { locale: Locale; dict: Dictionary["common"] }) {
  const pathname = usePathname() || `/${locale}`;
  // Reste du chemin une fois le préfixe de locale retiré, pour que le
  // switcher de langue conserve la page courante (ex. /fr/services -> /en/services).
  const rest = pathname.replace(new RegExp(`^/(${locales.join("|")})`), "");

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
                href={`/${l}${rest}`}
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
              <Link href={`/${locale}/services`}>{dict.nav.services}</Link>
            </li>
            <li>
              <Link href={`/${locale}/projets`}>{dict.nav.projects}</Link>
            </li>
            <li>
              <Link href={`/${locale}/contact`}>{dict.nav.contact}</Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}
