import { chromium } from "@playwright/test";
const OUT = "C:/Users/sylva/AppData/Local/Temp/claude/C--Windows-System32/86ddb9fc-c7f5-4872-9d73-b603ad93d9cf/scratchpad";
const browser = await chromium.launch({ args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--use-angle=d3d11", "--use-gl=angle"] });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36" });
const page = await context.newPage();
await page.goto(`http://localhost:3000/fr?t=0.5&gpu=1&scene=1`, { waitUntil: "networkidle" });
await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, { timeout: 60000 });
await page.waitForTimeout(4000);
const before = await page.evaluate(() => {
  let g = null; window.__nahualScene.traverse((o) => { if (o.isInstancedMesh && o.count > 10000) g = o; });
  if (!g) return "no grass";
  return { count: g.count, hasInstanceColor: !!g.instanceColor, firstColors: g.instanceColor ? Array.from(g.instanceColor.array.slice(0, 6)).map((v) => v.toFixed(2)) : null, mat: g.material.type, stages: g.material.stages?.length, uTint: "#" + g.material.uniforms?.uTint?.value?.getHexString?.() };
});
console.log("before", JSON.stringify(before));
await page.screenshot({ path: `${OUT}/grass_before.png` });
await page.evaluate(() => { let g = null; window.__nahualScene.traverse((o) => { if (o.isInstancedMesh && o.count > 10000) g = o; }); g.material.needsUpdate = true; });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/grass_after.png` });
await browser.close();
