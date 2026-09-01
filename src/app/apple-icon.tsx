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
        <img src={NAHUAL_ICON_DATA_URI} width={180} height={180} alt="" />
      </div>
    ),
    { ...size },
  );
}
