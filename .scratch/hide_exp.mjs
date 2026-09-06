import { chromium } from "@playwright/test";
const OUT = "C:/Users/sylva/AppData/Local/Temp/claude/C--Windows-System32/86ddb9fc-c7f5-4872-9d73-b603ad93d9cf/scratchpad";
const [gpu, path, name] = process.argv.slice(2);
const browser = await chromium.launch({ args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--use-angle=d3d11", "--use-gl=angle"] });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36" });
const page = await context.newPage();
await page.goto(`http://localhost:3000${path}${path.includes("?") ? "&" : "?"}gpu=${gpu}&scene=1`, { waitUntil: "networkidle" });
await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, { timeout: 60000 });
await page.waitForTimeout(4500);
const groups = {
  base: "false",
  grass: "o.isInstancedMesh && o.count > 10000",
  ground: "o.isMesh && o.material?.color && o.material.color.getHexString() === '241d14'",
  flora: "o.isMesh && o.material?.color && o.material.color.getHexString() === '009789'",
  stag: "o.isSkinnedMesh",
};
for (const [tag, cond] of Object.entries(groups)) {
  await page.evaluate(`(() => { window.__hidden = []; window.__nahualScene.traverse((o) => { if ((${cond}) && o.visible) { o.visible = false; window.__hidden.push(o); } }); })()`);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${name}_${tag}_gpu${gpu}.png` });
  await page.evaluate(() => { for (const o of window.__hidden) o.visible = true; });
}
await browser.close();
