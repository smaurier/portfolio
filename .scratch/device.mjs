import { chromium } from "@playwright/test";
const combos = [
  { name: "d3d11", args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--use-angle=d3d11", "--use-gl=angle"] },
  { name: "d3d11+dawn", args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--use-angle=d3d11", "--use-gl=angle", "--enable-features=WebGPU,Vulkan", "--enable-dawn-features=allow_unsafe_apis"] },
  { name: "headed-d3d11", args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--use-angle=d3d11", "--use-gl=angle"], headless: false },
];
for (const c of combos) {
  const browser = await chromium.launch({ args: c.args, headless: c.headless ?? true });
  const page = await browser.newPage();
  await page.goto("http://localhost:3000/robots.txt");
  const r = await page.evaluate(async () => {
    try {
      const a = await navigator.gpu.requestAdapter();
      if (!a) return "no adapter";
      const d = await a.requestDevice();
      return "device ok, features: " + [...d.features].slice(0, 6).join(",") + " limits.maxTextureDimension2D=" + d.limits.maxTextureDimension2D;
    } catch (e) { return "ERR " + e.message; }
  });
  console.log(c.name, "=>", r);
  await browser.close();
}
