// Recorte por chroma verde (local, sin red) de todos los props generados.
// Uso: node cut-chroma.mjs [nombre...]   (sin args: todos los .png sin -cut)
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "..", "..", "games", "elizabeth-flofy", "tools", "package.json"));
const { PNG } = require("pngjs");
const dir = join(here, "..", "assets", "art-src");

function cut(name) {
  const png = PNG.sync.read(readFileSync(join(dir, `${name}.png`)));
  const { width: W, height: Hh, data } = png;
  const isGreen = (i) => {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    return g > 100 && g > r * 1.3 && g > b * 1.3;
  };
  let minX = W, minY = Hh, maxX = 0, maxY = 0;
  for (let p = 0; p < W * Hh; p++) {
    const i = p * 4;
    if (isGreen(i)) { data[i + 3] = 0; continue; }
    const x = p % W, y = (p - x) / W;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  if (maxX <= minX) { console.error(`VACÍO ${name}`); return; }
  for (let y = 1; y < Hh - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = (y * W + x) * 4;
    if (!data[i + 3]) continue;
    const near = [i - 4, i + 4, i - W * 4, i + W * 4].some((j) => data[j + 3] === 0);
    if (near) {
      const cap = Math.round((data[i] + data[i + 2]) / 2);
      if (data[i + 1] > cap) data[i + 1] = cap;
      data[i + 3] = Math.min(data[i + 3], 200);
    }
  }
  const m = 6;
  minX = Math.max(0, minX - m); minY = Math.max(0, minY - m);
  maxX = Math.min(W - 1, maxX + m); maxY = Math.min(Hh - 1, maxY + m);
  const cw = maxX - minX + 1, ch = maxY - minY + 1;
  const out = new PNG({ width: cw, height: ch });
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const s = ((minY + y) * W + (minX + x)) * 4, d = (y * cw + x) * 4;
    out.data[d] = data[s]; out.data[d + 1] = data[s + 1]; out.data[d + 2] = data[s + 2]; out.data[d + 3] = data[s + 3];
  }
  writeFileSync(join(dir, `${name}-cut.png`), PNG.sync.write(out));
  console.log(`OK ${name}-cut (${cw}x${ch})`);
}

let names = process.argv.slice(2);
if (!names.length) {
  names = readdirSync(dir)
    .filter((f) => f.endsWith(".png") && !f.includes("-cut") && !f.includes("front") && !f.includes("celebrating"))
    .map((f) => f.replace(".png", ""))
    .filter((n) => !readdirSync(dir).includes(`${n}-cut.png`));
}
for (const n of names) { try { cut(n); } catch (e) { console.error(`FALLO ${n}: ${e.message}`); } }
