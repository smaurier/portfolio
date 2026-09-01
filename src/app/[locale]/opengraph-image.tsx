import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { getDictionary, isLocale, locales } from "@/dictionaries";
import { STUDIO_NAME } from "@/lib/seo";

/**
 * OG image dynamique par locale (28/08). Générée à la build par Next
 * (statique, pas edge runtime : ImageResponse fonctionne en node
 * moderne). Signature codex : fond obsidien, cinq points cardinaux en
 * rosette (Codex Nahual), titre + description locale, phrase Codex.
 * 1200×630 = ratio Facebook/Twitter/LinkedIn standard.
 */

export const alt = "Nahual · studio de création";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

const CARDINAL = {
  jade: "#00c078",
  dore: "#ffb400",
  turquoise: "#0f6bb8",
  cendre: "#d76464",
  obsidienne: "#6b3fa8",
};

const CODEX_PHRASE: Record<string, { line: string; translation: string }> = {
  fr: { line: "In xochitl, in cuicatl", translation: "Fleur et chant" },
  en: { line: "In xochitl, in cuicatl", translation: "Flower and song" },
  es: { line: "In xochitl, in cuicatl", translation: "Flor y canto" },
};

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "fr";
  const dict = getDictionary(locale);
  const codex = CODEX_PHRASE[locale] ?? CODEX_PHRASE.fr;

  // Charge la Piedra V2 en PNG (next/og ne supporte pas WebP en data
  // URL, seulement PNG/JPEG/GIF). PNG generee au build par sharp
  // depuis le SVG source (pas dans le pipeline vu qu'utilisee seulement
  // ici, generee une fois via Downloads/xolo_inspect script).
  // 30/08 : 2e des 3 pistes de reemploi de la Piedra (voile + sol
  // deja fait). Marque de fabrique coherente avec le reste.
  const piedraPath = path.join(process.cwd(), "public", "img", "piedra-del-sol-og.png");
  const piedraBuf = await readFile(piedraPath);
  const piedraDataUrl = `data:image/png;base64,${piedraBuf.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "radial-gradient(ellipse at 50% 45%, #1a1329 0%, #0a0710 60%, #000 100%)",
          padding: "72px 96px",
          fontFamily: "sans-serif",
          color: "#f4ead5",
          position: "relative",
        }}
      >
        {/* Piedra del Sol en fond decoratif (30/08 : 2e piste de reemploi,
            cf piedra-veil.tsx voile + piedra-ground.tsx sol). Position
            absolute centree, opacite faible, mix-blend-mode screen pour
            que les strokes blancs se somment sur le gradient obsidien
            sans etre plaques dessus. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={piedraDataUrl}
          alt=""
          width={720}
          height={720}
          style={{
            position: "absolute",
            top: -100,
            right: -180,
            opacity: 0.14,
            transform: "rotate(-8deg)",
          }}
        />

        {/* Rosette cardinale : 4 points cardinaux autour du centre */}
        <div
          style={{
            position: "absolute",
            top: 96,
            right: 96,
            width: 140,
            height: 140,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Nord */}
          <div style={dot(CARDINAL.obsidienne, 0, -55)} />
          {/* Est */}
          <div style={dot(CARDINAL.dore, 55, 0)} />
          {/* Sud */}
          <div style={dot(CARDINAL.turquoise, 0, 55)} />
          {/* Ouest */}
          <div style={dot(CARDINAL.cendre, -55, 0)} />
          {/* Centre jade légèrement plus gros */}
          <div style={dot(CARDINAL.jade, 0, 0, 26)} />
        </div>

        {/* Bloc titre en bas gauche pour respirer */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", gap: 24 }}>
          <div
            style={{
              display: "flex",
              fontSize: 32,
              opacity: 0.7,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontStyle: "italic",
              gap: 20,
            }}
          >
            <span>{codex.line}</span>
            <span style={{ opacity: 0.4, fontStyle: "normal" }}>
              · {codex.translation}
            </span>
          </div>
          <div
            style={{
              fontSize: 88,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
              color: "#f4ead5",
            }}
          >
            {STUDIO_NAME}
          </div>
          <div
            style={{
              fontSize: 34,
              opacity: 0.8,
              maxWidth: 900,
              lineHeight: 1.3,
              color: CARDINAL.jade,
            }}
          >
            {dict.metadata.description}
          </div>
        </div>

        {/* Locale badge coin bas droit */}
        <div
          style={{
            position: "absolute",
            bottom: 72,
            right: 96,
            fontSize: 22,
            opacity: 0.5,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
          }}
        >
          {locale}
        </div>
      </div>
    ),
    { ...size }
  );
}

function dot(color: string, dx: number, dy: number, size = 20): React.CSSProperties {
  return {
    position: "absolute",
    left: 70 + dx - size / 2,
    top: 70 + dy - size / 2,
    width: size,
    height: size,
    borderRadius: "50%",
    background: color,
    boxShadow: `0 0 24px ${color}`,
    display: "flex",
  };
}
