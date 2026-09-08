import { ImageResponse } from "next/og";
import { NAHUAL_ICON_DATA_URI } from "@/lib/nahual-icon-data-uri";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Pas de fs.readFile ici : la data URI est embed au build (cf
// gen-icon-uri.mjs). Un fs.readFile runtime peut crasher les workers
// Turbopack dev ("Jest worker encountered N child process exceptions").
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0a0710",
          display: "flex",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse
            (next/og) rend en Satori, pas dans un navigateur : next/image n'y
            existe pas, et la source est deja une data URI embarquee au build.
            La regle ne s'applique pas ici, on le dit plutot que de laisser un
            avertissement permanent user le signal du lint. */}
        <img src={NAHUAL_ICON_DATA_URI} width={180} height={180} alt="" />
      </div>
    ),
    { ...size },
  );
}
