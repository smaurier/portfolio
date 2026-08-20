"use client";

import dynamic from "next/dynamic";

// `dynamic(..., { ssr: false })` n'est autorisé que dans un Client
// Component — [slug]/page.tsx (Services/Projets/Contact) est un Server
// Component, donc ce petit wrapper existe juste pour porter le
// "use client" + l'appel dynamic, importé par la page à la place
// d'echo-stag.tsx directement. Lazy-loading obligatoire (Canvas/WebGL
// n'existe pas côté serveur), cohérent avec le garde-fou du Codex sur la
// perf des pages écho (cf memory project-nahual-da).
const EchoStag = dynamic(() => import("./echo-stag"), { ssr: false });

export default EchoStag;
