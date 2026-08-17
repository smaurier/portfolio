import Image from 'next/image';
import Link from "next/link";
import ObfuscatedEmail from "./obfuscated-email";

export default function Header() {
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
            <ObfuscatedEmail />
          </li>
        </ul>
      </div>
      <div className='header_bottom'>
        <Link href="/" className="logoLink">
          <Image src="/img/mini-logo.svg" alt="" width={32} height={32} />
          <span className="logoText">Nahual</span>
        </Link>
        <nav>
          <ul>
            <li>
              <Link href="/">Accueil</Link>
            </li>
            <li>
              <Link href="/services">Services</Link>
            </li>
            <li>
              <Link href="/projets">Projets</Link>
            </li>
            <li>
              <Link href="/contact">Contact</Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}