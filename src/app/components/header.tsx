import Image from 'next/image';
import Link from "next/link";

export default function Header() {
  return (
    <header className='header'>
      <div className='header_up'>
        <ul>
          <li>
            <Link href="https://www.linkedin.com/in/sylvainmaurier-frontend/">linkedin</Link>
          </li>
          <li>
            <Link href="mailto:bonjour@nahual.fr">bonjour@nahual.fr</Link>
          </li>
        </ul>
      </div>
      <div className='header_bottom'>
        <Link href="/">
          <Image src="/img/mini-logo.svg" alt="nahual-studio" width={100} height={100} />
        </Link>
        <nav>
          <ul>
            <li>
              <Link href="/">Origines</Link>
            </li>
            <li>
              <Link href="/services">Rituels</Link>
            </li>
            <li>
              <Link href="/projets">Chroniques</Link>
            </li>
            <li>
              <Link href="/contact">Dialogue</Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}