import ObfuscatedEmail from "../../components/obfuscated-email";
import { getDictionary } from "../../../dictionaries";

export default function Contact({ params }: { params: { locale: string } }) {
  const fullDict = getDictionary(params.locale);
  const dict = fullDict.contact;

  return (
    <main>
      <div className="contentPage">
        <h1>{dict.title}</h1>
        <p>{dict.intro}</p>
        <ObfuscatedEmail className="ctaButton" placeholder={fullDict.common.showEmail} />
        <p className="note">{dict.note}</p>
        <p>
          {dict.linkedinBefore}{" "}
          <a href="https://www.linkedin.com/in/smaurier/" target="_blank" rel="noopener noreferrer">
            {dict.linkedinLinkText}
          </a>
          {dict.linkedinAfter}
        </p>
      </div>
    </main>
  );
}
