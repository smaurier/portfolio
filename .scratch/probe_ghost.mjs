import { chromium } from "@playwright/test";
const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--use-gl=angle"] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 }, userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36" })).newPage();
await page.goto("http://localhost:3000/fr/contact?t=0.8&scene=1", { waitUntil: "networkidle" });
await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, { timeout: 60000 });
await page.waitForTimeout(3000);
const info = await page.evaluate(() => {
  const out = [];
  window.__nahualScene.traverse((o) => {
    if (o.isSkinnedMesh && o.material?.color && o.material.color.getHexString() === "d9c4e6") {
      o.computeBoundingBox();
      const b = o.boundingBox;
      const u = window.__ghostUniforms;
      out.push({ name: o.name, localY: [b.min.y.toFixed(3), b.max.y.toFixed(3)], meshScale: o.matrix.elements[0].toFixed(4), parent: o.parent?.name, parentScale: o.parent?.scale?.x?.toFixed(4), rootScale: o.parent?.parent?.scale?.x?.toFixed(4) });
    }
  });
  return out.slice(0, 5);
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
