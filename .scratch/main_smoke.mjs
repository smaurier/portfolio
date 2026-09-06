import { chromium } from "@playwright/test";
const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--use-gl=angle"] });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36" });
const page = await context.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 160)); });
page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message.slice(0, 160)));
for (const path of ["/fr", "/fr/projets", "/fr/memoire"]) {
  await page.goto(`http://localhost:3000${path}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, { timeout: 60000 });
  await page.waitForTimeout(2000);
  console.log(path, "charge, erreurs:", [...new Set(errors)].slice(0, 4));
  errors.length = 0;
}
await browser.close();
