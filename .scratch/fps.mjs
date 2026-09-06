import { chromium } from "@playwright/test";
const [gpu, path] = process.argv.slice(2);
const browser = await chromium.launch({ headless: !process.env.HEADED, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--use-angle=d3d11", "--use-gl=angle"] });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36" });
const page = await context.newPage();
await page.goto(`http://localhost:3000${path}${path.includes("?") ? "&" : "?"}gpu=${gpu}&scene=1`, { waitUntil: "networkidle" });
await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, { timeout: 60000 });
await page.waitForTimeout(3000);
const r = await page.evaluate(() => new Promise((resolve) => {
  const backend = window.__nahualR3f.gl.backend?.constructor?.name ?? "WebGLRenderer";
  let frames = 0; const t0 = performance.now();
  const tick = () => { frames++; if (performance.now() - t0 < 4000) requestAnimationFrame(tick); else resolve({ backend, fps: Math.round(frames / ((performance.now() - t0) / 1000)) }); };
  requestAnimationFrame(tick);
}));
console.log(`gpu=${gpu} ${path} =>`, JSON.stringify(r));
await browser.close();
