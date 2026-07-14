import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "..", "..", "games", "elizabeth-flofy", "tools", "package.json"));
const { chromium } = require("playwright-core");
const srcDir = join(here, "..", "assets", "art-src");
const outDir = join(here, "..", "assets", "art");
const MAP = [["drawers2-cut","drawers",420],["drawers2-open-cut","drawers-open",420]];
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await (await browser.newContext()).newPage();
for (const [src, out, h] of MAP) {
  const p = join(srcDir, src + ".png");
  if (!existsSync(p)) { console.error("FALTA " + src); continue; }
  const b64 = await page.evaluate(async ({ dataUri, h }) => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUri; });
    const hh = Math.min(h, img.height);
    const w = Math.round(img.width * (hh / img.height));
    const cv = document.createElement("canvas"); cv.width = w; cv.height = hh;
    const cx = cv.getContext("2d"); cx.imageSmoothingQuality = "high";
    cx.drawImage(img, 0, 0, w, hh);
    return cv.toDataURL("image/png").split(",")[1];
  }, { dataUri: "data:image/png;base64," + readFileSync(p).toString("base64"), h });
  const f = join(outDir, out + ".png");
  writeFileSync(f, Buffer.from(b64, "base64"));
  console.log(out + " " + (statSync(f).size / 1024).toFixed(0) + "KB");
}
await browser.close();
