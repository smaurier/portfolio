import { chromium } from "@playwright/test";
const [gpu, path] = process.argv.slice(2);
const browser = await chromium.launch({ headless: !process.env.HEADED, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--use-angle=d3d11", "--use-gl=angle"] });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36" });
const page = await context.newPage();
const t0 = Date.now();
await page.goto(`http://localhost:3000${path}${path.includes("?") ? "&" : "?"}gpu=${gpu}&scene=1`, { waitUntil: "networkidle" });
await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, { timeout: 60000 });
console.log(`gpu=${gpu} ${path} loaded after ${Date.now() - t0} ms`);
const measure = () => page.evaluate(() => new Promise((resolve) => {
  let frames = 0; const s = performance.now();
  const tick = () => { frames++; if (performance.now() - s < 2000) requestAnimationFrame(tick); else resolve(Math.round(frames / ((performance.now() - s) / 1000))); };
  requestAnimationFrame(tick);
}));
const out = [];
for (let i = 0; i < 6; i++) out.push(await measure());
const info = await page.evaluate(() => { const r = window.__nahualR3f.gl; const i = r.info; const geos = new Map(); let meshes = 0; window.__nahualScene.traverse((o) => { if (o.isMesh && !o.isInstancedMesh && !o.isSkinnedMesh && o.visible) { meshes++; const k = o.geometry.uuid; geos.set(k, (geos.get(k) ?? 0) + 1); } }); const top = [...geos.values()].sort((a, b) => b - a).slice(0, 6); return { backend: r.backend?.constructor?.name, drawCalls: i.render.drawCalls, frameCalls: i.render.frameCalls, triangles: i.render.triangles, programs: i.memory?.programs, meshes, distinctGeometries: geos.size, topRepeats: top, compileAsync: typeof r.compileAsync }; });
console.log("  fps par 2 s :", out.join(" "), "|", JSON.stringify(info));
await browser.close();
