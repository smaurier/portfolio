import { chromium } from "@playwright/test";
const OUT = "C:/Users/sylva/AppData/Local/Temp/claude/C--Windows-System32/86ddb9fc-c7f5-4872-9d73-b603ad93d9cf/scratchpad";
const [path, name] = process.argv.slice(2);
const browser = await chromium.launch({ args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--use-angle=d3d11", "--use-gl=angle"] });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36" });
const page = await context.newPage();
await page.goto(`http://localhost:3000${path}${path.includes("?") ? "&" : "?"}gpu=1&scene=1`, { waitUntil: "networkidle" });
await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, { timeout: 60000 });
await page.waitForTimeout(4500);
await page.screenshot({ path: `${OUT}/${name}_base.png` });
const setStages = async (mode) => {
  await page.evaluate((mode) => {
    window.__nahualScene.traverse((o) => {
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of mats) {
        if (!m.stages) continue;
        if (!m.__all) m.__all = m.stages.slice();
        m.stages = mode === "none" ? [] : mode === "first" ? m.__all.slice(0, 1) : mode === "second" ? m.__all.slice(1, 2) : m.__all.slice();
        m.needsUpdate = true;
      }
    });
  }, mode);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/${name}_${mode}.png` });
};
await setStages("none"); await setStages("first"); await setStages("second"); await setStages("all");
const n = await page.evaluate(() => { let c = 0; window.__nahualScene.traverse((o) => { if (o.material?.stages) c++; }); return c; });
console.log("materials with stages:", n);
await browser.close();
