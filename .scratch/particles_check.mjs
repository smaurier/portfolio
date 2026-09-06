import { chromium } from "@playwright/test";
const OUT = "C:/Users/sylva/AppData/Local/Temp/claude/C--Windows-System32/86ddb9fc-c7f5-4872-9d73-b603ad93d9cf/scratchpad";
const gpu = process.argv[2] ?? "1";
const browser = await chromium.launch({ args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--use-angle=d3d11", "--use-gl=angle"] });
async function probe(url, name, strike) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36" });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(m.text().slice(0, 160)); });
  page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message.slice(0, 160)));
  await page.goto(url, { waitUntil: "networkidle" });
  try { await page.waitForFunction(() => !!window.__nahualScene, null, { timeout: 30000 }); }
  catch { console.log("NO SCENE", name, [...new Set(errors)].slice(0, 10)); await page.screenshot({ path: `${OUT}/${name}_fail.png` }); await context.close(); return; }
  await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, { timeout: 60000 });
  await page.waitForTimeout(4500);
  if (strike) {
    await page.evaluate(() => { window.__nahualXiuhcoatl.strikeAt = window.__nahualR3f.clock.elapsedTime; });
    await page.waitForTimeout(1900);
  }
  const info = await page.evaluate(() => {
    const r = window.__nahualR3f;
    const backend = r.gl.backend ? r.gl.backend.constructor.name : "WebGLRenderer";
    const out = [];
    window.__nahualScene.traverse((o) => {
      if (o.isSprite || o.isPoints) out.push({ type: o.type, count: o.count ?? o.geometry?.getAttribute("position")?.count, mat: o.material?.type, visible: o.visible, ro: o.renderOrder });
    });
    return { backend, objects: out, fire: window.__nahualXiuhcoatl.strike.fire, strikeAt: window.__nahualXiuhcoatl.strikeAt };
  });
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(name, JSON.stringify(info));
  const uniq = [...new Set(errors)];
  console.log("  console:", uniq.length, uniq.slice(0, 8));
  await context.close();
}
await probe(`http://localhost:3000/fr/projets?gpu=${gpu}&xiuhcoatl=1&t=0.02&scene=1`, `stars_gpu${gpu}`, false);
await probe(`http://localhost:3000/fr/projets?gpu=${gpu}&xiuhcoatl=1&t=0.5&scene=1`, `fire_gpu${gpu}`, true);
await browser.close();
