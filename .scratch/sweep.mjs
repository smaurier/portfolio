import { chromium } from "@playwright/test";
const OUT = "C:/Users/sylva/AppData/Local/Temp/claude/C--Windows-System32/86ddb9fc-c7f5-4872-9d73-b603ad93d9cf/scratchpad";
const [path, name] = process.argv.slice(2);
const browser = await chromium.launch({ args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--use-angle=d3d11", "--use-gl=angle"] });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36" });
const page = await context.newPage();
await page.goto(`http://localhost:3000${path}${path.includes("?") ? "&" : "?"}gpu=1&scene=1`, { waitUntil: "networkidle" });
await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, { timeout: 60000 });
await page.waitForTimeout(4500);
for (const scale of [4, 2, 1, 0.5, 0]) {
  await page.evaluate((s) => { window.__nahualPostFx.bloomScale = s; }, scale);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${name}_bloom${scale}.png` });
}
await page.evaluate(() => { window.__nahualPostFx.bloomScale = 1; window.__nahualPostFx.vignette = false; });
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/${name}_novig.png` });
await browser.close();
