import { Fragment } from "react";
import type { CardinalDirection } from "./stag-scene/cardinal-transition-context";
import type { Dictionary } from "@/dictionaries";
import type { Locale } from "@/dictionaries/locales";
import { CANTARES_EDITION_URL, cantarFor } from "@/lib/cantares";
import { renderWithNahuatl } from "@/lib/nahuatl";

/**
 * LE CHANT DE LA DIRECTION (M4, 11/09/2026).
 *
 * Une strophe des *Cantares mexicanos*, visible pour tout le monde : sous
 * la scene (dans le flux de la page) et en mode lecture. Jamais en
 * `sr-only` : c'est la regle de Sylvain (« l'accessibilite est un
 * enrichissement pour tout le monde »).
 *
 * Trois couches, chacune dans sa langue (RGAA 8.7 : chaque changement de
 * langue est indique) : le nahuatl (`lang="nah"`), l'espagnol de l'edition,
 * puis notre traduction dans la langue de la page. En espagnol, la page ne
 * montre que deux couches : l'espagnol de l'edition EST la traduction.
 *
 * La source est dans un `<cite>` et le lien vers l'edition ouverte est
 * explicite (nouvelle fenetre annoncee par le texte commun du site).
 */
export type CantarTexts = Dictionary["common"]["cantar"];

function Lines({ lines }: { lines: string[] }) {
  return lines.map((l, i) => (
    <Fragment key={i}>
      {renderWithNahuatl(l)}
      {i < lines.length - 1 ? <br /> : null}
    </Fragment>
  ));
}

function NahuatlLines({ lines }: { lines: string[] }) {
  return lines.map((l, i) => (
    <Fragment key={i}>
      {l}
      {i < lines.length - 1 ? <br /> : null}
    </Fragment>
  ));
}

export default function Cantar({
  direction,
  locale,
  texts,
  newWindow,
}: {
  direction: CardinalDirection;
  locale: Locale;
  texts: CantarTexts;
  /** `common.newWindow`, pour annoncer le lien externe. */
  newWindow: string;
}) {
  const c = cantarFor(direction);
  const source = texts.source
    .replace("{chant}", c.chant)
    .replace("{strophe}", String(c.strophe))
    .replace("{folio}", c.folio);
  const ours = locale === "fr" ? c.fr : locale === "en" ? c.en : null;
  return (
    <figure className="cantar" data-cantar={direction}>
      <p className="cantarLabel">{texts.label}</p>
      <blockquote lang="nah" className="cantarNahuatl" cite={CANTARES_EDITION_URL}>
        <p>
          <NahuatlLines lines={c.nahuatl} />
        </p>
      </blockquote>
      <blockquote lang="es" className="cantarEs" cite={CANTARES_EDITION_URL}>
        <p>
          <Lines lines={c.es} />
        </p>
      </blockquote>
      {ours ? (
        <blockquote className="cantarOurs" cite={CANTARES_EDITION_URL}>
          <p>
            <Lines lines={ours} />
          </p>
        </blockquote>
      ) : null}
      <figcaption className="cantarSource">
        <cite>{source}</cite> {texts.ourTranslation}{" "}
        <a href={CANTARES_EDITION_URL} target="_blank" rel="noopener noreferrer" hrefLang="es">
          {texts.editionLink} ({newWindow})
        </a>
      </figcaption>
    </figure>
  );
}
