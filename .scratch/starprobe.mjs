import { chromium } from "@playwright/test";
const browser = await chromium.launch({ args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--use-angle=d3d11", "--use-gl=angle"] });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36" });
const page = await context.newPage();
await page.goto("http://localhost:3000/fr/projets?gpu=1&xiuhcoatl=1&t=0.02&scene=1", { waitUntil: "networkidle" });
await page.waitForFunction(() => !!window.__nahualScene, null, { timeout: 30000 });
await page.waitForTimeout(4000);
const info = await page.evaluate(() => {
  let s = null;
  window.__nahualScene.traverse((o) => { if (o.isSprite && o.count === 400) s = o; });
  if (!s) return "no star sprite";
  const m = s.material;
  const g = s.geometry;
  const pos = window.__starGeom;
  return {
    count: s.count, visible: s.visible, parentVisible: s.parent?.visible, worldPos: s.getWorldPosition(new s.position.constructor()).toArray(),
    geomAttrs: Object.keys(g.attributes), uniforms: JSON.stringify(m.uniforms), transparent: m.transparent, opacityNode: !!m.opacityNode, sizeNode: !!m.sizeNode, positionNode: !!m.positionNode,
    matVisible: m.visible, needsUpdate: m.needsUpdate, side: m.side, depthTest: m.depthTest,
    parentChain: (() => { const c = []; let p = s.parent; while (p) { c.push(p.type + ":" + p.visible + ":" + p.name); p = p.parent; } return c; })(),
  };
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
