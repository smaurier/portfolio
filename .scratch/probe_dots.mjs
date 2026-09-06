import { chromium } from "@playwright/test";
const OUT = "C:/Users/sylva/AppData/Local/Temp/claude/C--Windows-System32/86ddb9fc-c7f5-4872-9d73-b603ad93d9cf/scratchpad";
const browser = await chromium.launch({ args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--use-angle=d3d11", "--use-gl=angle"] });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36" });
const page = await context.newPage();
await page.goto(`http://localhost:3000/fr?t=0.5&gpu=1&scene=1`, { waitUntil: "networkidle" });
await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, { timeout: 60000 });
await page.waitForTimeout(4000);
const list = await page.evaluate(() => {
  const out = [];
  window.__nahualScene.traverse((o) => {
    if (o.isSprite || o.isPoints || o.isLine || o.isInstancedMesh) out.push({ type: o.type, name: o.name, parent: o.parent?.name || o.parent?.type, mat: o.material?.type, vis: o.visible, ic: o.geometry?.instanceCount ?? o.count, ro: o.renderOrder });
  });
  return out;
});
for (const o of list) console.log(" ", JSON.stringify(o));
async function count(tag) {
  await page.waitForTimeout(700);
  const buf = await page.screenshot({ clip: { x: 0, y: 80, width: 1280, height: 150 } });
  const { PNG } = await import("pngjs").catch(() => ({ PNG: null }));
  await page.screenshot({ path: `${OUT}/dots_${tag}.png` });
  return tag;
}
await page.evaluate(() => { window.__hidden = []; window.__nahualScene.traverse((o) => { if (o.isSprite && o.visible) { o.visible = false; window.__hidden.push(o); } }); });
await count("nosprites");
await page.evaluate(() => { for (const o of window.__hidden) o.visible = true; window.__hidden = []; window.__nahualScene.traverse((o) => { if (o.isInstancedMesh && o.visible) { o.visible = false; window.__hidden.push(o); } }); });
await count("noinstanced");
await page.evaluate(() => { for (const o of window.__hidden) o.visible = true; window.__hidden = []; window.__nahualScene.traverse((o) => { if (o.isMesh && o.material?.type === "MeshBasicNodeMaterial" && o.visible) { o.visible = false; window.__hidden.push(o); } }); });
await count("nobasic");
await browser.close();
