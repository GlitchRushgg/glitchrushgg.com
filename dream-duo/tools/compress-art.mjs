// Re-encode art-src → assets/art a tamaños de juego (≤20MB total, estudio rec #6).
// Usa canvas en Chrome headless (playwright-core de elizabeth-flofy) — sin sharp.
// Uso: node compress-art.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "..", "..", "games", "elizabeth-flofy", "tools", "package.json"));
const { chromium } = require("playwright-core");

const srcDir = join(here, "..", "assets", "art-src");
const outDir = join(here, "..", "assets", "art");
const canonDir = join(here, "..", "..", "games", "elizabeth-flofy", "assets", "canon");
mkdirSync(outDir, { recursive: true });

// [origen, salida, {h: altura px} | {w,h, jpg: calidad, cover:true}]
const SPRITES = [
  ["eliz-run-a-cut", "eliz-run-a", 320], ["eliz-run-b-cut", "eliz-run-b", 320],
  // ciclo natural de 4 fases: contacto-izq → rodilla arriba → contacto-dcha → patada atrás
  ["eliz-run-opp2-cut", "eliz-r1", 320], ["eliz-run-opp-cut", "eliz-r2", 320],
  ["eliz-run-c1-cut", "eliz-r3", 320], ["eliz-run-c2-cut", "eliz-r4", 320],
  ["eliz-jump-cut", "eliz-jump", 320], ["eliz-fairy-fly-cut", "eliz-fairy", 340],
  ["flofy-hop-cut", "flofy-hop", 230], ["flofy-fall-cut", "flofy-fall", 230],
  ["ob-hedge-cut", "ob-hedge", 240], ["ob-bench-cut", "ob-bench", 250],
  ["ob-birdbath-cut", "ob-birdbath", 330], ["ob-pigeon-cut", "ob-pigeon", 190],
  ["ob-cloud-cut", "ob-cloud", 250], ["ob-blocks-cut", "ob-blocks", 330],
  ["ob-top-cut", "ob-top", 210], ["ob-bubble-cut", "ob-bubble", 230],
  ["mama-running-cut", "pw-mama", 300], ["papa-running-cut", "pw-papa", 300],
  ["cristian-running-cut", "pw-cristian", 320],
  ["elizabeth-skin-fairy-cut", "shop-fairy", 340], ["flofy-front-cut", "flofy-front", 260],
];
const BGS = ["bg-park-day", "bg-park-sunset", "bg-park-night", "bg-dream-day", "bg-dream-sunset", "bg-dream-night"];

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await (await browser.newContext()).newPage();

async function encode(buf, opts) {
  const dataUri = "data:image/png;base64," + buf.toString("base64");
  return await page.evaluate(async ({ dataUri, opts }) => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUri; });
    let w, h;
    if (opts.cover) { w = opts.w; h = opts.h; }
    else { h = opts.h; w = Math.round(img.width * (h / img.height)); }
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    const cx = cv.getContext("2d");
    cx.imageSmoothingQuality = "high";
    if (opts.cover) {
      const s = Math.max(w / img.width, h / img.height);
      const dw = img.width * s, dh = img.height * s;
      cx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    } else cx.drawImage(img, 0, 0, w, h);
    if (opts.seamless) {
      // cross-blend the left strip onto the right edge so the texture tiles
      // without a visible seam (tileSprite wraps every `w` px)
      const F = 260;
      const strip = document.createElement("canvas");
      strip.width = F; strip.height = h;
      const sx2 = strip.getContext("2d");
      sx2.drawImage(cv, 0, 0, F, h, 0, 0, F, h);
      const grad = sx2.createLinearGradient(0, 0, F, 0);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, "rgba(0,0,0,1)");
      sx2.globalCompositeOperation = "destination-in";
      sx2.fillStyle = grad;
      sx2.fillRect(0, 0, F, h);
      cx.drawImage(strip, w - F, 0);
    }
    return cv.toDataURL(opts.jpg ? "image/jpeg" : "image/png", opts.jpg || undefined).split(",")[1];
  }, { dataUri, opts });
}

let total = 0;
for (const [src, out, h] of SPRITES) {
  const p = join(srcDir, `${src}.png`);
  if (!existsSync(p)) { console.error(`FALTA ${src}`); continue; }
  const b64 = await encode(readFileSync(p), { h });
  const f = join(outDir, `${out}.png`);
  writeFileSync(f, Buffer.from(b64, "base64"));
  total += statSync(f).size;
  console.log(`${out}.png ${(statSync(f).size / 1024).toFixed(0)}KB`);
}
for (const bg of BGS) {
  const p = join(srcDir, `${bg}.png`);
  if (!existsSync(p)) { console.error(`FALTA ${bg}`); continue; }
  const b64 = await encode(readFileSync(p), { w: 1280, h: 720, jpg: 0.8, cover: true, seamless: true });
  const f = join(outDir, `${bg}.jpg`);
  writeFileSync(f, Buffer.from(b64, "base64"));
  total += statSync(f).size;
  console.log(`${bg}.jpg ${(statSync(f).size / 1024).toFixed(0)}KB`);
}
// key art del menú desde el canon existente
{
  const b64 = await encode(readFileSync(join(canonDir, "duo-hero.png")), { w: 1280, h: 720, jpg: 0.82, cover: true });
  const f = join(outDir, "duo-hero.jpg");
  writeFileSync(f, Buffer.from(b64, "base64"));
  total += statSync(f).size;
  console.log(`duo-hero.jpg ${(statSync(f).size / 1024).toFixed(0)}KB`);
}
await browser.close();
console.log(`\nTOTAL assets/art: ${(total / 1024 / 1024).toFixed(2)}MB`);
