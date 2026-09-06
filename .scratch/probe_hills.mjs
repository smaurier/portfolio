import { chromium } from "@playwright/test";
const OUT = "C:/Users/sylva/AppData/Local/Temp/claude/C--Windows-System32/86ddb9fc-c7f5-4872-9d73-b603ad93d9cf/scratchpad";
const browser = await chromium.launch({ args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--use-angle=d3d11", "--use-gl=angle"] });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36" });
const page = await context.newPage();
await page.goto(`http://localhost:3000/fr?t=0.5&gpu=1&scene=1`, { waitUntil: "networkidle" });
await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, { timeout: 60000 });
await page.waitForTimeout(4000);
const groups = {
  none: "false",
  flora: "o.isMesh && o.material?.color && o.material.color.getHexString() === '009789'",
  petals: "o.isSprite && o.material?.uniforms?.uAccentColor",
  sprites: "o.isSprite",
  standard: "o.isMesh && o.material?.type === 'MeshStandardNodeMaterial' && o.material.color.getHexString() !== '241d14'",
};
for (const [tag, cond] of Object.entries(groups)) {
  const n = await page.evaluate(`(() => { window.__hidden = []; window.__nahualScene.traverse((o) => { if ((${cond}) && o.visible) { o.visible = false; window.__hidden.push(o); } }); return window.__hidden.length; })()`);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/hills_${tag}.png` });
  await page.evaluate(() => { for (const o of window.__hidden) o.visible = true; });
  console.log(tag, "hidden", n);
}
await browser.close();
