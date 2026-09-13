import { readFile } from "node:fs/promises";
import path from "node:path";
import type { CSSProperties, ReactElement } from "react";
import type { DirectionKey } from "@/app/components/stag-scene/direction-colors";

/**
 * LA CARTE DE PARTAGE (13/09). Une seule carte, deux routes : l'accueil
 * par langue et chaque page par sa direction. Avant, tout lien partage du
 * site montrait la meme image de nuit : le lien vers Services montre
 * maintenant l'or de l'aube, celui vers Memoire l'obsidienne du Nord.
 * C'est ce qu'un jure voit AVANT d'ouvrir le site.
 *
 * Contraintes de `next/og` (Satori) : tout element qui contient plusieurs
 * enfants doit declarer `display: flex`, pas de WebP en data URL, pas de
 * police exotique sans la fournir. La structure ci-dessous est celle qui
 * tournait deja depuis le 28/08, generalisee.
 */
export const OG_SIZE = { width: 1200, height: 630 } as const;

export const CARDINAL: Record<DirectionKey, string> = {
  jade: "#00c078",
  dore: "#ffb400",
  turquoise: "#0f6bb8",
  cendre: "#d76464",
  obsidienne: "#6b3fa8",
};

/** Le fond suit la direction : la nuit du site, teintee de son heure. */
const FOND: Record<DirectionKey, string> = {
  jade: "radial-gradient(ellipse at 50% 45%, #1a1329 0%, #0a0710 60%, #000 100%)",
  dore: "radial-gradient(ellipse at 50% 45%, #2a2013 0%, #0d0a07 60%, #000 100%)",
  turquoise: "radial-gradient(ellipse at 50% 45%, #102434 0%, #070d12 60%, #000 100%)",
  cendre: "radial-gradient(ellipse at 50% 45%, #2b1618 0%, #100809 60%, #000 100%)",
  obsidienne: "radial-gradient(ellipse at 50% 45%, #1b1030 0%, #0a0512 60%, #000 100%)",
};

export const CODEX_PHRASE: Record<string, { line: string; translation: string }> = {
  fr: { line: "In xochitl, in cuicatl", translation: "Fleur et chant" },
  en: { line: "In xochitl, in cuicatl", translation: "Flower and song" },
  es: { line: "In xochitl, in cuicatl", translation: "Flor y canto" },
};

/** La Piedra del Sol en PNG (Satori ne lit pas le WebP), en data URL. */
export async function piedraDataUrl(): Promise<string> {
  const piedraPath = path.join(process.cwd(), "public", "img", "piedra-del-sol-og.png");
  const buf = await readFile(piedraPath);
  return `data:image/png;base64,${buf.toString("base64")}`;
}

/** La carte n'est pas une page : au-dela de deux lignes et demie, la
 * description passait sur la Piedra et sur la rosette (capture du 13/09).
 * Coupee au dernier mot entier, suivie d'une ellipse. */
export function couper(texte: string, max = 130): string {
  if (texte.length <= max) return texte;
  const bord = texte.slice(0, max);
  const espace = bord.lastIndexOf(" ");
  return `${(espace > 40 ? bord.slice(0, espace) : bord).replace(/[ ,.;:]+$/, "")}…`;
}

function dot(color: string, dx: number, dy: number, size = 20, actif = false): CSSProperties {
  return {
    position: "absolute",
    left: 70 + dx - size / 2,
    top: 70 + dy - size / 2,
    width: size,
    height: size,
    borderRadius: "50%",
    background: color,
    boxShadow: actif ? `0 0 46px ${color}, 0 0 18px ${color}` : `0 0 24px ${color}`,
    opacity: actif ? 1 : 0.55,
    display: "flex",
  };
}

export function CarteOg({
  locale,
  direction,
  surtitre,
  titre,
  description,
  piedra,
}: {
  locale: string;
  direction: DirectionKey;
  /** La ligne du Codex, ou le nom de la direction pour une page interieure. */
  surtitre?: string;
  titre: string;
  description: string;
  piedra: string;
}): ReactElement {
  const codex = CODEX_PHRASE[locale] ?? CODEX_PHRASE.fr;
  const accent = CARDINAL[direction];
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: FOND[direction],
        padding: "72px 96px",
        fontFamily: "sans-serif",
        color: "#f4ead5",
        position: "relative",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={piedra}
        alt=""
        width={720}
        height={720}
        style={{ position: "absolute", top: -100, right: -180, opacity: 0.14, transform: "rotate(-8deg)" }}
      />

      {/* La rosette des cinq directions, celle de la page allumee. */}
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
        <div style={dot(CARDINAL.obsidienne, 0, -55, 20, direction === "obsidienne")} />
        <div style={dot(CARDINAL.dore, 55, 0, 20, direction === "dore")} />
        <div style={dot(CARDINAL.turquoise, 0, 55, 20, direction === "turquoise")} />
        <div style={dot(CARDINAL.cendre, -55, 0, 20, direction === "cendre")} />
        <div style={dot(CARDINAL.jade, 0, 0, 26, direction === "jade")} />
      </div>

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
          <span>{surtitre ?? codex.line}</span>
          <span style={{ opacity: 0.4, fontStyle: "normal" }}>· {surtitre ? codex.line : codex.translation}</span>
        </div>
        <div style={{ display: "flex", fontSize: 88, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.05, color: "#f4ead5" }}>
          {titre}
        </div>
        <div style={{ display: "flex", fontSize: 34, opacity: 0.85, maxWidth: 820, lineHeight: 1.35, color: accent }}>
          {couper(description)}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 72,
          right: 96,
          display: "flex",
          fontSize: 22,
          opacity: 0.5,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
        }}
      >
        {locale}
      </div>
    </div>
  );
}
