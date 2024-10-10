import Image from 'next/image';
import Link from "next/link";

export default function Header() {
  return (
    <header>
      <Link href="/">
        <Image src="/img/mini-logo.svg" alt="nahual-studio" width={100} height={100} />
      </Link>
      <nav>
        <ul>
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
    </header>
  )
}