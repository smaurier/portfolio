import { chromium } from "@playwright/test";
const gpu = process.argv[2] ?? "1";
const browser = await chromium.launch({ args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist"] });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36" });
const page = await context.newPage();
const logs = [];
page.on("console", (m) => logs.push(m.type() + ": " + m.text().slice(0, 140)));
page.on("pageerror", (e) => logs.push("PAGEERROR " + e.message.slice(0, 140)));
await page.goto(`http://localhost:3000/fr/projets?gpu=${gpu}&xiuhcoatl=1&t=0.02`, { waitUntil: "domcontentloaded", timeout: 60000 });
for (let i = 0; i < 6; i++) {
  await page.waitForTimeout(3000);
  const st = await Promise.race([
    page.evaluate(() => ({ canvases: document.querySelectorAll("canvas").length, scene: !!window.__nahualScene, gpu: !!navigator.gpu, loaded: document.documentElement.dataset.loaded, kind: localStorage.getItem("nahual-gpu") })),
    new Promise((r) => setTimeout(() => r("EVAL TIMEOUT"), 5000)),
  ]);
  console.log(i, JSON.stringify(st));
  if (st && st.scene) break;
}
console.log([...new Set(logs)].slice(0, 25).join("\n"));
await browser.close();
