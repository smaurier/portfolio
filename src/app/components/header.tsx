import Link from "next/link";

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
            <Link href="mailto:bonjour@nahual.fr">bonjour@nahual.fr</Link>
          </li>
        </ul>
      </div>
      <div className='header_bottom'>
        <Link href="/" className="logoText">
          Nahual
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