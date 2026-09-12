// Usage : pnpm dev, puis `node scripts/bake-pmrem.mjs [cube=32]` ; ecrit public/env/mictlan-pmrem.png.
// La carte d environnement (PMREM) du ciel du Mictlan, cuite une fois : voir
// src/app/components/stag-scene/environment-warm.ts (installEnvironmentBake).
// Cuit la carte d'environnement du Mictlan (PMREM en PNG sRGB) via la page en dev.
import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";
const cube = Number(process.argv[2] || 32);
const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--use-gl=angle", "--ignore-gpu-blocklist"] });
const page = await (await browser.newContext({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36", viewport: { width: 1440, height: 800 } })).newPage();
const erreurs = []; page.on("pageerror", (e) => erreurs.push(String(e).slice(0, 200))); page.on("console", (m) => { if (m.type() === "error") erreurs.push(m.text().slice(0, 200)); });
await page.goto("http://localhost:3000/fr?shaders-prod", { waitUntil: "commit", timeout: 300000 });
await page.waitForFunction(() => !!window.__nahualBakeEnv && document.documentElement.dataset.loaded === "true", null, { timeout: 240000 });
const r = await page.evaluate((c) => window.__nahualBakeEnv(c), cube);
if (!r) { console.log("echec : rien rendu"); process.exit(1); }
const b64 = r.png.split(",")[1];
writeFileSync("public/env/mictlan-pmrem.png", Buffer.from(b64, "base64"));
console.log(`carte ${r.width}x${r.height}, ${Buffer.from(b64, "base64").length} octets ; erreurs: ${erreurs.length} ${erreurs.slice(0, 2).join(" | ")}`);
await browser.close();
