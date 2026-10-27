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
 * La source courte est dans un `<cite>` (chant · strophe) et le lien vers
 * l'edition ouverte est explicite (nouvelle fenetre annoncee par le texte
 * commun du site) ; l'etiquette visible « Un chant de cette direction » est
 * partie le 11/10, `common.cantar.label` ne sert plus qu'a l'`aria-label`
 * de la figure, sur les cinq pages.
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
  const source = texts.source.replace("{chant}", c.chant).replace("{strophe}", String(c.strophe));
  const ours = locale === "fr" ? c.fr : locale === "en" ? c.en : null;
  // DEUX COUCHES, PLUS TROIS (13/09, retour Sylvain : « enleve la traduction
  // espagnole sur tous les points, on ne va garder que la langue du visiteur
  // en plus du texte traditionnel [...] bien sur, s'il a choisi ES, la
  // traduction espagnole s'affichera »). L'espagnol de l'edition n'est donc
  // affiche qu'aux visiteurs hispanophones, pour qui il EST la langue du
  // site ; la source courte (11/10) ne le dit plus sur la page : l'attribution
  // complete vit dans lib/cantares.ts et docs/da/cantares-choix.md, et le lien
  // vers l'edition reste sous chaque strophe.
  const montrerEspagnol = locale === "es";
  return (
    <figure className="cantar" data-cantar={direction} aria-label={texts.label}>
      <blockquote lang="nah" className="cantarNahuatl" cite={CANTARES_EDITION_URL}>
        <p>
          <NahuatlLines lines={c.nahuatl} />
        </p>
      </blockquote>
      {montrerEspagnol ? (
        <blockquote lang="es" className="cantarEs" cite={CANTARES_EDITION_URL}>
          <p>
            <Lines lines={c.es} />
          </p>
        </blockquote>
      ) : null}
      {ours ? (
        <blockquote className="cantarOurs" cite={CANTARES_EDITION_URL}>
          <p>
            <Lines lines={ours} />
          </p>
        </blockquote>
      ) : null}
      {/* La source courte (11/10, partition du texte) : le chant, la strophe,
          et le lien vers l'edition ouverte. L'attribution complete (edition
          Leon-Portilla, UNAM 2011, nos traductions faites d'apres son
          espagnol) vit dans lib/cantares.ts et docs/da/cantares-choix.md. */}
      <figcaption className="cantarSource">
        <cite>{source}</cite>
        {" · "}
        <a href={CANTARES_EDITION_URL} target="_blank" rel="noopener noreferrer" hrefLang="es">
          {texts.editionLink} ({newWindow})
        </a>
      </figcaption>
    </figure>
  );
}
