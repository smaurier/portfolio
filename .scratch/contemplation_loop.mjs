import { chromium } from "@playwright/test";
const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--use-gl=angle"] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 }, userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36" })).newPage();
await page.goto("http://localhost:3000/fr/projets", { waitUntil: "networkidle" });
await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, { timeout: 60000 });
await page.waitForTimeout(1500);
await page.keyboard.press("t");
const out = [];
for (const at of [2, 20, 36, 44, 52]) {
  await page.waitForTimeout((at - (out.length ? out[out.length - 1].at : 0)) * 1000);
  out.push({ at, scrollY: await page.evaluate(() => Math.round(window.scrollY)), toast: await page.evaluate(() => [...document.querySelectorAll('[role="status"]')].some((e) => e.textContent?.includes("Tenochtitlan"))) });
}
console.log(JSON.stringify(out));
await browser.close();
