import Link from "next/link";
import { getDictionary } from "../../../dictionaries";

export default function Services({ params }: { params: { locale: string } }) {
  const dict = getDictionary(params.locale).services;

  return (
    <main>
      <div className="contentPage">
        <h1>{dict.title}</h1>
        <p>{dict.intro}</p>

        <div className="serviceCard">
          <h2>{dict.webCard.title}</h2>
          <p>{dict.webCard.text}</p>
        </div>

        <div className="serviceCard">
          <h2>{dict.auditCard.title}</h2>
          <p>{dict.auditCard.text}</p>
          <p className="note">{dict.auditCard.note}</p>
        </div>

        <Link href={`/${params.locale}/contact`} className="ctaButton">{dict.cta}</Link>
      </div>
    </main>
  );
}
