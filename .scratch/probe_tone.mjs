import { chromium } from "@playwright/test";
const gpu = process.argv[2];
const browser = await chromium.launch({ args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--use-angle=d3d11", "--use-gl=angle"] });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36" });
const page = await context.newPage();
await page.goto(`http://localhost:3000/fr?t=0.5&gpu=${gpu}&scene=1`, { waitUntil: "networkidle" });
await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, { timeout: 60000 });
await page.waitForTimeout(3000);
const info = await page.evaluate(() => {
  const r = window.__nahualR3f;
  const gl = r.gl;
  const lights = [];
  window.__nahualScene.traverse((o) => { if (o.isLight) lights.push({ type: o.type, i: +o.intensity.toFixed(2), color: "#" + o.color.getHexString(), castShadow: o.castShadow }); });
  return { toneMapping: gl.toneMapping, exposure: gl.toneMappingExposure, colorSpace: gl.outputColorSpace, shadows: gl.shadowMap?.enabled, lights, envMap: !!window.__nahualScene.environment, bg: window.__nahualScene.background?.getHexString?.() };
});
console.log(gpu, JSON.stringify(info));
await browser.close();
