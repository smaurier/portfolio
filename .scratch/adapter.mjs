import { chromium } from "@playwright/test";
const combos = [
  { name: "unsafe+vulkan", args: ["--enable-unsafe-webgpu", "--enable-features=Vulkan"] },
  { name: "unsafe+d3d11", args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--use-angle=d3d11", "--use-gl=angle"] },
  { name: "unsafe+swiftshader", args: ["--enable-unsafe-webgpu", "--enable-unsafe-swiftshader", "--use-webgpu-adapter=swiftshader"] },
  { name: "headed", args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist"], headless: false },
  { name: "headed-chrome", args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist"], headless: false, channel: "chrome" },
];
for (const c of combos) {
  try {
    const browser = await chromium.launch({ args: c.args, headless: c.headless ?? true, channel: c.channel });
    const page = await browser.newPage();
    await page.goto("http://localhost:3000/robots.txt");
    const r = await Promise.race([
      page.evaluate(async () => { if (!navigator.gpu) return "no navigator.gpu"; const a = await navigator.gpu.requestAdapter(); if (!a) return "no adapter"; const i = a.info ?? {}; return `adapter ok: ${i.vendor} ${i.architecture} ${i.device} ${i.description} fallback=${a.isFallbackAdapter}`; }),
      new Promise((r) => setTimeout(() => r("timeout"), 15000)),
    ]);
    console.log(c.name, "=>", r);
    await browser.close();
  } catch (e) { console.log(c.name, "=> ERR", e.message.split("\n")[0]); }
}
