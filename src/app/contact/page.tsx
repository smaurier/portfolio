import ObfuscatedEmail from "../components/obfuscated-email";

export default function Contact() {
  return (
    <main>
      <div className="contentPage">
        <h1>Contact</h1>
        <p>
          Un projet de site ou un besoin d&apos;audit accessibilité ? Je suis
          disponible pour de nouvelles missions — parlons-en.
        </p>
        <ObfuscatedEmail className="ctaButton" />
        <p>
          Ou sur{" "}
          <a href="https://www.linkedin.com/in/smaurier/" target="_blank" rel="noopener noreferrer">
            LinkedIn
          </a>
          .
        </p>
      </div>
    </main>
  );
}
