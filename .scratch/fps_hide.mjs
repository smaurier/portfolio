import { chromium } from "@playwright/test";
const [gpu, path] = process.argv.slice(2);
const browser = await chromium.launch({ headless: !process.env.HEADED, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--use-angle=d3d11", "--use-gl=angle"] });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36" });
const page = await context.newPage();
await page.goto(`http://localhost:3000${path}${path.includes("?") ? "&" : "?"}gpu=${gpu}&scene=1`, { waitUntil: "networkidle" });
await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, { timeout: 60000 });
await page.waitForTimeout(3000);
const measure = () => page.evaluate(() => new Promise((resolve) => {
  let frames = 0; const t0 = performance.now();
  const tick = () => { frames++; if (performance.now() - t0 < 1500) requestAnimationFrame(tick); else resolve(Math.round(frames / ((performance.now() - t0) / 1000))); };
  requestAnimationFrame(tick);
}));
const info = await page.evaluate(() => { const r = window.__nahualR3f.gl; const i = r.info; return { backend: r.backend?.constructor?.name, render: i?.render, memory: i?.memory }; });
console.log("info", JSON.stringify(info));
const groups = {
  none: "false",
  sprites: "o.isSprite",
  skinned: "o.isSkinnedMesh",
  lines: "o.isLine",
  instanced: "o.isInstancedMesh || (o.geometry && o.geometry.isInstancedBufferGeometry && !o.isSprite)",
  physical: "o.isMesh && o.material?.type === 'MeshPhysicalNodeMaterial'",
  basic: "o.isMesh && o.material?.type === 'MeshBasicNodeMaterial'",
  standard: "o.isMesh && o.material?.type === 'MeshStandardNodeMaterial' && !o.isSkinnedMesh",
  allmesh: "o.isMesh || o.isSprite || o.isLine",
};
for (const [tag, cond] of Object.entries(groups)) {
  const n = await page.evaluate(`(() => { window.__hidden = []; window.__nahualScene.traverse((o) => { if ((${cond}) && o.visible) { o.visible = false; window.__hidden.push(o); } }); return window.__hidden.length; })()`);
  await page.waitForTimeout(600);
  const fps = await measure();
  await page.evaluate(() => { for (const o of window.__hidden) o.visible = true; });
  console.log(`hide ${tag.padEnd(10)} (${String(n).padStart(4)} objets) fps ${fps}`);
}
const lights = await page.evaluate(() => { const out = []; window.__nahualScene.traverse((o) => { if (o.isLight) { out.push(o.type + ":" + (o.castShadow ? "shadow" : "")); if (o.castShadow) o.castShadow = false; } }); return out; });
await page.waitForTimeout(600);
console.log("no shadows", JSON.stringify(lights), "fps", await measure());
await browser.close();
